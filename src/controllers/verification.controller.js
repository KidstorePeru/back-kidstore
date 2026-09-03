// src/controllers/verification.controller.js
import { sendEmail } from '../services/email.service.js';
import { verificationEmail } from '../emails/templates.js';

const pendingVerifications = new Map();
// Correos que superaron un código en los últimos 15 min. registerController lo
// consulta para no crear cuentas con correos sin verificar. En memoria: si el
// backend reinicia entre el código y el registro, el usuario pide otro código.
const verifiedEmails = new Map(); // email(lower) -> expiresAt
const VERIFIED_TTL = 15 * 60 * 1000;

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const norm = (e) => String(e || '').trim().toLowerCase();

const cleanupExpired = () => {
    const now = Date.now();
    for (const [email, data] of pendingVerifications.entries()) {
        if (data.expiresAt < now) pendingVerifications.delete(email);
    }
    for (const [email, exp] of verifiedEmails.entries()) {
        if (exp < now) verifiedEmails.delete(email);
    }
};

/** ¿El correo verificó un código hace poco? (para registerController) */
export const isEmailVerified = (email) => {
    const exp = verifiedEmails.get(norm(email));
    return !!exp && exp > Date.now();
};
/** Consume la verificación (un solo uso). */
export const consumeVerifiedEmail = (email) => {
    const key = norm(email);
    const ok = isEmailVerified(key);
    if (ok) verifiedEmails.delete(key);
    return ok;
};

export const sendVerificationController = async (req, res) => {
    const { email, username } = req.body;
    const lang = String(req.body.lang || '').toUpperCase() === 'EN' ? 'EN' : 'ES';
    const ALLOWED_PURPOSES = ['register', 'reset', 'email-change'];
    const purpose = ALLOWED_PURPOSES.includes(req.body.purpose) ? req.body.purpose : 'register';
    const T = lang === 'EN'
        ? { wait: 'Please wait 60 seconds before requesting a new code.', failed: 'Could not send the email. Please try again.', sent: (e) => `Code sent to ${e}` }
        : { wait: 'Debes esperar 60 segundos antes de solicitar un nuevo código.', failed: 'No se pudo enviar el correo. Intenta de nuevo.', sent: (e) => `Código enviado a ${e}` };
    cleanupExpired();

    const existing = pendingVerifications.get(email);
    if (existing && existing.expiresAt - 9 * 60 * 1000 > Date.now() - 60 * 1000) {
        return res.status(429).json({ success: false, error: T.wait });
    }

    const code = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    pendingVerifications.set(email, { code, expiresAt, username });

    const { subject, html } = verificationEmail({ code, name: username, email, lang, purpose });

    try {
        await sendEmail(email, subject, html);
        res.status(200).json({ success: true, message: T.sent(email) });
    } catch (error) {
        pendingVerifications.delete(email);
        res.status(500).json({ success: false, error: T.failed });
    }
};

export const verifyCodeController = (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ success: false, error: 'Email y código son requeridos.' });

    const record = pendingVerifications.get(email);
    if (!record) return res.status(404).json({ success: false, error: 'No hay verificación pendiente para este email.' });
    if (Date.now() > record.expiresAt) { pendingVerifications.delete(email); return res.status(410).json({ success: false, error: 'El código ha expirado. Solicita uno nuevo.' }); }
    if (record.code !== String(code).trim()) return res.status(400).json({ success: false, error: 'Código incorrecto. Inténtalo de nuevo.' });

    pendingVerifications.delete(email);
    verifiedEmails.set(norm(email), Date.now() + VERIFIED_TTL);
    res.status(200).json({ success: true, message: 'Verificación exitosa.', username: record.username });
};
