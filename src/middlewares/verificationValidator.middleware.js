// src/middlewares/verificationValidator.middleware.js
import Joi from 'joi';

const verificationSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Debe ser un email válido.',
        'any.required': 'El email es requerido.',
    }),
    username: Joi.string().alphanum().min(3).max(30).required().messages({
        'string.alphanum': 'El usuario solo puede tener letras y números.',
        'string.min': 'El usuario debe tener al menos 3 caracteres.',
        'any.required': 'El usuario es requerido.',
    }),
});

export const validateVerificationRequest = (req, res, next) => {
    const { error } = verificationSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ success: false, error: error.details[0].message });
    }
    next();
};