// src/middlewares/adminAuth.middleware.js
// Middleware separado del de usuario para las rutas /admin/*
// Verifica el header x-admin-auth: "true"
// En producción podrías usar un token JWT firmado; aquí usamos
// un flag de sesión validado contra la contraseña ya verificada en /admin/login.

export const authenticate = (req, res, next) => {
  const header = req.headers['x-admin-auth'];

  if (header !== 'true') {
    return res.status(401).json({ success: false, error: 'Acceso no autorizado al panel de administración.' });
  }

  next();
};