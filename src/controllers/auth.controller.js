// src/controllers/auth.controller.js
import pool from '../db.js';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export const registerController = async (req, res) => {
    const { username, email, password, phone } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ success: false, error: 'Faltan campos obligatorios.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const query = `
            INSERT INTO users (username, email, password, phone)
            VALUES ($1, $2, $3, $4)
            RETURNING id, username, email, phone
        `;
        const values = [username, email, hashedPassword, phone || null];

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

/* ── Actualización de Perfil ── */
export const updateUserController = async (req, res) => {
    const { email, username, phone } = req.body;

    // El email es necesario para identificar al usuario pero no se modificará
    if (!email) {
        return res.status(400).json({ error: 'Se requiere el correo para identificar al usuario.' });
    }

    try {
        // Solo actualizamos username y phone basándonos en el email
        const query = `
            UPDATE users 
            SET username = COALESCE($1, username), 
                phone = COALESCE($2, phone)
            WHERE email = $3
            RETURNING id, username, email, phone
        `;
        const values = [username, phone, email];

        const result = await pool.query(query, values);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        res.json({ message: 'Perfil actualizado correctamente', user: result.rows[0] });
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
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
            user: { id: user.id, username: user.username, email: user.email, phone: user.phone },
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
