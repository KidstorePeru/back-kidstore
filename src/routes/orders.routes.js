// src/routes/orders.routes.js
import { Router } from 'express';
import { saveOrderController, getMyOrdersController } from '../controllers/orders.controller.js';
import { requireUser } from '../lib/session.js';
import { rateLimit } from '../middlewares/rateLimit.middleware.js';

const router = Router();

// Guardar pedido (lo llama el checkout del front al confirmar la compra; también para
// invitados sin cuenta). El límite es por IP del cliente.
router.post(
    '/orders',
    rateLimit({ windowMs: 10 * 60 * 1000, max: 30, message: 'Demasiados pedidos seguidos. Espera unos minutos.' }),
    saveOrderController,
);

// Historial del usuario con sesión (sus pedidos por el correo de su cuenta). El estado lo
// cambia el administrador desde /admin/orders/status.
router.get('/orders/me', requireUser, getMyOrdersController);

export default router;
