// Pruebas del calendario de temporadas y de los modos del panel (sin base de datos).
// Ejecutar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildOverride, resolveSeason, activeOccurrence, occurrence, SEASONS } from '../src/lib/seasons.js';

// Instante a partir de una hora de Lima (UTC-5): lima(2026, 11, 1, 23, 59).
const lima = (y, mo, d, h = 0, mi = 0, s = 0) => Date.UTC(y, mo - 1, d, h + 5, mi, s);
const H = 60 * 60 * 1000;

test('Halloween empieza el 15 de octubre a las 00:00 de Lima', () => {
    assert.equal(resolveSeason(lima(2026, 10, 14, 23, 59, 59), null).season, null);
    assert.equal(resolveSeason(lima(2026, 10, 15, 0, 0, 0), null).season, 'halloween');
});

test('el 1 de noviembre a las 23:59 sigue siendo Halloween; el 2 a las 00:00 ya no', () => {
    assert.equal(resolveSeason(lima(2026, 11, 1, 23, 59, 59), null).season, 'halloween');
    assert.equal(resolveSeason(lima(2026, 11, 2, 0, 0, 0), null).season, null);
});

test('la hora de Lima manda, no la UTC (2 de noviembre 03:00 UTC = 1 de noviembre 22:00 en Lima)', () => {
    assert.equal(resolveSeason(Date.UTC(2026, 10, 2, 3, 0), null).season, 'halloween');
    assert.equal(resolveSeason(Date.UTC(2026, 9, 15, 3, 0), null).season, null); // 14 oct 22:00 Lima
});

test('fuera de temporada (enero, julio) no hay temporada y se informa la próxima', () => {
    for (const t of [lima(2026, 1, 10), lima(2026, 7, 1), lima(2026, 12, 25)]) {
        const r = resolveSeason(t, null);
        assert.equal(r.season, null);
        assert.equal(r.mode, 'auto');
        assert.equal(r.occurrence.id, 'halloween');
        assert.ok(r.occurrence.start > t);
    }
    assert.equal(resolveSeason(lima(2026, 12, 25), null).occurrence.start, lima(2027, 10, 15));
});

test('la temporada se repite cada año', () => {
    assert.equal(resolveSeason(lima(2027, 10, 20), null).season, 'halloween');
    assert.equal(occurrence(SEASONS[0], 2030).start, lima(2030, 10, 15));
    assert.equal(occurrence(SEASONS[0], 2030).end, lima(2030, 11, 2));
});

test('Automática: until = fin de la temporada (dentro) o inicio de la próxima (fuera)', () => {
    assert.equal(resolveSeason(lima(2026, 10, 20), null).until, lima(2026, 11, 2));
    assert.equal(resolveSeason(lima(2026, 9, 1), null).until, lima(2026, 10, 15));
});

test('Encendida antes de las fechas: se ve desde ya y dura hasta el fin de esa temporada', () => {
    const setAt = lima(2026, 10, 10, 12);
    const o = buildOverride('on', setAt);
    assert.deepEqual(o, { mode: 'on', season: 'halloween', setAt, until: lima(2026, 11, 2) });
    assert.equal(resolveSeason(setAt + H, o).season, 'halloween');
    assert.equal(resolveSeason(setAt + H, o).source, 'panel');
    assert.equal(resolveSeason(lima(2026, 11, 1, 23, 59), o).season, 'halloween');
});

test('Encendida vence sola: al terminar la temporada vuelve a Automática', () => {
    const o = buildOverride('on', lima(2026, 10, 10));
    const r = resolveSeason(lima(2026, 11, 2), o);
    assert.equal(r.mode, 'auto');
    assert.equal(r.season, null);
    assert.equal(resolveSeason(lima(2027, 10, 20), o).source, 'calendar'); // el año siguiente, por fechas
});

test('Apagada durante la temporada: no se ve hasta el fin de esa temporada', () => {
    const o = buildOverride('off', lima(2026, 10, 20));
    assert.equal(o.until, lima(2026, 11, 2));
    assert.equal(resolveSeason(lima(2026, 10, 25), o).season, null);
    assert.equal(resolveSeason(lima(2026, 10, 25), o).mode, 'off');
});

test('Apagada vence sola: el año siguiente Halloween vuelve por fechas', () => {
    const o = buildOverride('off', lima(2026, 10, 20));
    assert.equal(resolveSeason(lima(2026, 11, 2), o).mode, 'auto');
    assert.equal(resolveSeason(lima(2027, 10, 15), o).season, 'halloween');
});

test('Apagada elegida antes de las fechas cubre la próxima temporada completa', () => {
    const o = buildOverride('off', lima(2026, 10, 1));
    assert.equal(o.until, lima(2026, 11, 2));
    assert.equal(resolveSeason(lima(2026, 10, 15), o).season, null);
});

test('Automática no guarda nada; un modo desconocido o vencido se ignora', () => {
    assert.equal(buildOverride('auto', lima(2026, 10, 20)), null);
    assert.equal(resolveSeason(lima(2026, 10, 20), { mode: 'raro', season: 'x', until: lima(2030, 1, 1) }).source, 'calendar');
    assert.equal(resolveSeason(lima(2026, 10, 20), { mode: 'off', season: 'halloween', until: lima(2026, 10, 19) }).season, 'halloween');
});

test('activeOccurrence es null fuera de las fechas', () => {
    assert.equal(activeOccurrence(lima(2026, 3, 3)), null);
});
