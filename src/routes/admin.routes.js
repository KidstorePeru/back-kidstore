// src/routes/admin.routes.js
import { Router } from 'express';
import {
  adminLoginController,
  getAllOrdersController,
  adminUpdateStatusController,
} from '../controllers/admin.controller.js';

const router = Router();

// Middleware inline — verifica header x-admin-key contra ADMIN_SESSION_TOKEN
const requireAdmin = (req, res, next) => {
  const token         = req.headers['x-admin-key'];
  const sessionToken  = process.env.ADMIN_SESSION_TOKEN || 'kidstore-admin-secret-2025';
  if (token !== sessionToken) {
    return res.status(401).json({ success: false, error: 'No autorizado.' });
  }
  next();
};

router.post('/admin/login',          adminLoginController);
router.get('/admin/orders',          requireAdmin, getAllOrdersController);
router.patch('/admin/orders/status', requireAdmin, adminUpdateStatusController);

export default router;