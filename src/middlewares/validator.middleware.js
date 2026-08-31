// src/middlewares/validator.middleware.js
import Joi from 'joi';

const receiptSchema = Joi.object({
    email:        Joi.string().email().required(),
    customerName: Joi.string().min(2).required(),
    orderId:      Joi.alternatives().try(Joi.string(), Joi.number()).required(),
    total:        Joi.number().positive().required(),
    items: Joi.array().items(
        Joi.object({
            id:       Joi.string().allow('').optional(),
            name:     Joi.string().required(),
            price:    Joi.number().min(0).required(),
            quantity: Joi.number().integer().min(1).required(),
            image:    Joi.string().allow('').optional(),
        })
    ).min(1).required(),
    paymentMethod: Joi.string().optional().allow(''),
    formData:      Joi.object().optional(),
    currency:      Joi.string().valid('PEN', 'USD', 'EUR').optional(),
});

export const validateReceipt = (req, res, next) => {
    const { error } = receiptSchema.validate(req.body, { allowUnknown: true });
    if (error) {
        return res.status(400).json({ success: false, error: error.details[0].message });
    }
    next();
};