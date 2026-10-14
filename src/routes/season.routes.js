// src/routes/season.routes.js
import { Router } from 'express';
import { requireAdmin } from '../middlewares/adminAuth.middleware.js';
import { getSeasonController, getAdminSeasonController, updateSeasonController } from '../controllers/season.controller.js';

const router = Router();

// Público: la web lo consulta al abrir para saber qué temporada mostrar.
router.get('/season', getSeasonController);

// Panel de administración (x-admin-key, vía los proxies del front).
router.get('/admin/season', requireAdmin, getAdminSeasonController);
router.put('/admin/season', requireAdmin, updateSeasonController);

export default router;
