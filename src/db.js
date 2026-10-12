// src/db.js
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Railway exige SSL. PGSSLMODE=disable solo para una base de datos local de desarrollo.
    ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
});

// Si la base de datos cierra una conexión inactiva del pool (Railway lo hace), pg emite 'error'.
// Sin este manejador Node lo trata como error no capturado y el backend se cae.
pool.on('error', (err) => {
    console.error('⚠️ Conexión inactiva de la BD cerrada:', err.message);
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

            -- Nombre completo para "Datos de compra" (autorelleno del checkout).
            -- El username es solo un alias; el nombre real va aparte.
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'users' AND column_name = 'full_name'
                ) THEN
                    ALTER TABLE users ADD COLUMN full_name VARCHAR(120) DEFAULT NULL;
                END IF;
            END $$;

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

            -- Idioma del cliente (ES / EN) para los correos de cambio de estado.
            ALTER TABLE orders ADD COLUMN IF NOT EXISTS lang VARCHAR(2) DEFAULT 'ES';

            -- Migración anti-duplicados: si aún no existe la restricción única,
            -- borrar los pedidos duplicados (mismo email + order_id, se conserva
            -- el más antiguo — order_items cae en cascada) y añadir la restricción.
            -- Sin esto, el ON CONFLICT del INSERT de pedidos nunca se dispara y
            -- cada reintento del checkout crea una fila nueva.
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'orders_user_email_order_id_key'
                ) THEN
                    DELETE FROM orders a
                        USING orders b
                        WHERE a.id > b.id
                          AND a.user_email = b.user_email
                          AND a.order_id  = b.order_id;
                    ALTER TABLE orders
                        ADD CONSTRAINT orders_user_email_order_id_key UNIQUE (user_email, order_id);
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

            -- Configuración de la tienda: visibilidad de juegos / pestañas /
            -- productos gestionada desde el panel de admin (clave → booleano).
            CREATE TABLE IF NOT EXISTS site_config (
                key        VARCHAR(160) PRIMARY KEY,
                value      JSONB       NOT NULL,
                updated_at TIMESTAMP   DEFAULT NOW()
            );
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