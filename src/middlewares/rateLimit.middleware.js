// src/middlewares/rateLimit.middleware.js
// Límite de peticiones por IP (en memoria) para frenar fuerza bruta en login, códigos de
// verificación y creación de cuentas. Suficiente para una sola instancia en Railway.
export const rateLimit = ({ windowMs, max, message }) => {
    const hits = new Map(); // ip -> { count, resetAt }
    return (req, res, next) => {
        const now = Date.now();
        const ip = req.ip || req.socket?.remoteAddress || 'unknown';
        let entry = hits.get(ip);
        if (!entry || entry.resetAt <= now) {
            entry = { count: 0, resetAt: now + windowMs };
            hits.set(ip, entry);
        }
        entry.count += 1;
        if (hits.size > 10_000) {
            for (const [key, value] of hits) if (value.resetAt <= now) hits.delete(key);
        }
        if (entry.count > max) {
            res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
            return res.status(429).json({ success: false, error: message });
        }
        next();
    };
};
