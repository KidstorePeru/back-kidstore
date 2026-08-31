// src/app.js
import express from 'express';
import cors    from 'cors';
import dotenv  from 'dotenv';
import { initDB }            from './db.js';
import { seedAdminIfNeeded } from './controllers/admin.controller.js';

import emailRoutes        from './routes/email.routes.js';
import verificationRoutes from './routes/verification.routes.js';
import ordersRoutes       from './routes/orders.routes.js';
import authRoutes         from './routes/auth.routes.js';
import adminRoutes        from './routes/admin.routes.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.status(200).json({ status: 'up' }));

app.use('/', emailRoutes);
app.use('/', verificationRoutes);
app.use('/', ordersRoutes);
app.use('/', authRoutes);
app.use('/', adminRoutes);

const PORT = process.env.PORT || 3001;

initDB()
    .then(async () => {
        await seedAdminIfNeeded(); // Crea admin desde .env si no existe
        app.listen(PORT, () => {
            console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
        });
    })
    .catch(err => {
        console.error('❌ No se pudo conectar a la BD:', err.message);
        process.exit(1);
    });