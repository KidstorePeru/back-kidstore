// src/controllers/verification.controller.js
import { sendEmail } from '../services/email.service.js';

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
    const isEN = String(req.body.lang || '').toUpperCase() === 'EN';
    const T = isEN ? {
        subject: (c) => `${c} – Your KidStore verification code`,
        heading: 'Verification code',
        greet:   'Hi',
        intro:   'To continue on KidStore, enter the verification code below. It expires in',
        minutes: '10 minutes',
        codeLbl: 'Your verification code',
        warn:    "If you didn't request this code, ignore this message. Your account has not been changed.",
        rights:  'All rights reserved.',
        wait:    'Please wait 60 seconds before requesting a new code.',
        failed:  'Could not send the email. Please try again.',
        sent:    (e) => `Code sent to ${e}`,
    } : {
        subject: (c) => `${c} – Tu código de verificación KidStore`,
        heading: 'Código de verificación',
        greet:   'Hola',
        intro:   'Para continuar en KidStore, ingresa el siguiente código de verificación. Expira en',
        minutes: '10 minutos',
        codeLbl: 'Tu código de verificación',
        warn:    'Si no solicitaste este código, ignora este mensaje. Tu cuenta no ha sido modificada.',
        rights:  'Todos los derechos reservados.',
        wait:    'Debes esperar 60 segundos antes de solicitar un nuevo código.',
        failed:  'No se pudo enviar el correo. Intenta de nuevo.',
        sent:    (e) => `Código enviado a ${e}`,
    };
    cleanupExpired();

    const existing = pendingVerifications.get(email);
    if (existing && existing.expiresAt - 9 * 60 * 1000 > Date.now() - 60 * 1000) {
        return res.status(429).json({ success: false, error: T.wait });
    }

    const code = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    pendingVerifications.set(email, { code, expiresAt, username });

    const htmlContent = `
        <div style="font-family:'Segoe UI',Roboto,Arial,sans-serif;background-color:#080C18;padding:40px 10px;color:#fff;">
            <div style="max-width:520px;margin:0 auto;">

                <!-- Logo -->
                <div style="text-align:center;padding-bottom:28px;">
                    <img src="https://www.kidstoreperu.com/logo/imagotipo-kidstore.png" alt="KidStore" width="150" style="display:block;margin:0 auto;filter:brightness(0) invert(1);"/>
                    <p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,0.35);letter-spacing:1px;">GAMING MARKETPLACE</p>
                </div>

                <!-- Card -->
                <div style="background:linear-gradient(135deg,rgba(124,58,237,0.12),rgba(15,10,40,0.95));border:1px solid rgba(124,58,237,0.25);border-radius:20px;overflow:hidden;">

                    <!-- Header strip -->
                    <div style="background:linear-gradient(135deg,#7C3AED,#5B21B6,#4C1D95);padding:24px 32px;text-align:center;">
                        <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:rgba(255,255,255,0.7);">
                            🔐 ${T.heading}
                        </p>
                    </div>

                    <!-- Body -->
                    <div style="padding:36px 32px;">
                        <p style="font-size:15px;color:#e2e8f0;margin:0 0 6px;">
                            ${T.greet} <strong style="color:#A78BFA;">${username || email.split('@')[0]}</strong> 👋
                        </p>
                        <p style="color:rgba(255,255,255,0.4);line-height:1.7;font-size:14px;margin:0 0 28px;">
                            ${T.intro} <strong style="color:#F97316;">${T.minutes}</strong>.
                        </p>

                        <!-- OTP Box -->
                        <div style="background:linear-gradient(135deg,rgba(124,58,237,0.15),rgba(124,58,237,0.05));border:1px solid rgba(124,58,237,0.3);border-radius:16px;padding:28px;text-align:center;margin:0 0 28px;">
                            <p style="margin:0 0 8px;font-size:10px;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:2px;font-weight:700;">
                                ${T.codeLbl}
                            </p>
                            <p style="margin:0;font-size:44px;font-weight:900;letter-spacing:14px;color:#fff;font-family:'Courier New',monospace;">
                                ${code}
                            </p>
                        </div>

                        <!-- Warning -->
                        <div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.15);border-radius:12px;padding:14px 16px;">
                            <p style="margin:0;color:rgba(255,255,255,0.4);font-size:12px;line-height:1.5;">
                                ⚠️ ${T.warn}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div style="text-align:center;padding-top:24px;">
                    <p style="margin:0 0 4px;font-size:11px;color:rgba(255,255,255,0.15);">
                        © ${new Date().getFullYear()} KidStore. ${T.rights}
                    </p>
                    <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.1);">
                        Lima, Perú · contacto@kidstoreperu.com
                    </p>
                </div>
            </div>
        </div>
    `;

    try {
        await sendEmail(email, T.subject(code), htmlContent);
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
