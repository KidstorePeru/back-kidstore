import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

// Remitente configurable. El dominio debe estar verificado en Resend o TODOS
// los correos fallan. Ej: MAIL_FROM="KidStore <no-reply@kidstoreperu.com>"
const FROM = process.env.MAIL_FROM || 'KidStore <no-reply@kidstoreperu.com>';

// Cliente perezoso: si falta RESEND_API_KEY no queremos que el módulo reviente
// al importarse (tumbaría el guardado de pedidos, que ahora envía correos).
let _resend = null;
const getResend = () => {
    if (_resend) return _resend;
    if (!process.env.RESEND_API_KEY) return null;
    _resend = new Resend(process.env.RESEND_API_KEY);
    return _resend;
};

export const sendEmail = async (to, subject, html, replyTo) => {
    const resend = getResend();
    if (!resend) {
        throw new Error('RESEND_API_KEY no configurada — correo no enviado');
    }
    try {
        const { data, error } = await resend.emails.send({
            from: FROM,
            to: [to],
            subject,
            html,
            ...(replyTo ? { replyTo } : {}),
        });

        if (error) throw error;
        return data;
    } catch (err) {
        console.error('❌ Error en Resend Service:', err?.message || err);
        throw new Error(`Fallo al enviar correo a ${to}: ${err?.message || 'desconocido'}`);
    }
};
