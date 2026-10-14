// src/controllers/season.controller.js
// Temporada de la web (Halloween, y en el futuro Navidad u otras fechas).
// GET  /season             público: qué temporada se ve ahora (la web decide con esto).
// GET  /admin/season       panel: estado, calendario y últimos cambios.
// PUT  /admin/season       panel: { mode: 'auto' | 'on' | 'off' }.
import pool from '../db.js';
import { MODES, SEASONS, buildOverride, occurrence, resolveSeason } from '../lib/seasons.js';

const iso = (ms) => (ms == null ? null : new Date(ms).toISOString());

// GET /season lo pide cada visita: el modo del panel se guarda en memoria unos segundos para no
// consultar la base de datos cada vez. Se invalida al cambiar el modo desde el panel.
const OVERRIDE_TTL_MS = 20_000;
let overrideCache = null; // { value, at }

async function cachedOverride() {
    if (overrideCache && Date.now() - overrideCache.at < OVERRIDE_TTL_MS) return overrideCache.value;
    const value = await readOverride();
    overrideCache = { value, at: Date.now() };
    return value;
}

async function readOverride(db = pool) {
    const r = await db.query('SELECT mode, season, set_at, until FROM season_override WHERE id = 1');
    const row = r.rows[0];
    if (!row) return null;
    return { mode: row.mode, season: row.season, setAt: new Date(row.set_at).getTime(), until: new Date(row.until).getTime() };
}

function publicState(state) {
    return {
        season: state.season,
        mode: state.mode,
        source: state.source,
        until: iso(state.until),
    };
}

export async function getSeasonState(now = Date.now(), { fresh = false } = {}) {
    const override = fresh ? await readOverride() : await cachedOverride();
    // Un modo manual vencido se borra (vuelve a Automática); si falla, se ignora igual al resolver.
    if (override && now >= override.until) {
        await pool.query('DELETE FROM season_override WHERE id = 1 AND until <= $1', [new Date(now)])
            .catch((err) => console.error('⚠️ No se pudo limpiar el modo de temporada vencido:', err.message));
        overrideCache = null;
    }
    return { override, state: resolveSeason(now, override) };
}

export const getSeasonController = async (req, res) => {
    try {
        const { state } = await getSeasonState();
        res.setHeader('Cache-Control', 'public, max-age=60');
        res.json({ success: true, ...publicState(state) });
    } catch (err) {
        console.error('❌ Error leyendo la temporada:', err.message);
        res.status(500).json({ success: false, error: 'No se pudo leer la temporada.' });
    }
};

async function adminPayload(now = Date.now()) {
    const { override, state } = await getSeasonState(now, { fresh: true });
    const y = new Date(now).getUTCFullYear();
    const calendar = SEASONS.map((s) => {
        const cur = occurrence(s, y);
        const o = now < cur.end ? cur : occurrence(s, y + 1);
        return { id: s.id, start: iso(o.start), end: iso(o.end) };
    });
    const audit = await pool.query(
        `SELECT id, action, detail, created_at FROM admin_audit
          WHERE action LIKE 'season.%' ORDER BY created_at DESC, id DESC LIMIT 10`,
    );
    return {
        success: true,
        ...publicState(state),
        override: override && now < override.until
            ? { mode: override.mode, season: override.season, setAt: iso(override.setAt), until: iso(override.until) }
            : null,
        target: state.occurrence ? { id: state.occurrence.id, start: iso(state.occurrence.start), end: iso(state.occurrence.end) } : null,
        calendar,
        history: audit.rows.map((r) => ({ id: r.id, action: r.action, detail: r.detail, at: new Date(r.created_at).toISOString() })),
    };
}

export const getAdminSeasonController = async (req, res) => {
    try {
        res.json(await adminPayload());
    } catch (err) {
        console.error('❌ Error leyendo la temporada (admin):', err.message);
        res.status(500).json({ success: false, error: 'No se pudo leer la temporada.' });
    }
};

export const updateSeasonController = async (req, res) => {
    const mode = req.body?.mode;
    if (!MODES.includes(mode)) {
        return res.status(400).json({ success: false, error: `Modo inválido. Valores: ${MODES.join(', ')}` });
    }
    const now = Date.now();
    const client = await pool.connect();
    let saved = false;
    try {
        await client.query('BEGIN');
        const before = await readOverride(client);
        const override = buildOverride(mode, now);
        if (override) {
            await client.query(
                `INSERT INTO season_override (id, mode, season, set_at, until)
                 VALUES (1, $1, $2, $3, $4)
                 ON CONFLICT (id) DO UPDATE SET mode = $1, season = $2, set_at = $3, until = $4`,
                [override.mode, override.season, new Date(override.setAt), new Date(override.until)],
            );
        } else {
            await client.query('DELETE FROM season_override WHERE id = 1');
        }
        await client.query(
            'INSERT INTO admin_audit (action, detail) VALUES ($1, $2)',
            ['season.mode', JSON.stringify({
                mode,
                previous: before && now < before.until ? before.mode : 'auto',
                season: override?.season ?? null,
                until: iso(override?.until ?? null),
                ip: req.ip ?? null,
            })],
        );
        await client.query('COMMIT');
        overrideCache = null;
        saved = true;
        console.log(`🎃 Temporada: modo "${mode}"${override ? ` (${override.season}, hasta ${iso(override.until)})` : ''}`);
    } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('❌ Error guardando la temporada:', err.message);
    } finally {
        client.release();
    }
    if (!saved) return res.status(500).json({ success: false, error: 'No se pudo guardar la temporada.' });
    try {
        res.json(await adminPayload(now));
    } catch (err) {
        console.error('❌ Error releyendo la temporada:', err.message);
        res.status(500).json({ success: false, error: 'Se guardó, pero no se pudo releer la temporada.' });
    }
};
