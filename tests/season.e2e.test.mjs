// Prueba de extremo a extremo de la temporada contra un servidor en marcha (con base de datos).
// Se salta si no se indica el servidor:  SEASON_E2E_URL=http://localhost:3001 ADMIN_KEY=... npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.SEASON_E2E_URL;
const ADMIN = process.env.ADMIN_KEY;
const skip = !BASE || !ADMIN ? 'sin SEASON_E2E_URL / ADMIN_KEY' : false;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const call = async (method, path, body, admin = false) => {
    const r = await fetch(BASE + path, {
        method,
        headers: { 'Content-Type': 'application/json', ...(admin ? { 'x-admin-key': ADMIN } : {}) },
        body: body ? JSON.stringify(body) : undefined,
    });
    return { status: r.status, json: await r.json().catch(() => null) };
};

// Lo que se guarda aparte (registro de auditoría) se lee con espera y reintentos, para no fallar
// por una carrera de tiempos.
async function eventually(check, { tries = 10, wait = 500 } = {}) {
    let last;
    for (let i = 0; i < tries; i++) {
        last = await check();
        if (last.ok) return last.value;
        await sleep(wait);
    }
    throw new Error(`no se cumplió tras ${tries} intentos: ${JSON.stringify(last?.value)}`);
}

test('GET /season es público y responde la temporada', { skip }, async () => {
    const r = await call('GET', '/season');
    assert.equal(r.status, 200);
    assert.ok('season' in r.json && ['auto', 'on', 'off'].includes(r.json.mode));
});

test('el panel exige la clave de admin', { skip }, async () => {
    assert.equal((await call('GET', '/admin/season')).status, 401);
    assert.equal((await call('PUT', '/admin/season', { mode: 'on' })).status, 401);
    assert.equal((await call('PUT', '/admin/season', { mode: 'nada' }, true)).status, 400);
});

test('Encendida / Apagada / Automática cambian lo público y quedan en la auditoría', { skip }, async () => {
    for (const mode of ['on', 'off', 'auto']) {
        const r = await call('PUT', '/admin/season', { mode }, true);
        assert.equal(r.status, 200);
        assert.equal(r.json.mode, mode);
        if (mode !== 'auto') assert.ok(r.json.override?.until, 'el modo manual informa hasta cuándo dura');
        const pub = await call('GET', '/season');
        assert.equal(pub.json.mode, mode);
        if (mode === 'on') assert.equal(pub.json.season, 'halloween');
        if (mode === 'off') assert.equal(pub.json.season, null);
        await eventually(async () => {
            const a = await call('GET', '/admin/season', null, true);
            const last = a.json?.history?.[0];
            return { ok: last?.action === 'season.mode' && last.detail?.mode === mode, value: last };
        });
    }
});
