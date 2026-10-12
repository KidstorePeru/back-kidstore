// src/controllers/admin.controller.js
// Panel de administración. Las rutas exigen x-admin-key (ver adminAuth.middleware.js).
import pool from '../db.js';
import { sendEmail } from '../services/email.service.js';
import { orderStatusEmail } from '../emails/templates.js';

/* ══════════════════════════════════════════
   TODOS LOS PEDIDOS
══════════════════════════════════════════ */
export const getAllOrdersController = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
          o.id,
          o.order_id,
          o.user_email,
          o.total,
          o.currency,
          o.payment_method,
          o.status,
          o.form_data,
          o.created_at,
          o.updated_at,
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
       GROUP BY o.id
       ORDER BY o.created_at DESC`
    );

    const orders = result.rows.map(row => ({
      id:            String(row.id),          // PK interna — clave estable para cambiar estado
      orderId:       row.order_id,            // número de pedido visible al cliente
      userEmail:     row.user_email,
      total:         parseFloat(row.total),
      currency:      row.currency,
      paymentMethod: row.payment_method,
      status:        row.status,
      formData:      row.form_data || {},
      createdAt:     row.created_at,
      updatedAt:     row.updated_at,
      items:         row.items,
    }));

    res.status(200).json({ success: true, orders });
  } catch (err) {
    console.error('❌ Error obteniendo pedidos:', err.message);
    res.status(500).json({ success: false, error: 'Error al obtener pedidos.' });
  }
};

/* ══════════════════════════════════════════
   USUARIOS REGISTRADOS (tabla users)
══════════════════════════════════════════ */
export const getRegisteredUsersController = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, phone, full_name, created_at
         FROM users
       ORDER BY created_at DESC`
    );

    const users = result.rows.map(u => ({
      id:        String(u.id),
      username:  u.username,
      fullName:  u.full_name || null,
      email:     u.email,
      phone:     u.phone || null,
      createdAt: u.created_at,
      registered: true,
    }));

    res.status(200).json({ success: true, users });
  } catch (err) {
    console.error('❌ Error obteniendo usuarios:', err.message);
    res.status(500).json({ success: false, error: 'Error al obtener usuarios.' });
  }
};

/* ══════════════════════════════════════════
   ACTUALIZAR ESTADO
   El cliente lo ve en su historial y recibe un correo con el nuevo estado
══════════════════════════════════════════ */
export const adminUpdateStatusController = async (req, res) => {
  const { id, status } = req.body || {};
  const validStatuses = ['pending', 'processing', 'delivered', 'cancelled'];

  // Siempre por la PK interna: el número de pedido (order_id) puede repetirse entre clientes.
  if (!id || !status) {
    return res.status(400).json({ success: false, error: 'id y status son requeridos.' });
  }
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, error: `Estado inválido. Valores: ${validStatuses.join(', ')}` });
  }

  try {
    const prev = await pool.query('SELECT status FROM orders WHERE id = $1', [id]);
    if (prev.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Pedido no encontrado.' });
    }
    const result = await pool.query(
      `UPDATE orders SET status = $1, updated_at = NOW()
        WHERE id = $2
    RETURNING id, order_id, status, user_email, form_data, lang, updated_at`,
      [status, id],
    );
    const order = result.rows[0];

    res.status(200).json({
      success: true,
      message: `Pedido #${order.order_id} → "${status}"`,
      order: { id: order.id, order_id: order.order_id, status: order.status, user_email: order.user_email, updated_at: order.updated_at },
    });

    // Aviso al cliente por correo (en proceso / entregado / cancelado), sin bloquear la respuesta
    // y solo si el estado cambió de verdad.
    if (prev.rows[0].status !== status) {
      notifyStatusChange(order).catch((err) =>
        console.error(`❌ Aviso de estado del pedido #${order.order_id} no enviado:`, err?.message || err),
      );
    }
  } catch (err) {
    console.error('❌ Error actualizando estado:', err.message);
    res.status(500).json({ success: false, error: 'Error al actualizar el estado.' });
  }
};

async function notifyStatusChange(order) {
  const items = await pool.query('SELECT name, quantity FROM order_items WHERE order_id = $1 ORDER BY id', [order.id]);
  const mail = orderStatusEmail({
    orderId: order.order_id,
    name: order.form_data?.name || '',
    status: order.status,
    items: items.rows,
    lang: order.lang === 'EN' ? 'EN' : 'ES',
  });
  if (!mail) return; // "pending": no se avisa
  await sendEmail(order.user_email, mail.subject, mail.html);
  console.log(`📧 Aviso de estado "${order.status}" del pedido #${order.order_id} enviado a ${order.user_email}`);
}
