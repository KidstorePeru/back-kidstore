// src/controllers/admin.controller.js
import pool   from '../db.js';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/* ══════════════════════════════════════════
   SETUP: crea el admin inicial desde .env
   Se llama desde initDB() al arrancar
══════════════════════════════════════════ */
export const seedAdminIfNeeded = async () => {
  const email    = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn('⚠️  ADMIN_EMAIL / ADMIN_PASSWORD no configurados en .env');
    return;
  }

  const existing = await pool.query('SELECT id FROM admins WHERE email = $1', [email]);
  if (existing.rows.length > 0) return; // ya existe, no sobreescribir

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  await pool.query(
    'INSERT INTO admins (email, password, username) VALUES ($1, $2, $3)',
    [email, hashed, email.split('@')[0]]
  );
  console.log(`✅ Admin creado: ${email}`);
};

/* ══════════════════════════════════════════
   LOGIN ADMIN
══════════════════════════════════════════ */
export const adminLoginController = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email y contraseña son requeridos.' });
  }

  // Verificar dominio autorizado
  const adminDomain = process.env.ADMIN_DOMAIN || 'kidstoreperu.com';
  if (!email.endsWith(`@${adminDomain}`)) {
    return res.status(401).json({ success: false, error: 'Correo no autorizado como administrador.' });
  }

  try {
    const result = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Credenciales incorrectas.' });
    }

    const admin = result.rows[0];
    const valid = await bcrypt.compare(password, admin.password);

    if (!valid) {
      return res.status(401).json({ success: false, error: 'Credenciales incorrectas.' });
    }

    res.status(200).json({
      success: true,
      admin: {
        id:       admin.id,
        email:    admin.email,
        username: admin.username,
        role:     'admin',
      },
    });
  } catch (err) {
    console.error('❌ Error en login admin:', err.message);
    res.status(500).json({ success: false, error: 'Error interno del servidor.' });
  }
};

/* ══════════════════════════════════════════
   TODOS LOS PEDIDOS (paginados opcionalmente)
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
      orderId:       row.order_id,
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
   ACTUALIZAR ESTADO
   El cliente lo ve en tiempo real desde su historial
══════════════════════════════════════════ */
export const adminUpdateStatusController = async (req, res) => {
  const { orderId, status } = req.body;
  const validStatuses = ['pending', 'processing', 'delivered', 'cancelled'];

  if (!orderId || !status) {
    return res.status(400).json({ success: false, error: 'orderId y status son requeridos.' });
  }
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, error: `Estado inválido. Valores: ${validStatuses.join(', ')}` });
  }

  try {
    const result = await pool.query(
      `UPDATE orders
       SET status = $1, updated_at = NOW()
       WHERE order_id = $2
       RETURNING order_id, status, user_email, updated_at`,
      [status, orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Pedido no encontrado.' });
    }

    res.status(200).json({
      success: true,
      message: `Pedido #${orderId} → "${status}"`,
      order:   result.rows[0],
    });
  } catch (err) {
    console.error('❌ Error actualizando estado:', err.message);
    res.status(500).json({ success: false, error: 'Error al actualizar el estado.' });
  }
};