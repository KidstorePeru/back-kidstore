// src/controllers/orders.controller.js
import pool from '../db.js';

/* ── Guardar orden ── */
export const saveOrderController = async (req, res) => {
    const { email, order } = req.body;

    if (!email || !order) {
        return res.status(400).json({ success: false, error: 'Email y orden son requeridos.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const orderResult = await client.query(
            `INSERT INTO orders (order_id, user_email, total, currency, payment_method, status, form_data, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT DO NOTHING
             RETURNING id`,
            [
                order.orderId,
                email,
                order.total,
                order.currency || 'PEN',
                order.paymentMethod,
                order.status || 'pending',
                JSON.stringify(order.formData || {}),
                order.createdAt || new Date().toISOString(),
            ]
        );

        if (orderResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(200).json({ success: true, message: 'Orden ya registrada.' });
        }

        const dbOrderId = orderResult.rows[0].id;

        for (const item of (order.items || [])) {
            await client.query(
                `INSERT INTO order_items (order_id, product_id, name, price, quantity, image)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [dbOrderId, item.id || '', item.name, item.price, item.quantity, item.image || '']
            );
        }

        await client.query('COMMIT');
        res.status(201).json({ success: true, message: 'Orden guardada correctamente.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error guardando orden:', err.message);
        res.status(500).json({ success: false, error: 'Error al guardar la orden.' });
    } finally {
        client.release();
    }
};

/* ── Obtener órdenes por email ── */
export const getOrdersController = async (req, res) => {
    const { email } = req.params;

    try {
        const result = await pool.query(
            `SELECT
                o.id, o.order_id, o.total, o.currency, o.payment_method,
                o.status, o.form_data, o.created_at,
                json_agg(
                    json_build_object(
                        'id',       oi.product_id,
                        'name',     oi.name,
                        'price',    oi.price,
                        'quantity', oi.quantity,
                        'image',    oi.image
                    ) ORDER BY oi.id
                ) AS items
             FROM orders o
             LEFT JOIN order_items oi ON oi.order_id = o.id
             WHERE o.user_email = $1
             GROUP BY o.id
             ORDER BY o.created_at DESC`,
            [decodeURIComponent(email)]
        );

        const orders = result.rows.map(row => ({
            orderId:       row.order_id,
            total:         parseFloat(row.total),
            currency:      row.currency,
            paymentMethod: row.payment_method,
            status:        row.status,
            formData:      row.form_data,
            createdAt:     row.created_at,
            items:         row.items.filter(i => i.id !== null),
        }));

        res.status(200).json({ success: true, orders });
    } catch (err) {
        console.error('❌ Error obteniendo órdenes:', err.message);
        res.status(500).json({ success: false, error: 'Error al obtener órdenes.' });
    }
};

/* ── Actualizar estado ── */
export const updateOrderStatusController = async (req, res) => {
    const { email, orderId, status } = req.body;
    const validStatuses = ['pending', 'processing', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, error: 'Estado inválido.' });
    }

    try {
        await pool.query(
            'UPDATE orders SET status = $1 WHERE order_id = $2 AND user_email = $3',
            [status, orderId, email]
        );
        res.status(200).json({ success: true, message: 'Estado actualizado.' });
    } catch (err) {
        console.error('❌ Error actualizando estado:', err.message);
        res.status(500).json({ success: false, error: 'Error al actualizar estado.' });
    }
};