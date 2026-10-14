// src/app.js
import express from 'express';
import cors    from 'cors';
import dotenv  from 'dotenv';
import { initDB } from './db.js';

import verificationRoutes from './routes/verification.routes.js';
import ordersRoutes       from './routes/orders.routes.js';
import authRoutes         from './routes/auth.routes.js';
import adminRoutes        from './routes/admin.routes.js';
import configRoutes       from './routes/config.routes.js';
import seasonRoutes       from './routes/season.routes.js';

dotenv.config();

const app = express();

// Railway pone un proxy delante: así req.ip es la IP real del cliente (límite de peticiones).
app.set('trust proxy', 1);

// El navegador solo llama al backend desde la web (kidstoreperu.com) o en desarrollo local.
// Los proxies del front (servidor a servidor) no envían Origin y no se ven afectados.
// CORS_ORIGINS (opcional) añade orígenes separados por comas.
const extraOrigins = (process.env.CORS_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);
const allowedOrigin = (origin) =>
    !origin ||
    /^https:\/\/(www\.)?kidstoreperu\.com$/.test(origin) ||
    /^https:\/\/[a-z0-9-]+\.up\.railway\.app$/.test(origin) ||
    /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$/.test(origin) ||
    extraOrigins.includes(origin);
app.use(cors({ origin: (origin, cb) => cb(null, allowedOrigin(origin)) }));
app.use(express.json({ limit: '200kb' }));

app.get('/health', (req, res) => res.status(200).json({ status: 'up' }));

app.use('/', verificationRoutes);
app.use('/', ordersRoutes);
app.use('/', authRoutes);
app.use('/', adminRoutes);
app.use('/', configRoutes);
app.use('/', seasonRoutes);

// Ruta inexistente: JSON (como el resto de la API) en vez de la página HTML de Express.
app.use((req, res) => res.status(404).json({ success: false, error: 'Ruta no encontrada.' }));

// JSON mal formado u otros errores no controlados: respuesta JSON en vez de la página de Express.
app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    const status = err.type === 'entity.parse.failed' ? 400 : err.status || 500;
    if (status >= 500) console.error('❌ Error no controlado:', err.message);
    res.status(status).json({ success: false, error: status === 400 ? 'Solicitud no válida.' : 'Error interno del servidor.' });
});

const PORT = process.env.PORT || 3001;

initDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('❌ No se pudo conectar a la BD:', err.message);
        process.exit(1);
    });
