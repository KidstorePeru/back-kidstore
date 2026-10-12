// src/controllers/auth.controller.js
import pool from '../db.js';
import bcrypt from 'bcrypt';
import { consumeVerifiedEmail } from './verification.controller.js';
import { createUserToken } from '../lib/session.js';

const SALT_ROUNDS = 10;
const MIN_PASSWORD = 6;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validEmail = (e) => String(e).length <= 255 && EMAIL_RE.test(String(e));

// Texto opcional del cuerpo: recortado, o null si viene vacío o no viene.
const text = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim());
// Recorta al tamaño de la columna (teléfono 30, nombre completo 120) para no provocar un error de BD.
const clip = (v, max) => (typeof v === 'string' ? v.slice(0, max) : v);

// Datos públicos del usuario que se devuelven al front (nunca la contraseña).
const publicUser = (u) => ({
    id: u.id,
    username: u.username,
    email: u.email,
    phone: u.phone ?? null,
    fullName: u.full_name ?? u.fullName ?? null,
    createdAt: u.created_at ?? null,
});

/* ── Registro (después de verificar el correo con código) ── */
export const registerController = async (req, res) => {
    const { username, email, password, phone, fullName } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ success: false, error: 'Faltan campos obligatorios.' });
    }
    if (!validEmail(email) || String(username).trim().length < 3 || String(username).length > 50) {
        return res.status(400).json({ success: false, error: 'Usuario o correo no válidos.' });
    }
    if (String(password).length < MIN_PASSWORD) {
        return res.status(400).json({ success: false, error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.` });
    }

    // El correo tiene que haber superado un código en los últimos 15 min.
    if (!consumeVerifiedEmail(email)) {
        return res.status(403).json({ success: false, error: 'Debes verificar tu correo con el código antes de crear la cuenta.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const result = await pool.query(
            `INSERT INTO users (username, email, password, phone, full_name, verified)
             VALUES ($1, $2, $3, $4, $5, TRUE)
             RETURNING id, username, email, password, phone, full_name, created_at`,
            [String(username).trim(), String(email).trim(), hashedPassword, clip(text(phone), 30), clip(text(fullName), 120)],
        );
        const user = result.rows[0];
        res.status(201).json({ success: true, user: publicUser(user), token: createUserToken(user) });
    } catch (error) {
        console.error('Error en registro:', error.message);
        if (error.code === '23505') {
            return res.status(400).json({ success: false, error: 'El usuario o correo ya existe.' });
        }
        res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }
};

/* ── Disponibilidad de usuario / correo (antes de enviar el código) ── */
export const checkAvailabilityController = async (req, res) => {
    const { username, email } = req.body;
    if (!username && !email) {
        return res.status(400).json({ success: false, error: 'Falta usuario o correo.' });
    }
    try {
        const result = await pool.query(
            `SELECT username, LOWER(email) AS email FROM users
              WHERE ($1::text IS NOT NULL AND username = $1)
                 OR ($2::text IS NOT NULL AND LOWER(email) = LOWER($2))`,
            [username || null, email || null],
        );
        const usernameTaken = !!username && result.rows.some((r) => r.username === username);
        const emailTaken    = !!email && result.rows.some((r) => r.email === String(email).toLowerCase());
        res.status(200).json({ success: true, usernameTaken, emailTaken });
    } catch (err) {
        console.error('❌ Error comprobando disponibilidad:', err.message);
        res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }
};

/* ── Actualización de perfil (requiere sesión) ── */
export const updateUserController = async (req, res) => {
    // El usuario sale del token (req.user). `newEmail` (opcional) cambia el correo y debe
    // venir verificado por código, igual que en el registro.
    const { username, phone, fullName, newEmail } = req.body;

    let emailToSet = null;
    if (newEmail && String(newEmail).toLowerCase() !== String(req.user.email).toLowerCase()) {
        if (!validEmail(newEmail)) {
            return res.status(400).json({ error: 'El nuevo correo no es válido.' });
        }
        if (!consumeVerifiedEmail(newEmail)) {
            return res.status(403).json({ error: 'Verifica el nuevo correo con el código antes de cambiarlo.' });
        }
        emailToSet = String(newEmail).trim();
    }
    if (username !== undefined && (String(username).trim().length < 3 || String(username).length > 50)) {
        return res.status(400).json({ error: 'El nombre de usuario debe tener entre 3 y 50 caracteres.' });
    }

    try {
        const result = await pool.query(
            `UPDATE users
                SET username  = COALESCE($1, username),
                    phone     = COALESCE($2, phone),
                    full_name = COALESCE($3, full_name),
                    email     = COALESCE($4, email)
              WHERE id = $5
            RETURNING id, username, email, phone, full_name, created_at`,
            [text(username), phone === undefined ? null : clip(String(phone).trim(), 30), fullName === undefined ? null : clip(String(fullName).trim(), 120), emailToSet, req.user.id],
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }
        res.json({ message: 'Perfil actualizado correctamente', user: publicUser(result.rows[0]) });
    } catch (error) {
        console.error('Error al actualizar usuario:', error.message);
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Ese usuario o correo ya está en uso.' });
        }
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

/* ── Login ── */
export const loginController = async (req, res) => {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
        return res.status(400).json({ success: false, error: 'Usuario/email y contraseña son requeridos.' });
    }

    try {
        // El usuario distingue mayúsculas; el correo no.
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1 OR LOWER(email) = LOWER($1) ORDER BY (username = $1) DESC LIMIT 1',
            [String(identifier).trim()],
        );
        const user = result.rows[0];
        const valid = user ? await bcrypt.compare(password, user.password) : false;
        if (!valid) {
            return res.status(401).json({ success: false, error: 'Usuario o contraseña incorrectos.' });
        }

        res.status(200).json({ success: true, user: publicUser(user), token: createUserToken(user) });
    } catch (err) {
        console.error('❌ Error en login:', err.message);
        res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }
};

/* ── Cambiar contraseña (requiere sesión) ── */
export const changePasswordController = async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, error: 'Todos los campos son requeridos.' });
    }
    if (String(newPassword).length < MIN_PASSWORD) {
        return res.status(400).json({ success: false, error: `La nueva contraseña debe tener al menos ${MIN_PASSWORD} caracteres.` });
    }

    try {
        const valid = await bcrypt.compare(currentPassword, req.user.password);
        if (!valid) {
            // 400 (no 401): 401 queda reservado a "sesión no válida".
            return res.status(400).json({ success: false, error: 'La contraseña actual es incorrecta.' });
        }

        const hashedNew = await bcrypt.hash(newPassword, SALT_ROUNDS);
        const result = await pool.query(
            'UPDATE users SET password = $1 WHERE id = $2 RETURNING id, password',
            [hashedNew, req.user.id],
        );
        // El token anterior deja de valer (lleva la huella de la contraseña vieja): se entrega
        // uno nuevo para que este dispositivo siga con la sesión abierta.
        res.status(200).json({
            success: true,
            message: 'Contraseña actualizada correctamente.',
            token: createUserToken(result.rows[0]),
        });
    } catch (err) {
        console.error('❌ Error cambiando contraseña:', err.message);
        res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }
};

/* ── Restablecer contraseña (tras verificar el código enviado al correo) ── */
export const resetPasswordController = async (req, res) => {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
        return res.status(400).json({ success: false, error: 'Email y nueva contraseña son requeridos.' });
    }
    if (String(newPassword).length < MIN_PASSWORD) {
        return res.status(400).json({ success: false, error: `La nueva contraseña debe tener al menos ${MIN_PASSWORD} caracteres.` });
    }
    // Sin esto cualquiera podría cambiar la contraseña de otra cuenta sabiendo solo su correo.
    if (!consumeVerifiedEmail(email)) {
        return res.status(403).json({
            success: false,
            error: 'El código de verificación caducó o no es válido. Vuelve a solicitarlo.',
        });
    }

    try {
        const hashedNew = await bcrypt.hash(newPassword, SALT_ROUNDS);
        const result = await pool.query(
            'UPDATE users SET password = $1 WHERE LOWER(email) = LOWER($2)',
            [hashedNew, String(email).trim()],
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Usuario no encontrado.' });
        }
        res.status(200).json({ success: true, message: 'Contraseña actualizada correctamente.' });
    } catch (err) {
        console.error('❌ Error reseteando contraseña:', err.message);
        res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }
};
