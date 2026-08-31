// src/routes/orders.routes.js
import { Router } from 'express';
import {
    saveOrderController,
    getOrdersController,
    updateOrderStatusController,
} from '../controllers/orders.controller.js';

const router = Router();

// Guardar orden (llamado desde el frontend al confirmar pedido)
router.post('/orders', saveOrderController);

// Obtener historial de órdenes por email
router.get('/orders/:email', getOrdersController);

// Actualizar estado (para uso futuro del admin)
router.patch('/orders/status', updateOrderStatusController);

export default router;