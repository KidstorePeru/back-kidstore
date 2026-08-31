// src/routes/verification.routes.js
import { Router } from 'express';
import { sendVerificationController, verifyCodeController } from '../controllers/verification.controller.js';
import { validateVerificationRequest } from '../middlewares/verificationValidator.middleware.js';

const router = Router();

// Envía el código OTP al email del usuario
router.post('/send-verification', validateVerificationRequest, sendVerificationController);

// Verifica el código OTP ingresado por el usuario
router.post('/verify-code', verifyCodeController);

export default router;