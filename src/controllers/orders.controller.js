// src/controllers/orders.controller.js
import pool from '../db.js';
import { sendOrderEmails } from './email.controller.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CURRENCIES = ['PEN', 'USD', 'EUR'];
const MAX_AMOUNT = 99_999_999; // NUMERIC(10,2)
const MAX_INT = 2_147_483_647; // INTEGER

// Miniatura del producto: solo imágenes de la propia web ("/…") o de fortnite-api.com (tienda
// de Fortnite). Cualquier otra URL se descarta: el pedido llega por la API pública y esas
// imágenes se muestran en el panel y en los correos (serían píxeles de rastreo).
const safeImage = (v) => {
    const s = String(v || '').trim();
    if (/^\/(?!\/)[^\s"'<>]*$/.test(s)) return s.slice(0, 500);
    if (/^https:\/\/([a-z0-9-]+\.)?fortnite-api\.com\/[^\s"'<>]*$/i.test(s)) return s.slice(0, 500);
    return '';
};

/* ── Guardar pedido ── */
export const saveOrderController = async (req, res) => {
    const { email, order } = req.body || {};

    if (!email || !order || String(email).length > 255 || !EMAIL_RE.test(String(email))) {
        return res.status(400).json({ success: false, error: 'Email y orden son requeridos.' });
    }
    const rawItems = Array.isArray(order.items) ? order.items : [];
    const total = Number(order.total);
    const orderId = Number(order.orderId);
    if (!rawItems.length || rawItems.length > 100 || !Number.isFinite(total) || total < 0 || total > MAX_AMOUNT
        || !Number.isInteger(orderId) || orderId < 1 || orderId > MAX_INT || !order.paymentMethod) {
        return res.status(400).json({ success: false, error: 'Datos del pedido incompletos.' });
    }
    for (const item of rawItems) {
        const price = Number(item?.price);
        const quantity = Number(item?.quantity);
        if (!item?.name || !Number.isFinite(price) || price < 0 || price > MAX_AMOUNT
            || !Number.isInteger(quantity) || quantity < 1 || quantity > 10_000) {
            return res.status(400).json({ success: false, error: 'Hay un producto con datos no válidos.' });
        }
    }
    const items = rawItems.map((item) => ({
        id: String(item.id || '').slice(0, 100),
        name: String(item.name).slice(0, 255),
        price: Number(item.price),
        quantity: Number(item.quantity),
        image: safeImage(item.image),
    }));
    const currency = CURRENCIES.includes(order.currency) ? order.currency : 'PEN';
    const lang = String(order.lang || '').toUpperCase() === 'EN' ? 'EN' : 'ES';

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // El estado inicial y la fecha los pone el servidor (no se aceptan del navegador).
        const orderResult = await client.query(
            `INSERT INTO orders (order_id, user_email, total, currency, payment_method, status, form_data, lang)
             VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)
             ON CONFLICT (user_email, order_id) DO NOTHING
             RETURNING id`,
            [orderId, String(email).trim(), total, currency, String(order.paymentMethod).slice(0, 50), JSON.stringify(order.formData || {}), lang],
        );

        // Sin fila devuelta = ya existía (reintento del checkout). No es un error
        // y NO se reenvían los correos.
        if (orderResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(200).json({ success: true, duplicate: true, message: 'Orden ya registrada.' });
        }

        const dbOrderId = orderResult.rows[0].id;

        for (const item of items) {
            await client.query(
                `INSERT INTO order_items (order_id, product_id, name, price, quantity, image)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [dbOrderId, item.id, item.name, item.price, item.quantity, item.image],
            );
        }

        await client.query('COMMIT');
        res.status(201).json({ success: true, id: dbOrderId, message: 'Orden guardada correctamente.' });

        // Notificar (cliente + admin) fuera de la transacción y sin bloquear la
        // respuesta. Si Resend falla se registra pero el pedido ya está guardado.
        const fd = order.formData || {};
        sendOrderEmails({
            email,
            customerName:  fd.name || String(email).split('@')[0],
            orderId,
            total,
            currency,
            paymentMethod: order.paymentMethod,
            formData:      fd,
            items,
            lang,
        }).catch((err) => console.error('❌ Error enviando correos del pedido:', err?.message || err));
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error guardando orden:', err.message);
        res.status(500).json({ success: false, error: 'Error al guardar la orden.' });
    } finally {
        client.release();
    }
};

/* ── Historial del usuario con sesión (pedidos con el correo de su cuenta) ── */
export const getMyOrdersController = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                o.order_id, o.total, o.currency, o.payment_method,
                o.status, o.form_data, o.created_at, o.updated_at,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id',       oi.product_id,
                            'name',     oi.name,
                            'price',    oi.price,
                            'quantity', oi.quantity,
                            'image',    oi.image
                        ) ORDER BY oi.id
                    ) FILTER (WHERE oi.id IS NOT NULL),
                    '[]'
                ) AS items
             FROM orders o
             LEFT JOIN order_items oi ON oi.order_id = o.id
             WHERE LOWER(o.user_email) = LOWER($1)
             GROUP BY o.id
             ORDER BY o.created_at DESC`,
            [req.user.email],
        );

        const orders = result.rows.map((row) => ({
            orderId:       row.order_id,
            total:         parseFloat(row.total),
            currency:      row.currency,
            paymentMethod: row.payment_method,
            status:        row.status,
            formData:      row.form_data || {},
            createdAt:     row.created_at,
            updatedAt:     row.updated_at,
            items:         row.items.map((i) => ({ ...i, price: parseFloat(i.price) })),
        }));

        res.status(200).json({ success: true, orders });
    } catch (err) {
        console.error('❌ Error obteniendo órdenes:', err.message);
        res.status(500).json({ success: false, error: 'Error al obtener órdenes.' });
    }
};
