// src/routes/config.routes.js
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/adminAuth.middleware.js';
import {
  getSiteConfigController,
  updateSiteConfigController,
} from '../controllers/config.controller.js';

const router = Router();

// Público (x-api-key) — lo consume la tienda
router.get('/site-config', authenticate, getSiteConfigController);

// Solo admin (x-admin-key) — lo consume el panel
router.put('/admin/site-config', requireAdmin, updateSiteConfigController);

export default router;
