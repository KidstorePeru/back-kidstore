// src/routes/config.routes.js
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import {
  getSiteConfigController,
  updateSiteConfigController,
} from '../controllers/config.controller.js';

const router = Router();

// Middleware inline — verifica header x-admin-key contra ADMIN_SESSION_TOKEN
// (mismo patrón que src/routes/admin.routes.js)
const requireAdmin = (req, res, next) => {
  const token        = req.headers['x-admin-key'];
  const sessionToken = process.env.ADMIN_SESSION_TOKEN || 'kidstore-admin-secret-2025';
  if (token !== sessionToken) {
    return res.status(401).json({ success: false, error: 'No autorizado.' });
  }
  next();
};

// Público (x-api-key) — lo consume la tienda
router.get('/site-config', authenticate, getSiteConfigController);

// Solo admin (x-admin-key) — lo consume el panel
router.put('/admin/site-config', requireAdmin, updateSiteConfigController);

export default router;
