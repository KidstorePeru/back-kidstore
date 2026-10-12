// src/lib/session.js
// Sesión de usuario: token firmado con HMAC-SHA256 que el backend entrega al iniciar sesión o
// registrarse. Las rutas privadas (perfil, contraseña, historial de pedidos) lo exigen en
// `Authorization: Bearer <token>` y sacan de ahí al usuario, en vez de fiarse de un correo o un
// nombre de usuario enviado en el cuerpo de la petición (que cualquiera podría falsificar).
//
// El token incluye una huella de la contraseña: al cambiarla, los tokens anteriores dejan de
// valer (cierra la sesión en los demás dispositivos).
import crypto from 'node:crypto';
import pool from '../db.js';

// Secreto: USER_SESSION_SECRET si está definido; si no, se deriva de DATABASE_URL (que ya es
// secreto y existe siempre), así no hace falta configurar nada nuevo en Railway.
const SECRET =
    process.env.USER_SESSION_SECRET ||
    crypto.createHash('sha256').update(`kidstore-user-session:${process.env.DATABASE_URL || ''}`).digest('hex');

const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

const sign = (payload) => crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
const passwordPrint = (hash) => crypto.createHash('sha256').update(String(hash)).digest('base64url').slice(0, 16);

/** Crea el token de sesión para una fila de `users` (necesita id y password). */
export function createUserToken(user) {
    const payload = Buffer.from(
        JSON.stringify({ uid: user.id, pv: passwordPrint(user.password), exp: Date.now() + TTL_MS }),
    ).toString('base64url');
    return `${payload}.${sign(payload)}`;
}

function readToken(token) {
    const [payload, mac] = String(token || '').split('.');
    if (!payload || !mac) return null;
    const expected = sign(payload);
    if (mac.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
    try {
        const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        if (typeof data.exp !== 'number' || data.exp < Date.now() || !data.uid) return null;
        return data;
    } catch {
        return null;
    }
}

/** Middleware: exige un token válido y deja el usuario en req.user ({ id, username, email, password }). */
export async function requireUser(req, res, next) {
    const header = req.headers.authorization || '';
    const data = readToken(header.startsWith('Bearer ') ? header.slice(7) : '');
    const unauthorized = () =>
        res.status(401).json({ success: false, error: 'Tu sesión no es válida. Vuelve a iniciar sesión.' });
    if (!data) return unauthorized();
    try {
        const result = await pool.query('SELECT id, username, email, password FROM users WHERE id = $1', [data.uid]);
        const user = result.rows[0];
        if (!user || passwordPrint(user.password) !== data.pv) return unauthorized();
        req.user = user;
        next();
    } catch (err) {
        console.error('❌ Error validando la sesión:', err.message);
        res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }
}
