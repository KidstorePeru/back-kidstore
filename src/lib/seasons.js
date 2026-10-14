// src/lib/seasons.js
// Calendario de temporadas de la tienda (decoraciones de la web). Para agregar Navidad u otra
// fecha basta con sumar una entrada aquí (y su CSS y adornos en el front).
//
// Las fechas son de Lima (UTC-5 todo el año: Perú no cambia de hora). `end` es el último día
// incluido: la temporada termina a las 00:00 del día siguiente.
export const LIMA_OFFSET_MS = 5 * 60 * 60 * 1000;

export const SEASONS = [
    { id: 'halloween', start: { month: 10, day: 15 }, end: { month: 11, day: 1 } },
];

export const MODES = ['auto', 'on', 'off'];

// Medianoche de Lima de una fecha (mes 1-12) como instante UTC.
const limaMidnight = (year, month, day) => Date.UTC(year, month - 1, day) + LIMA_OFFSET_MS;

// Año calendario en Lima de un instante.
const limaYear = (ms) => new Date(ms - LIMA_OFFSET_MS).getUTCFullYear();

/** Ocurrencia de una temporada en un año: { id, start, end } (ms UTC; end exclusivo). */
export function occurrence(season, year) {
    const start = limaMidnight(year, season.start.month, season.start.day);
    // Una temporada que cruza el año (p. ej. Navidad → Año Nuevo) termina al año siguiente.
    const endYear = (season.end.month < season.start.month) ? year + 1 : year;
    const end = limaMidnight(endYear, season.end.month, season.end.day) + 24 * 60 * 60 * 1000;
    return { id: season.id, start, end };
}

/** Temporada activa por fechas en `now`, o null. */
export function activeOccurrence(now, seasons = SEASONS) {
    const y = limaYear(now);
    for (const s of seasons) {
        for (const year of [y - 1, y]) {
            const o = occurrence(s, year);
            if (now >= o.start && now < o.end) return o;
        }
    }
    return null;
}

/** La temporada activa o, si no hay, la próxima que empieza. */
export function currentOrNextOccurrence(now, seasons = SEASONS) {
    const active = activeOccurrence(now, seasons);
    if (active) return active;
    const y = limaYear(now);
    let best = null;
    for (const s of seasons) {
        for (const year of [y, y + 1]) {
            const o = occurrence(s, year);
            if (o.start > now && (!best || o.start < best.start)) best = o;
        }
    }
    return best;
}

/**
 * Modo elegido en el panel para guardar: Encendida / Apagada valen hasta el final de la
 * temporada activa (o de la próxima, si se elige antes de que empiece) y luego vuelve sola a
 * Automática.
 */
export function buildOverride(mode, now, seasons = SEASONS) {
    if (mode === 'auto') return null;
    const target = currentOrNextOccurrence(now, seasons);
    if (!target) return null;
    return { mode, season: target.id, setAt: now, until: target.end };
}

/**
 * Qué temporada se ve en `now`.
 * override: { mode: 'on'|'off', season, setAt, until } (ms) o null.
 * Devuelve { season: id|null, mode, source, until, occurrence } — `until` es hasta cuándo dura
 * lo que se ve ahora (fin de la temporada o del modo manual), null si no hay nada programado.
 */
export function resolveSeason(now, override, seasons = SEASONS) {
    const valid = override && MODES.includes(override.mode) && override.mode !== 'auto'
        && Number.isFinite(override.until) && now < override.until;
    const next = currentOrNextOccurrence(now, seasons);
    if (valid) {
        return {
            season: override.mode === 'on' ? override.season : null,
            mode: override.mode,
            source: 'panel',
            until: override.until,
            occurrence: next,
        };
    }
    const active = activeOccurrence(now, seasons);
    return {
        season: active ? active.id : null,
        mode: 'auto',
        source: 'calendar',
        until: active ? active.end : (next ? next.start : null),
        occurrence: next,
    };
}
