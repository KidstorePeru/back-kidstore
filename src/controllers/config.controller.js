// src/controllers/config.controller.js
import pool from '../db.js';

const KEY_RE = /^[a-z0-9:_-]{3,160}$/;

/* ══════════════════════════════════════════
   GET /site-config  → overrides de visibilidad
   Público (protegido por x-api-key). Devuelve
   solo las claves que el admin ha tocado.
══════════════════════════════════════════ */
export const getSiteConfigController = async (req, res) => {
  try {
    const result = await pool.query('SELECT key, value FROM site_config');
    const config = {};
    for (const row of result.rows) config[row.key] = row.value;
    res.status(200).json({ success: true, config });
  } catch (err) {
    console.error('❌ Error obteniendo site_config:', err.message);
    res.status(500).json({ success: false, error: 'Error al obtener la configuración.' });
  }
};

/* ══════════════════════════════════════════
   PUT /admin/site-config
   body: { key, value:boolean }  ó  { config: { [key]: boolean } }
   Upsert. Devuelve el config completo.
══════════════════════════════════════════ */
export const updateSiteConfigController = async (req, res) => {
  const { key, value, config } = req.body || {};

  // Normalizar a una lista de pares [key, value]
  let entries;
  if (config && typeof config === 'object') {
    entries = Object.entries(config);
  } else if (typeof key === 'string') {
    entries = [[key, value]];
  } else {
    return res.status(400).json({ success: false, error: 'Se requiere { key, value } o { config }.' });
  }

  for (const [k, v] of entries) {
    if (!KEY_RE.test(k)) {
      return res.status(400).json({ success: false, error: `Clave inválida: "${k}".` });
    }
    if (typeof v !== 'boolean') {
      return res.status(400).json({ success: false, error: `El valor de "${k}" debe ser booleano.` });
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [k, v] of entries) {
      await client.query(
        `INSERT INTO site_config (key, value)
         VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
        [k, JSON.stringify(v)]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error guardando site_config:', err.message);
    client.release();
    return res.status(500).json({ success: false, error: 'Error al guardar la configuración.' });
  }

  try {
    const result = await client.query('SELECT key, value FROM site_config');
    const merged = {};
    for (const row of result.rows) merged[row.key] = row.value;
    res.status(200).json({ success: true, config: merged });
  } catch (err) {
    console.error('❌ Error releyendo site_config:', err.message);
    res.status(200).json({ success: true, config: Object.fromEntries(entries) });
  } finally {
    client.release();
  }
};
