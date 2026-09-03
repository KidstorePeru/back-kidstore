// src/controllers/auth.controller.js
import pool from '../db.js';
import bcrypt from 'bcrypt';
import { consumeVerifiedEmail } from './verification.controller.js';

const SALT_ROUNDS = 10;

export const registerController = async (req, res) => {
    const { username, email, password, phone, fullName } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ success: false, error: 'Faltan campos obligatorios.' });
    }

    // El correo tiene que haber superado un código en los últimos 15 min.
    if (!consumeVerifiedEmail(email)) {
        return res.status(403).json({ success: false, error: 'Debes verificar tu correo con el código antes de crear la cuenta.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const query = `
            INSERT INTO users (username, email, password, phone, full_name, verified)
            VALUES ($1, $2, $3, $4, $5, TRUE)
            RETURNING id, username, email, phone, full_name AS "fullName"
        `;
        const values = [username, email, hashedPassword, phone || null, fullName?.trim() || null];

        const result = await pool.query(query, values);
        res.status(201).json({ success: true, user: result.rows[0] });
    } catch (error) {
        console.error('Error en registro:', error);
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
            [username || null, email || null]
        );
        const usernameTaken = !!username && result.rows.some(r => r.username === username);
        const emailTaken    = !!email && result.rows.some(r => r.email === String(email).toLowerCase());
        res.status(200).json({ success: true, usernameTaken, emailTaken });
    } catch (err) {
        console.error('❌ Error comprobando disponibilidad:', err.message);
        res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }
};

/* ── Actualización de Perfil ── */
export const updateUserController = async (req, res) => {
    // `email` identifica al usuario actual. `newEmail` (opcional) lo cambia y
    // debe venir verificado por código (igual que en el registro).
    const { email, username, phone, fullName, newEmail } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Se requiere el correo para identificar al usuario.' });
    }

    let emailToSet = null;
    if (newEmail && String(newEmail).toLowerCase() !== String(email).toLowerCase()) {
        if (!consumeVerifiedEmail(newEmail)) {
            return res.status(403).json({ error: 'Verifica el nuevo correo con el código antes de cambiarlo.' });
        }
        emailToSet = String(newEmail).trim();
    }

    try {
        const query = `
            UPDATE users
            SET username  = COALESCE($1, username),
                phone     = COALESCE($2, phone),
                full_name = COALESCE($3, full_name),
                email     = COALESCE($4, email)
            WHERE email = $5
            RETURNING id, username, email, phone, full_name AS "fullName"
        `;
        const values = [
            username ?? null,
            phone ?? null,
            fullName ?? null,
            emailToSet,
            email,
        ];

        const result = await pool.query(query, values);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        res.json({ message: 'Perfil actualizado correctamente', user: result.rows[0] });
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
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
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1 OR email = $1',
            [identifier]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, error: 'Usuario o contraseña incorrectos.' });
        }

        const user  = result.rows[0];
        const valid = await bcrypt.compare(password, user.password);

        if (!valid) {
            return res.status(401).json({ success: false, error: 'Usuario o contraseña incorrectos.' });
        }

        res.status(200).json({
            success: true,
            user: { id: user.id, username: user.username, email: user.email, phone: user.phone, fullName: user.full_name },
        });
    } catch (err) {
        console.error('❌ Error en login:', err.message);
        res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }
};

/* ── Cambiar contraseña ── */
export const changePasswordController = async (req, res) => {
    const { username, currentPassword, newPassword } = req.body;

    if (!username || !currentPassword || !newPassword) {
        return res.status(400).json({ success: false, error: 'Todos los campos son requeridos.' });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ success: false, error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
    }

    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Usuario no encontrado.' });
        }

        const user  = result.rows[0];
        const valid = await bcrypt.compare(currentPassword, user.password);

        if (!valid) {
            return res.status(401).json({ success: false, error: 'La contraseña actual es incorrecta.' });
        }

        const hashedNew = await bcrypt.hash(newPassword, SALT_ROUNDS);
        await pool.query(
            'UPDATE users SET password = $1 WHERE username = $2',
            [hashedNew, username]
        );

        res.status(200).json({ success: true, message: 'Contraseña actualizada correctamente.' });
    } catch (err) {
        console.error('❌ Error cambiando contraseña:', err.message);
        res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }
};
/* ── Reset password (after OTP verification) ── */
export const resetPasswordController = async (req, res) => {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
        return res.status(400).json({ success: false, error: 'Email y nueva contraseña son requeridos.' });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ success: false, error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
    }

    try {
        const hashedNew = await bcrypt.hash(newPassword, SALT_ROUNDS);
        const result = await pool.query(
            'UPDATE users SET password = $1 WHERE email = $2',
            [hashedNew, email]
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
