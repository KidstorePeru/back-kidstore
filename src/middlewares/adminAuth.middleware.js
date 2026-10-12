// src/middlewares/adminAuth.middleware.js
// Rutas /admin/*: exigen el header x-admin-key igual a ADMIN_SESSION_TOKEN. Solo lo envían los
// proxies del front (servidor), después de comprobar la cookie de sesión del administrador.
// Sin la variable configurada se deniega todo (nunca hay una clave por defecto).
import crypto from 'node:crypto';

export const requireAdmin = (req, res, next) => {
    const expected = process.env.ADMIN_SESSION_TOKEN || '';
    const given = String(req.headers['x-admin-key'] || '');
    const ok =
        expected.length > 0 &&
        given.length === expected.length &&
        crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
    if (!ok) return res.status(401).json({ success: false, error: 'No autorizado.' });
    next();
};
