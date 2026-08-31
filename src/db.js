// src/db.js
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

export const initDB = async () => {
    const client = await pool.connect();
    try {
        await client.query(`
            -- Tabla de usuarios normales
            CREATE TABLE IF NOT EXISTS users (
                id          SERIAL PRIMARY KEY,
                username    VARCHAR(50)  UNIQUE NOT NULL,
                email       VARCHAR(255) UNIQUE NOT NULL,
                password    VARCHAR(255) NOT NULL,
                phone       VARCHAR(30)  DEFAULT NULL,
                verified    BOOLEAN DEFAULT TRUE,
                created_at  TIMESTAMP DEFAULT NOW()
            );

            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'users' AND column_name = 'phone'
                ) THEN
                    ALTER TABLE users ADD COLUMN phone VARCHAR(30) DEFAULT NULL;
                END IF;
            END $$;

            -- Tabla de administradores
            CREATE TABLE IF NOT EXISTS admins (
                id         SERIAL PRIMARY KEY,
                email      VARCHAR(255) UNIQUE NOT NULL,
                password   VARCHAR(255) NOT NULL,
                username   VARCHAR(100) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );

            -- Pedidos
            CREATE TABLE IF NOT EXISTS orders (
                id             SERIAL PRIMARY KEY,
                order_id       INTEGER      NOT NULL,
                user_email     VARCHAR(255) NOT NULL,
                total          NUMERIC(10,2) NOT NULL,
                currency       VARCHAR(5)   NOT NULL DEFAULT 'PEN',
                payment_method VARCHAR(50)  NOT NULL,
                status         VARCHAR(30)  NOT NULL DEFAULT 'pending',
                form_data      JSONB,
                created_at     TIMESTAMP DEFAULT NOW(),
                updated_at     TIMESTAMP DEFAULT NOW()
            );

            -- Añadir updated_at si la tabla ya existe sin esa columna
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'orders' AND column_name = 'updated_at'
                ) THEN
                    ALTER TABLE orders ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
                END IF;
            END $$;

            -- Items de pedidos
            CREATE TABLE IF NOT EXISTS order_items (
                id          SERIAL PRIMARY KEY,
                order_id    INTEGER      NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                product_id  VARCHAR(100) NOT NULL,
                name        VARCHAR(255) NOT NULL,
                price       NUMERIC(10,2) NOT NULL,
                quantity    INTEGER NOT NULL,
                image       TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_orders_user_email ON orders(user_email);
            CREATE INDEX IF NOT EXISTS idx_orders_order_id   ON orders(order_id);
            CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);
        `);
        console.log('✅ Base de datos inicializada correctamente');
    } catch (err) {
        console.error('❌ Error inicializando la BD:', err.message);
        throw err;
    } finally {
        client.release();
    }
};

export default pool;