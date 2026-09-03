// src/routes/auth.routes.js
import { Router } from 'express';
import {
    registerController,
    loginController,
    changePasswordController,
    updateUserController,
    resetPasswordController,
    checkAvailabilityController
} from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/auth/check-availability', checkAvailabilityController);
router.post('/auth/register', registerController);
router.post('/auth/login', loginController);
router.post('/auth/change-password', authenticate, changePasswordController);
router.put('/auth/update-profile', authenticate, updateUserController);
router.post('/auth/reset-password', authenticate, resetPasswordController);

export default router;
