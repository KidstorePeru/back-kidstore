// src/routes/admin.routes.js
// Solo los proxies del front (servidor) llaman aquí, con x-admin-key, después de validar la
// cookie de sesión del administrador. El login del panel lo resuelve el front (/api/admin-login).
import { Router } from 'express';
import {
  getAllOrdersController,
  adminUpdateStatusController,
  getRegisteredUsersController,
} from '../controllers/admin.controller.js';
import { requireAdmin } from '../middlewares/adminAuth.middleware.js';

const router = Router();

router.get('/admin/orders',          requireAdmin, getAllOrdersController);
router.patch('/admin/orders/status', requireAdmin, adminUpdateStatusController);
router.get('/admin/users',           requireAdmin, getRegisteredUsersController);

export default router;
