// src/middlewares/verificationValidator.middleware.js
import Joi from 'joi';

const verificationSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Debe ser un email válido.',
        'any.required': 'El email es requerido.',
    }),
    // Solo se usa para saludar en el correo — no es crítico ni identifica a nadie.
    username: Joi.string().min(1).max(50).optional().allow('', null),
    lang: Joi.string().valid('ES', 'EN', 'es', 'en').optional(),
    // Ajusta el texto del correo: registro / recuperación / cambio de correo.
    purpose: Joi.string().valid('register', 'reset', 'email-change').optional(),
});

export const validateVerificationRequest = (req, res, next) => {
    const { error } = verificationSchema.validate(req.body, { allowUnknown: true });
    if (error) {
        return res.status(400).json({ success: false, error: error.details[0].message });
    }
    next();
};
