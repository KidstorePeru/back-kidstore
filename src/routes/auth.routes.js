// src/routes/auth.routes.js
import { Router } from 'express';
import {
    registerController,
    loginController,
    changePasswordController,
    updateUserController,
    resetPasswordController,
    checkAvailabilityController,
} from '../controllers/auth.controller.js';
import { requireUser } from '../lib/session.js';
import { rateLimit } from '../middlewares/rateLimit.middleware.js';

const router = Router();

const tooMany = 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
const loginLimit   = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: tooMany });
const accountLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: tooMany });

router.post('/auth/check-availability', accountLimit, checkAvailabilityController);
router.post('/auth/register',           accountLimit, registerController);
router.post('/auth/login',              loginLimit,   loginController);
// Exigen el código de verificación del correo (ver resetPasswordController).
router.post('/auth/reset-password',     loginLimit,   resetPasswordController);
// Exigen sesión: el usuario sale del token, no del cuerpo de la petición.
router.post('/auth/change-password',    loginLimit,   requireUser, changePasswordController);
router.put('/auth/update-profile',      requireUser,  updateUserController);

export default router;
