// src/controllers/email.controller.js
import { sendEmail } from '../services/email.service.js';
import { orderClientEmail, orderAdminEmail } from '../emails/templates.js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'no-reply@kidstoreperu.com';

/**
 * Construye y envía los dos correos de un pedido (cliente + admin) de forma
 * independiente: si uno falla, el otro se envía igual y el fallo se registra.
 * Devuelve { client: bool, admin: bool }. Nunca lanza.
 */
export const sendOrderEmails = async ({
    email, customerName, orderId, total, items = [],
    paymentMethod, formData = {}, currency = 'PEN', lang = 'ES',
}) => {
    const clientLang = String(lang).toUpperCase() === 'EN' ? 'EN' : 'ES';
    const phone = formData?.phone;

    const client = orderClientEmail({
        orderId, name: customerName, email, items, total,
        currency, paymentMethod, formData, lang: clientLang,
    });
    const admin = orderAdminEmail({
        orderId, name: customerName, email, phone, items, total,
        currency, paymentMethod, formData,
    });

    const [clientRes, adminRes] = await Promise.allSettled([
        sendEmail(email, client.subject, client.html, email),
        sendEmail(ADMIN_EMAIL, admin.subject, admin.html, email),
    ]);

    if (clientRes.status === 'rejected') {
        console.error(`❌ Email al cliente (${email}) falló:`, clientRes.reason?.message || clientRes.reason);
    }
    if (adminRes.status === 'rejected') {
        console.error(`❌ Email al ADMIN (${ADMIN_EMAIL}) falló — pedido #${orderId}:`, adminRes.reason?.message || adminRes.reason);
    } else {
        console.log(`📧 Aviso de pedido #${orderId} enviado al admin (${ADMIN_EMAIL})`);
    }

    return { client: clientRes.status === 'fulfilled', admin: adminRes.status === 'fulfilled' };
};

/* ── Ruta POST /send-receipt (compatibilidad; el checkout ya no la necesita
      porque saveOrderController envía los correos al guardar) ── */
export const sendReceiptController = async (req, res) => {
    const { email, customerName, orderId, total, items, paymentMethod, formData, currency, lang } = req.body;
    try {
        const sent = await sendOrderEmails({ email, customerName, orderId, total, items, paymentMethod, formData, currency, lang });
        res.status(200).json({ success: true, sent });
    } catch (error) {
        console.error('❌ Error enviando emails:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
