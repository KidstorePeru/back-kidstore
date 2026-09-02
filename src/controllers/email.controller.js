// src/controllers/email.controller.js
import { sendEmail } from '../services/email.service.js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'no-reply@kidstoreperu.com'; // ← cambia esto en tu .env

/**
 * Construye y envía los dos correos de un pedido (cliente + admin) de forma
 * independiente: si uno falla, el otro se envía igual y el fallo se registra.
 * Devuelve { client: bool, admin: bool } indicando cuál se envió.
 * Nunca lanza — pensado para llamarse sin bloquear la respuesta del pedido.
 */
export const sendOrderEmails = async ({ email, customerName, orderId, total, items = [], paymentMethod, formData, currency }) => {
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : 'S/';

    // ── Filas de productos para el HTML ──
    const itemsHtml = items.map(item => `
        <tr style="border-bottom: 1px solid #1e293b;">
            <td style="padding: 14px 12px; color: #e2e8f0; font-weight: 600;">${item.name}</td>
            <td style="padding: 14px 12px; color: #94a3b8; text-align: center;">x${item.quantity}</td>
            <td style="padding: 14px 12px; color: #60a5fa; text-align: right; font-weight: 700;">${symbol} ${(item.price * item.quantity).toFixed(2)}</td>
        </tr>
    `).join('');

    // ── Datos extra del formulario (Epic user, UID, etc.) ──
    const FORM_LABELS = {
        epicUser:    'Usuario Epic Games',
        gameAccount: 'Cuenta / correo del juego',
        gameName:    'Nombre en el juego',
        platform:    'Plataforma',
        riotId:      'Riot ID',
        uid:         'UID',
        server:      'Servidor',
        trainerCode: 'Código de entrenador',
        discordTag:  'Discord',
    };
    const formLabel = (k) => FORM_LABELS[k] || k.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
    const formDataRows = Object.entries(formData || {})
        .filter(([key, value]) => !['notes', 'name', 'phone', 'email'].includes(key) && value)
        .map(([key, value]) => `
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 13px;">${formLabel(key)}</td>
                <td style="padding: 8px 0; color: #e2e8f0; font-size: 13px; font-weight: 600; padding-left: 16px;">${value}</td>
            </tr>
        `).join('');

    const notes = formData?.notes;

    // ════════════════════════════════════════
    //   EMAIL PARA EL CLIENTE
    // ════════════════════════════════════════
    const clientHtml = `
        <div style="font-family: 'Segoe UI', Tahoma, sans-serif; background-color: #0d0d0d; padding: 40px 10px; color: #ffffff;">
            <div style="max-width: 580px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; overflow: hidden; border: 1px solid #1e3a5f; box-shadow: 0 20px 60px rgba(0,0,0,0.8);">
                
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 60%, #312e81 100%); padding: 38px 30px; text-align: center;">
                    <img src="https://www.kidstoreperu.com/logo/imagotipo-kidstore.png" alt="KidStore" width="150" style="display:block;margin:0 auto 6px;filter:brightness(0) invert(1);"/>
                    <p style="margin: 0; font-size: 13px; color: #93c5fd; letter-spacing: 1px;">Recibo de compra</p>
                </div>
                
                <!-- Body -->
                <div style="padding: 38px 35px;">
                    <p style="font-size: 16px; color: #e2e8f0; margin-top: 0;">Hola <strong style="color: #60a5fa;">${customerName}</strong> 👋</p>
                    <p style="color: #94a3b8; line-height: 1.7; font-size: 15px;">
                        Tu pedido <strong style="color: #ffffff;">#${orderId}</strong> fue registrado correctamente. 
                        Recuerda enviar tu comprobante de pago por WhatsApp para que podamos procesarlo.
                    </p>

                    <!-- Tabla de productos -->
                    <table style="width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 14px;">
                        <thead>
                            <tr style="background-color: #1e2d4f; border-bottom: 2px solid #2563eb;">
                                <th style="padding: 12px; color: #93c5fd; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Producto</th>
                                <th style="padding: 12px; color: #93c5fd; text-align: center; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Cant.</th>
                                <th style="padding: 12px; color: #93c5fd; text-align: right; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>${itemsHtml}</tbody>
                        <tfoot>
                            <tr style="background-color: #0a0f1e;">
                                <td colspan="2" style="padding: 18px 12px; text-align: right; color: #94a3b8; font-size: 14px; font-weight: 600;">TOTAL:</td>
                                <td style="padding: 18px 12px; text-align: right; font-size: 22px; font-weight: 900; color: #34d399;">${symbol} ${Number(total).toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <!-- Método de pago -->
                    <div style="background-color: #1e2330; border: 1px solid #2d3748; border-radius: 10px; padding: 16px 20px; margin-bottom: 20px;">
                        <p style="margin: 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Método de pago</p>
                        <p style="margin: 0; font-size: 15px; font-weight: 700; color: #fbbf24; text-transform: capitalize;">💳 ${paymentMethod}</p>
                    </div>

                    ${formDataRows ? `
                    <!-- Datos del juego -->
                    <div style="background-color: #1e2330; border: 1px solid #2d3748; border-radius: 10px; padding: 16px 20px; margin-bottom: 20px;">
                        <p style="margin: 0 0 10px; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Datos proporcionados</p>
                        <table style="width: 100%; border-collapse: collapse;">
                            ${formDataRows}
                        </table>
                    </div>` : ''}

                    ${notes ? `
                    <div style="background-color: #1e2330; border-left: 3px solid #6366f1; padding: 14px 18px; border-radius: 0 8px 8px 0; margin-bottom: 20px;">
                        <p style="margin: 0 0 4px; font-size: 12px; color: #64748b; text-transform: uppercase;">Notas</p>
                        <p style="margin: 0; color: #e2e8f0; font-size: 14px;">${notes}</p>
                    </div>` : ''}

                    <!-- WhatsApp CTA -->
                    <div style="text-align: center; margin-top: 28px;">
                        <a href="https://wa.me/51983454837" 
                           style="display: inline-block; background: linear-gradient(135deg, #16a34a, #15803d); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 700; font-size: 15px; letter-spacing: 0.5px;">
                            📲 Enviar comprobante por WhatsApp
                        </a>
                    </div>
                </div>
                
                <!-- Footer -->
                <div style="background-color: #080d17; padding: 22px; text-align: center; border-top: 1px solid #1e2d4f;">
                    <p style="margin: 0 0 4px; font-size: 12px; color: #374151;">© ${new Date().getFullYear()} KIDSTORE. Todos los derechos reservados.</p>
                    <p style="margin: 0; font-size: 11px; color: #1f2937;">Tu tienda digital gamer de confianza 🎮</p>
                </div>
            </div>
        </div>
    `;

    // ════════════════════════════════════════
    //   EMAIL PARA EL ADMIN
    // ════════════════════════════════════════
    const adminHtml = `
        <div style="font-family: 'Segoe UI', sans-serif; background-color: #0a0f1a; padding: 30px 10px; color: #ffffff;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #111827; border-radius: 12px; overflow: hidden; border: 1px solid #374151;">
                
                <div style="background: linear-gradient(135deg, #7c3aed, #4f46e5); padding: 24px 28px; display: flex; align-items: center; justify-content: space-between;">
                    <div>
                        <h1 style="margin: 0; font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">🛒 NUEVO PEDIDO</h1>
                        <p style="margin: 4px 0 0; font-size: 13px; color: #c4b5fd;">KidStore Admin Panel</p>
                    </div>
                    <div style="background: rgba(255,255,255,0.15); padding: 8px 16px; border-radius: 8px; text-align: center;">
                        <p style="margin: 0; font-size: 11px; color: #e9d5ff;">Pedido</p>
                        <p style="margin: 0; font-size: 18px; font-weight: 900;">#${orderId}</p>
                    </div>
                </div>
                
                <div style="padding: 28px;">
                    <!-- Cliente -->
                    <div style="background: #1e293b; border-radius: 10px; padding: 16px 20px; margin-bottom: 16px;">
                        <p style="margin: 0 0 10px; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">👤 Cliente</p>
                        <p style="margin: 0 0 4px; font-size: 15px; font-weight: 700; color: #f1f5f9;">${customerName}</p>
                        <p style="margin: 0; font-size: 13px; color: #94a3b8;">${email}</p>
                    </div>

                    <!-- Productos -->
                    <div style="background: #1e293b; border-radius: 10px; padding: 16px 20px; margin-bottom: 16px;">
                        <p style="margin: 0 0 12px; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">🎮 Productos</p>
                        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                            ${items.map(item => `
                                <tr style="border-bottom: 1px solid #334155;">
                                    <td style="padding: 10px 0; color: #e2e8f0; font-weight: 600;">${item.name}</td>
                                    <td style="padding: 10px 0; color: #64748b; text-align: center;">x${item.quantity}</td>
                                    <td style="padding: 10px 0; color: #60a5fa; text-align: right; font-weight: 700;">${symbol} ${(item.price * item.quantity).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </table>
                        <p style="margin: 14px 0 0; text-align: right; font-size: 18px; font-weight: 900; color: #34d399;">Total: ${symbol} ${Number(total).toFixed(2)}</p>
                    </div>

                    <!-- Pago + datos -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                        <div style="background: #1e293b; border-radius: 10px; padding: 14px 16px;">
                            <p style="margin: 0 0 6px; font-size: 11px; color: #64748b; text-transform: uppercase;">💳 Pago</p>
                            <p style="margin: 0; font-weight: 700; color: #fbbf24; text-transform: capitalize;">${paymentMethod}</p>
                        </div>
                        <div style="background: #1e293b; border-radius: 10px; padding: 14px 16px;">
                            <p style="margin: 0 0 6px; font-size: 11px; color: #64748b; text-transform: uppercase;">💱 Moneda</p>
                            <p style="margin: 0; font-weight: 700; color: #a78bfa;">${currency || 'PEN'}</p>
                        </div>
                    </div>

                    ${formDataRows ? `
                    <div style="background: #1e293b; border-radius: 10px; padding: 16px 20px; margin-bottom: 16px;">
                        <p style="margin: 0 0 10px; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">📋 Datos del pedido</p>
                        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                            ${formDataRows}
                        </table>
                    </div>` : ''}

                    ${notes ? `
                    <div style="background: #1e293b; border-left: 3px solid #f59e0b; padding: 14px 18px; border-radius: 0 8px 8px 0;">
                        <p style="margin: 0 0 4px; font-size: 11px; color: #64748b; text-transform: uppercase;">📝 Notas</p>
                        <p style="margin: 0; color: #fde68a; font-size: 14px;">${notes}</p>
                    </div>` : ''}
                </div>
            </div>
        </div>
    `;

    // Cada correo por separado — un fallo no arrastra al otro.
    const [clientRes, adminRes] = await Promise.allSettled([
        sendEmail(email, `✅ Pedido #${orderId} confirmado – KidStore`, clientHtml, email),
        sendEmail(ADMIN_EMAIL, `🛒 Nuevo pedido #${orderId} de ${customerName}`, adminHtml, email),
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
    const { email, customerName, orderId, total, items, paymentMethod, formData, currency } = req.body;
    try {
        const sent = await sendOrderEmails({ email, customerName, orderId, total, items, paymentMethod, formData, currency });
        res.status(200).json({ success: true, sent });
    } catch (error) {
        console.error('❌ Error enviando emails:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};