// src/controllers/verification.controller.js
import crypto from 'node:crypto';
import { sendEmail } from '../services/email.service.js';
import { verificationEmail } from '../emails/templates.js';

// Códigos pendientes por correo (en minúsculas): { code, expiresAt, sentAt, attempts, username }.
const pendingVerifications = new Map();
// Correos que superaron un código en los últimos 15 min. El registro, el cambio de correo y el
// restablecimiento de contraseña lo consultan (un solo uso). En memoria: si el backend reinicia
// entre el código y el paso siguiente, el usuario pide otro código.
const verifiedEmails = new Map(); // email -> expiresAt
const VERIFIED_TTL = 15 * 60 * 1000;
const CODE_TTL = 10 * 60 * 1000;
const RESEND_WAIT = 60 * 1000;
const MAX_ATTEMPTS = 5;

const generateOTP = () => String(crypto.randomInt(100000, 1000000));
const norm = (e) => String(e || '').trim().toLowerCase();

const cleanupExpired = () => {
    const now = Date.now();
    for (const [email, data] of pendingVerifications) if (data.expiresAt < now) pendingVerifications.delete(email);
    for (const [email, exp] of verifiedEmails) if (exp < now) verifiedEmails.delete(email);
};

/** Consume la verificación del correo (un solo uso). */
export const consumeVerifiedEmail = (email) => {
    const key = norm(email);
    const exp = verifiedEmails.get(key);
    const ok = !!exp && exp > Date.now();
    verifiedEmails.delete(key);
    return ok;
};

export const sendVerificationController = async (req, res) => {
    const email = String(req.body.email).trim();
    const key = norm(email);
    const { username } = req.body;
    const lang = String(req.body.lang || '').toUpperCase() === 'EN' ? 'EN' : 'ES';
    const ALLOWED_PURPOSES = ['register', 'reset', 'email-change'];
    const purpose = ALLOWED_PURPOSES.includes(req.body.purpose) ? req.body.purpose : 'register';
    const T = lang === 'EN'
        ? { wait: 'Please wait 60 seconds before requesting a new code.', failed: 'Could not send the email. Please try again.', sent: (e) => `Code sent to ${e}` }
        : { wait: 'Debes esperar 60 segundos antes de solicitar un nuevo código.', failed: 'No se pudo enviar el correo. Intenta de nuevo.', sent: (e) => `Código enviado a ${e}` };
    cleanupExpired();

    const existing = pendingVerifications.get(key);
    if (existing && Date.now() - existing.sentAt < RESEND_WAIT) {
        return res.status(429).json({ success: false, error: T.wait });
    }

    const code = generateOTP();
    const now = Date.now();
    pendingVerifications.set(key, { code, expiresAt: now + CODE_TTL, sentAt: now, attempts: 0, username });

    const { subject, html } = verificationEmail({ code, name: username, email, lang, purpose });

    try {
        await sendEmail(email, subject, html);
        res.status(200).json({ success: true, message: T.sent(email) });
    } catch (error) {
        console.error('❌ Error enviando el código de verificación:', error?.message || error);
        pendingVerifications.delete(key);
        res.status(500).json({ success: false, error: T.failed });
    }
};

export const verifyCodeController = (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ success: false, error: 'Email y código son requeridos.' });

    const key = norm(email);
    const record = pendingVerifications.get(key);
    if (!record) return res.status(404).json({ success: false, error: 'No hay verificación pendiente para este email.' });
    if (Date.now() > record.expiresAt) {
        pendingVerifications.delete(key);
        return res.status(410).json({ success: false, error: 'El código ha expirado. Solicita uno nuevo.' });
    }
    if (record.code !== String(code).trim()) {
        // Pocos intentos por código: un código de 6 cifras no se puede adivinar probando.
        record.attempts += 1;
        if (record.attempts >= MAX_ATTEMPTS) {
            pendingVerifications.delete(key);
            return res.status(429).json({ success: false, error: 'Demasiados intentos fallidos. Solicita un código nuevo.' });
        }
        return res.status(400).json({ success: false, error: 'Código incorrecto. Inténtalo de nuevo.' });
    }

    pendingVerifications.delete(key);
    verifiedEmails.set(key, Date.now() + VERIFIED_TTL);
    res.status(200).json({ success: true, message: 'Verificación exitosa.', username: record.username });
};
