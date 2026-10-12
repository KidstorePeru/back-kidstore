// src/routes/verification.routes.js
import { Router } from 'express';
import { sendVerificationController, verifyCodeController } from '../controllers/verification.controller.js';
import { validateVerificationRequest } from '../middlewares/verificationValidator.middleware.js';
import { rateLimit } from '../middlewares/rateLimit.middleware.js';

const router = Router();

const tooMany = 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';

// Envía el código OTP al correo
router.post(
    '/send-verification',
    rateLimit({ windowMs: 15 * 60 * 1000, max: 8, message: tooMany }),
    validateVerificationRequest,
    sendVerificationController,
);

// Verifica el código OTP (además, cada código admite pocos intentos)
router.post('/verify-code', rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: tooMany }), verifyCodeController);

export default router;
