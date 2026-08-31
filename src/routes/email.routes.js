// src/routes/email.routes.js
import { Router } from 'express';
import { sendReceiptController } from '../controllers/email.controller.js';
import { validateReceipt } from '../middlewares/validator.middleware.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

// authenticate lee x-api-key del header y lo compara con INTERNAL_API_KEY en .env
router.post('/send-receipt', authenticate, validateReceipt, sendReceiptController);

export default router;