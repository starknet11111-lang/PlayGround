import { TILE as TILE_UNIT } from './physics.js';

// Level definitions. Geometry is declared as rectangles so every frame can be
// validated against the real physics before shipping.
//
// rect: [x, y, w, h] in tiles
// solid  -> always solid
// a / b  -> solid only in phase A / phase B
// spikes -> [x, y, char]  (^ v < >)
// saws   -> { x, y, r, ax, ay, bx, by, speed, phase }  (tile coords, oscillates)
// lasers -> { x, y, dir, len, period, offset, duty }
// ads    -> [x, y] billboard anchor (decorative + clickable)
// checks -> [x, y] checkpoint anchor

const D = {
  1: { key: 'parallax', name: 'PARALLAX', sub: 'PHASE GEOMETRY' },
  2: { key: 'gravitas', name: 'GRAVITAS', sub: 'INVERTED FLOORS' },
  3: { key: 'thorns', name: 'THORNS', sub: 'LETHAL DECOR' },
  4: { key: 'collapse', name: 'COLLAPSE', sub: 'UNSTABLE MATERIAL' },
  5: { key: 'selene', name: 'SELENE', sub: 'THE MOON' },
};

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
const r = (x, y, w, h = 1) => [x, y, w, h];
const sp = (x, y, ch = '^') => [x, y, ch];

const levels = [];
function add(def) {
  levels.push({
    id: levels.length + 1,
    w: def.w || 30,
    h: def.h || 16,
    solid: [],
    a: [],
    b: [],
    crumble: [],
    blink: [],
    spikes: [],
    saws: [],
    lasers: [],
    ads: [],
    checks: [],
    flip: false,
    glitch: false,
    ...def,
    district: D[def.d || 1],
  });
}

// ===========================================================================
// 1 — PARALLAX (phase A/B)
// ===========================================================================
add({
  d: 1, name: 'FIRST REFLECTION', par: 18,
  spawn: [2, 13], goal: [25, 3],
  hint: 'Move with A/D. Jump with SPACE. Hold jump to go higher.',
  solid: [
    r(1, 14, 28), r(6, 12, 3), r(10, 10, 3), r(14, 8, 3), r(18, 6, 3), r(22, 4, 4),
  ],
  ads: [[8, 9], [20, 3]],
});

add({
  d: 1, name: 'GHOST STEP', par: 22,
  spawn: [2, 13], goal: [25, 13],
  hint: 'F shifts phase. Amber exists in A, cyan exists in B. Jump, then shift.',
  solid: [r(1, 14, 7), r(23, 14, 6)],
  a: [r(8, 12, 3), r(16, 12, 3)],
  b: [r(12, 10, 3), r(20, 10, 3)],
  ads: [[13, 8], [24, 11]],
});

add({
  d: 1, name: 'NEGATIVE SPACE', par: 24,
  spawn: [2, 13], goal: [25, 13],
  hint: 'The floor is a suggestion. The spikes are not.',
  solid: [r(1, 14, 5), r(25, 14, 4)],
  a: [r(7, 12, 3), r(15, 11, 3), r(20, 9, 3)],
  b: [r(11, 10, 3), r(18, 12, 3), r(23, 11, 3)],
  spikes: [sp(6, 13), sp(7, 13), sp(8, 13), sp(9, 13), sp(10, 13), sp(11, 13), sp(12, 13), sp(13, 13), sp(14, 13), sp(15, 13), sp(16, 13), sp(17, 13), sp(18, 13), sp(19, 13), sp(20, 13), sp(21, 13), sp(22, 13), sp(23, 13), sp(24, 13)],
  ads: [[9, 9], [18, 7]],
});

add({
  d: 1, name: 'THE OTHER HAND', par: 26,
  spawn: [2, 13], goal: [27, 3],
  hint: 'You cannot shift into a wall. You can shift into a fall.',
  solid: [r(1, 14, 6), r(25, 4, 4)],
  a: [r(7, 12, 3), r(15, 8, 3), r(23, 4, 3)],
  b: [r(11, 10, 3), r(19, 6, 3)],
  spikes: [sp(8, 13), sp(9, 13), sp(10, 13), sp(11, 13), sp(12, 13), sp(13, 13), sp(14, 13), sp(15, 13), sp(16, 13), sp(17, 13), sp(18, 13), sp(19, 13), sp(20, 13), sp(21, 13), sp(22, 13), sp(23, 13), sp(24, 13)],
  checks: [[6, 13]],
  ads: [[13, 7], [21, 3]],
});

add({
  d: 1, name: 'HALF-LIGHT', par: 24,
  spawn: [2, 13], goal: [26, 3],
  hint: 'Small tiles. Smaller margins. The saw does not care.',
  solid: [r(1, 14, 5), r(25, 4, 4)],
  a: [r(6, 12, 2), r(13, 10, 2), r(19, 8, 2)],
  b: [r(9, 11, 2), r(16, 9, 2), r(22, 6, 2)],
  saws: [{ x: 11, y: 13.4, r: 13, ax: 8, ay: 13.4, bx: 14, by: 13.4, speed: 0.5 }],
  spikes: [sp(22, 13), sp(23, 13)],
  ads: [[15, 7]],
});

add({
  d: 1, name: 'MIRROR MAZE', par: 28,
  spawn: [2, 13], goal: [26, 13],
  hint: 'Amber walls are lies in phase B. Cyan walls are lies in A.',
  solid: [r(1, 14, 28)],
  a: [r(9, 8, 1, 6), r(17, 8, 1, 6), r(25, 8, 1, 6)],
  b: [r(13, 8, 1, 6), r(21, 8, 1, 6)],
  checks: [[7, 13]],
  ads: [[11, 6], [23, 6]],
});

add({
  d: 1, name: 'PARALLAX', par: 34,
  spawn: [2, 13], goal: [26, 2],
  hint: 'Everything you have learned, stacked vertically.',
  solid: [r(1, 14, 5), r(26, 3, 3)],
  a: [r(7, 12, 3), r(14, 10, 3), r(21, 8, 3), r(25, 6, 2)],
  b: [r(10, 13, 3), r(17, 11, 3), r(23, 9, 2), r(27, 4, 2)],
  saws: [
    { x: 12, y: 14, r: 12, ax: 10, ay: 14, bx: 14, by: 14, speed: 0.7 },
    { x: 23, y: 12, r: 11, ax: 22, ay: 12, bx: 24, by: 12, speed: 0.9, phase: 2 },
  ],
  spikes: [sp(23, 13), sp(24, 13)],
  checks: [[6, 13]],
  ads: [[12, 9], [22, 5]],
});

// ===========================================================================
// 2 — GRAVITAS (gravity inversion)
// ===========================================================================
add({
  d: 2, name: 'UPSIDE', par: 20,
  spawn: [2, 13], goal: [28, 3],
  flip: true,
  hint: 'V inverts gravity. Your feet must be on something first.',
  solid: [
    r(1, 14, 8), r(16, 14, 7),
    r(17, 12, 4), r(20, 10, 4), r(23, 8, 4), r(25, 6, 3), r(27, 4, 3),
  ],
  spikes: [sp(9, 13), sp(10, 13), sp(11, 13), sp(12, 13), sp(13, 13), sp(14, 13), sp(15, 13)],
  ads: [[12, 7], [26, 5]],
});

add({
  d: 2, name: 'DROP ZONE', par: 22,
  spawn: [2, 2], goal: [25, 13],
  flip: true,
  hint: 'Down is a rumor. Up is a rumor with better lighting.',
  solid: [r(1, 0, 28), r(1, 4, 6), r(10, 4, 6), r(20, 8, 4), r(24, 12, 4), r(6, 8, 4)],
  spikes: [sp(14, 4, '^'), sp(15, 4, '^'), sp(16, 4, '^')],
  ads: [[12, 7], [22, 10]],
});

add({
  d: 2, name: 'INVERT', par: 30,
  spawn: [2, 13], goal: [26, 2],
  flip: true,
  hint: 'Gravity and geometry are both optional. Cobble them together.',
  solid: [r(1, 14, 6), r(24, 3, 4), r(8, 1, 6, 1), r(17, 13, 4, 1)],
  a: [r(8, 11, 3), r(15, 7, 3), r(21, 4, 3)],
  b: [r(12, 9, 3), r(19, 5, 3)],
  spikes: [sp(7, 13), sp(8, 13), sp(9, 13), sp(10, 13)],
  checks: [[5, 13]],
  ads: [[10, 8], [22, 3]],
});

add({
  d: 2, name: 'CEILING THORNS', par: 30,
  spawn: [2, 13], goal: [26, 3],
  flip: true,
  hint: 'The ceiling bites. Flip back before you find out.',
  solid: [
    r(1, 14, 6), r(7, 12, 3), r(11, 10, 3), r(15, 8, 3),
    r(19, 7, 3), r(23, 5, 3), r(26, 4, 3),
  ],
  spikes: [
    sp(8, 1, 'v'), sp(9, 1, 'v'), sp(14, 1, 'v'), sp(15, 1, 'v'), sp(16, 1, 'v'), sp(21, 1, 'v'), sp(22, 1, 'v'),
  ],
  saws: [{ x: 20, y: 12, r: 12, ax: 18, ay: 12, bx: 22, by: 12, speed: 0.8 }],
  checks: [[13, 9]],
  ads: [[18, 9]],
});

add({
  d: 2, name: 'PENDULUM', par: 32,
  spawn: [2, 13], goal: [25, 2],
  flip: true,
  hint: 'Flip, fall, land, flip again. Do not think about it.',
  solid: [r(1, 14, 6), r(24, 3, 5)],
  a: [r(8, 12, 4), r(16, 8, 4), r(22, 4, 4)],
  b: [r(12, 10, 4), r(20, 6, 4)],
  spikes: [sp(7, 13), sp(8, 13), sp(9, 13), sp(10, 13), sp(11, 13), sp(12, 13), sp(13, 13), sp(14, 13)],
  checks: [[5, 13]],
  ads: [[14, 7], [23, 3]],
});

add({
  d: 2, name: 'FROG LEVEL', par: 160,
  w: 30, h: 56,
  spawn: [2, 53], goal: [25, 2],
  hint: 'This frame is longer than the others. Significantly. Do not ask about the frog.',
  solid: [
    r(1, 54, 10),
    r(13, 52, 3), r(17, 50, 3), r(21, 48, 3), r(24, 46, 3),
    r(19, 44, 3), r(15, 42, 3), r(11, 40, 3), r(7, 38, 3), r(4, 36, 3),
    r(7, 34, 3), r(11, 32, 3), r(15, 30, 3), r(19, 28, 3), r(23, 26, 3), r(26, 24, 3),
    r(22, 22, 3), r(18, 20, 3), r(14, 18, 3), r(10, 16, 3), r(6, 14, 3), r(4, 12, 3),
    r(7, 10, 3), r(11, 8, 3), r(15, 6, 3), r(19, 4, 3), r(23, 3, 4),
  ],
  a: [r(17, 50, 3), r(19, 28, 3)],
  b: [r(15, 42, 3), r(15, 30, 3)],
  crumble: [r(21, 48, 3), r(11, 40, 3), r(6, 14, 3)],
  blink: [r(24, 46, 3), r(23, 26, 3), r(10, 16, 3)],
  spikes: [
    ...Array.from({ length: 18 }, (_, i) => sp(11 + i, 54)),
  ],
  saws: [
    { x: 10, y: 51, r: 13, ax: 7, ay: 51, bx: 14, by: 51, speed: 0.85 },
    { x: 17, y: 29, r: 12, ax: 14, ay: 29, bx: 21, by: 29, speed: 1.05, phase: 1 },
    { x: 20, y: 13, r: 12, ax: 17, ay: 13, bx: 23, by: 13, speed: 1.2, phase: 2 },
  ],
  lasers: [
    { x: 12, y: 9, dir: 'down', len: 5, period: 3.0, offset: 0.3, duty: 0.36 },
    { x: 22, y: 17, dir: 'up', len: 5, period: 2.6, offset: 1.1, duty: 0.36 },
  ],
  checks: [[24, 45], [4, 35], [26, 23], [4, 11]],
  ads: [[14, 47], [8, 31], [25, 16]],
  frog: { x: 18, y: 5, triggerY: 10, span: 3.6, scale: 3.2 },
});

add({
  d: 2, name: 'EVENT HORIZON', par: 38,
  spawn: [2, 13], goal: [26, 5],
  flip: true,
  hint: 'A long way up, in the wrong direction.',
  solid: [r(1, 14, 5), r(25, 6, 4)],
  a: [r(7, 12, 3), r(15, 10, 3), r(22, 8, 3)],
  b: [r(11, 11, 3), r(19, 9, 3)],
  spikes: [sp(7, 13), sp(8, 13), sp(9, 13), sp(10, 13)],
  saws: [{ x: 14, y: 14, r: 12, ax: 13, ay: 14, bx: 16, by: 14, speed: 0.9 }],
  lasers: [{ x: 23, y: 3, dir: 'down', len: 4, period: 3.0, offset: 0.6, duty: 0.4 }],
  checks: [[6, 13], [16, 9]],
  ads: [[13, 8], [25, 4]],
});

// ===========================================================================
// 3 — THORNS (spikes, saws, lasers)
// ===========================================================================
add({
  d: 3, name: 'NEEDLE RUN', par: 26,
  spawn: [2, 13], goal: [26, 13],
  hint: 'Instant death. Instant respawn. The ratio is the game.',
  solid: [r(1, 14, 28), r(8, 12, 2), r(12, 11, 2), r(16, 12, 2), r(20, 11, 2), r(24, 12, 2)],
  spikes: [sp(6, 13), sp(7, 13), sp(10, 13), sp(11, 13), sp(14, 13), sp(15, 13), sp(18, 13), sp(19, 13), sp(22, 13), sp(23, 13)],
  ads: [[9, 9], [21, 8]],
});

add({
  d: 3, name: 'SAW MILL', par: 30,
  spawn: [2, 13], goal: [26, 2],
  hint: 'Saws run on rails. So do you, technically.',
  solid: [r(1, 14, 6), r(26, 3, 3), r(8, 12, 4), r(15, 9, 4), r(22, 6, 4)],
  saws: [
    { x: 11, y: 13, r: 13, ax: 7, ay: 13, bx: 15, by: 13, speed: 0.8 },
    { x: 18, y: 10, r: 12, ax: 14, ay: 10, bx: 21, by: 10, speed: 0.6, phase: 1 },
    { x: 24, y: 7, r: 11, ax: 21, ay: 7, bx: 26, by: 7, speed: 0.9, phase: 2 },
  ],
  checks: [[5, 13]],
  ads: [[11, 9], [20, 4]],
});

add({
  d: 3, name: 'LASER GRID', par: 30,
  spawn: [2, 13], goal: [26, 3],
  hint: 'Red is on. Dark is off. Count it out loud.',
  solid: [r(1, 14, 6), r(25, 4, 4), r(8, 11, 3), r(14, 8, 3), r(20, 5, 3)],
  lasers: [
    { x: 6, y: 9, dir: 'up', len: 4, period: 3.2, offset: 0, duty: 0.45 },
    { x: 13, y: 6, dir: 'up', len: 4, period: 2.4, offset: 1, duty: 0.4 },
    { x: 19, y: 3, dir: 'up', len: 4, period: 3.0, offset: 0.5, duty: 0.5 },
    { x: 9, y: 10, dir: 'right', len: 4, period: 2.8, offset: 1.4, duty: 0.4 },
  ],
  checks: [[5, 13]],
  ads: [[15, 6], [24, 4]],
});

add({
  d: 3, name: 'CROSSFIRE', par: 34,
  spawn: [2, 13], goal: [26, 2],
  hint: 'Two hazards, one you. Unfair, but consistent.',
  solid: [r(1, 14, 5), r(25, 3, 4), r(8, 11, 3), r(14, 8, 3), r(20, 5, 3)],
  saws: [{ x: 17, y: 9, r: 12, ax: 13, ay: 9, bx: 20, by: 9, speed: 0.75 }],
  lasers: [
    { x: 11, y: 5, dir: 'down', len: 4, period: 2.6, offset: 0, duty: 0.4 },
    { x: 23, y: 9, dir: 'up', len: 3, period: 3.0, offset: 0.8, duty: 0.45 },
  ],
  spikes: [sp(22, 13), sp(23, 13), sp(24, 13)],
  checks: [[4, 13]],
  ads: [[10, 8], [21, 3]],
});

add({
  d: 3, name: 'BLADE ALLEY', par: 36,
  spawn: [2, 13], goal: [26, 2],
  hint: 'Narrow ledges. Wide blades. Do the math.',
  solid: [r(1, 14, 4), r(26, 3, 3), r(7, 12, 2), r(12, 10, 2), r(17, 8, 2), r(22, 6, 2)],
  saws: [
    { x: 10, y: 13, r: 12, ax: 6, ay: 13, bx: 13, by: 13, speed: 1.1 },
    { x: 15, y: 9, r: 12, ax: 11, ay: 9, bx: 18, by: 9, speed: 0.9, phase: 1 },
    { x: 20, y: 11, r: 11, ax: 16, ay: 11, bx: 22, by: 11, speed: 1.3, phase: 2 },
    { x: 24, y: 5, r: 10, ax: 22, ay: 5, bx: 26, by: 5, speed: 0.7 },
  ],
  checks: [[3, 13]],
  ads: [[9, 10], [23, 4]],
});

add({
  d: 3, name: 'THE GAUNTLET', par: 42,
  spawn: [2, 13], goal: [26, 2],
  hint: 'Spikes, blades, beams. The whole product line.',
  solid: [r(1, 14, 5), r(26, 3, 3), r(7, 12, 3), r(12, 10, 2), r(17, 8, 2), r(22, 6, 3)],
  spikes: [sp(7, 13), sp(8, 13), sp(9, 13), sp(10, 13), sp(13, 13), sp(14, 13), sp(15, 13), sp(20, 13), sp(21, 13), sp(22, 13)],
  saws: [
    { x: 12, y: 14, r: 12, ax: 10, ay: 14, bx: 15, by: 14, speed: 0.9 },
    { x: 18, y: 6, r: 11, ax: 16, ay: 6, bx: 21, by: 6, speed: 0.8, phase: 1 },
    { x: 24, y: 10, r: 10, ax: 23, ay: 10, bx: 24, by: 14, speed: 1.0, phase: 2 },
  ],
  lasers: [
    { x: 12, y: 6, dir: 'down', len: 4, period: 2.8, offset: 0.4, duty: 0.4 },
    { x: 22, y: 4, dir: 'down', len: 4, period: 3.4, offset: 1.2, duty: 0.45 },
  ],
  checks: [[4, 13], [14, 9]],
  ads: [[11, 8], [20, 5]],
});

add({
  d: 3, name: 'ONE MORE', par: 44,
  spawn: [2, 13], goal: [26, 2],
  hint: 'One more frame. One more frame. One more frame.',
  solid: [r(1, 14, 4), r(26, 3, 3), r(6, 12, 2), r(9, 10, 2), r(12, 12, 2), r(15, 10, 2), r(18, 8, 2), r(21, 10, 2), r(24, 7, 2)],
  spikes: [sp(5, 13), sp(6, 13), sp(7, 13), sp(8, 13), sp(10, 13), sp(11, 13), sp(13, 13), sp(14, 13), sp(16, 13), sp(17, 13), sp(19, 13), sp(20, 13), sp(22, 13), sp(23, 13)],
  saws: [
    { x: 10, y: 11, r: 10, ax: 8, ay: 11, bx: 12, by: 11, speed: 1.2 },
    { x: 19, y: 6, r: 10, ax: 18, ay: 6, bx: 21, by: 6, speed: 1.1, phase: 1 },
  ],
  lasers: [{ x: 23, y: 6, dir: 'down', len: 3, period: 2.2, offset: 0, duty: 0.45 }],
  checks: [[3, 13], [12, 11]],
  ads: [[14, 8], [25, 5]],
});

// ===========================================================================
// 4 — COLLAPSE (crumble, blink, precision)
// ===========================================================================
add({
  d: 4, name: 'CRUMBLE', par: 28,
  spawn: [2, 13], goal: [26, 2],
  hint: 'Dust-coloured tiles do not forgive hesitation.',
  solid: [r(1, 14, 5), r(26, 3, 3)],
  crumble: [r(7, 12, 3), r(12, 10, 3), r(17, 8, 3), r(22, 6, 3)],
  spikes: [sp(9, 13), sp(10, 13), sp(11, 13), sp(14, 13), sp(15, 13), sp(16, 13), sp(19, 13), sp(20, 13), sp(21, 13)],
  checks: [[4, 13]],
  ads: [[10, 9]],
});

add({
  d: 4, name: 'BLINK', par: 30,
  spawn: [2, 13], goal: [26, 2],
  hint: 'The bridge is real half the time. You are real the rest.',
  solid: [r(1, 14, 5), r(26, 3, 3)],
  blink: [r(7, 12, 3), r(12, 10, 3), r(17, 12, 3), r(22, 9, 3)],
  spikes: [sp(8, 13), sp(9, 13), sp(10, 13), sp(11, 13), sp(12, 13), sp(13, 13), sp(14, 13), sp(15, 13), sp(16, 13), sp(17, 13), sp(18, 13), sp(19, 13), sp(20, 13), sp(21, 13), sp(22, 13), sp(23, 13)],
  checks: [[4, 13]],
  ads: [[14, 8]],
});

add({
  d: 4, name: 'AFTERIMAGE', par: 32,
  spawn: [2, 13], goal: [26, 2],
  hint: 'Faster than the debris. Barely.',
  solid: [r(1, 14, 4), r(26, 3, 3), r(10, 12, 2), r(16, 9, 2), r(21, 11, 2)],
  crumble: [r(6, 12, 2), r(13, 10, 2), r(19, 7, 2), r(23, 5, 2)],
  blink: [r(8, 13, 2), r(15, 11, 2)],
  spikes: [sp(5, 13), sp(7, 13), sp(9, 13), sp(11, 13), sp(12, 13), sp(14, 13), sp(17, 13), sp(18, 13), sp(20, 13), sp(22, 13), sp(24, 13)],
  saws: [{ x: 20, y: 13, r: 11, ax: 18, ay: 13, bx: 23, by: 13, speed: 1.0 }],
  checks: [[3, 13]],
  ads: [[12, 8], [24, 4]],
});

add({
  d: 4, name: 'SPIRAL', par: 36,
  spawn: [2, 13], goal: [26, 2],
  hint: 'Up, around, up, around. The building is a corkscrew.',
  solid: [r(1, 14, 5), r(26, 3, 3), r(11, 8, 6), r(17, 4, 5)],
  crumble: [r(7, 12, 3), r(21, 11, 3), r(24, 7, 2)],
  a: [r(8, 10, 2), r(20, 9, 2)],
  b: [r(15, 12, 3), r(23, 6, 2)],
  spikes: [sp(12, 13), sp(13, 13), sp(14, 13), sp(15, 13), sp(16, 13), sp(17, 13)],
  checks: [[4, 13], [16, 7]],
  ads: [[10, 8], [20, 3]],
});

add({
  d: 4, name: 'LOOPHOLE', par: 38,
  spawn: [2, 13], goal: [26, 2],
  hint: 'The route down is the route up, backwards.',
  solid: [r(1, 14, 5), r(26, 3, 3), r(10, 1, 3), r(20, 1, 3), r(13, 7, 4), r(21, 9, 4)],
  crumble: [r(7, 12, 3), r(9, 9, 3), r(15, 12, 3), r(20, 6, 3)],
  blink: [r(12, 10, 3), r(18, 8, 3), r(24, 4, 2)],
  spikes: [sp(14, 13), sp(15, 13), sp(16, 13), sp(17, 13), sp(22, 13), sp(23, 13)],
  saws: [{ x: 12, y: 6, r: 11, ax: 11, ay: 6, bx: 14, by: 6, speed: 1.0, phase: 1 }],
  checks: [[4, 13], [16, 11]],
  ads: [[11, 8], [22, 3]],
});

add({
  d: 4, name: 'SHATTER', par: 40,
  spawn: [2, 13], goal: [26, 2],
  hint: 'Every surface is temporary. Including your confidence.',
  solid: [r(1, 14, 4), r(26, 3, 3), r(9, 11, 2), r(14, 8, 2), r(19, 6, 2), r(23, 8, 2)],
  crumble: [r(6, 12, 2), r(11, 10, 2), r(16, 12, 2), r(21, 10, 2)],
  blink: [r(13, 13, 2), r(18, 9, 2), r(24, 5, 2)],
  spikes: [sp(5, 13), sp(7, 13), sp(8, 13), sp(10, 13), sp(12, 13), sp(15, 13), sp(17, 13), sp(20, 13), sp(22, 13), sp(25, 13)],
  saws: [{ x: 20, y: 13, r: 11, ax: 18, ay: 13, bx: 23, by: 13, speed: 1.2 }],
  checks: [[3, 13], [14, 7]],
  ads: [[11, 8]],
});

add({
  d: 4, name: 'NO FLOOR', par: 42,
  spawn: [2, 13], goal: [26, 2],
  hint: 'There is no ground. There never was. Keep moving.',
  solid: [r(1, 14, 3), r(26, 3, 3), r(12, 6, 4)],
  crumble: [r(5, 12, 2), r(9, 10, 2), r(14, 12, 2), r(18, 8, 2), r(22, 10, 2)],
  blink: [r(7, 13, 2), r(16, 9, 2), r(20, 6, 2), r(24, 8, 2)],
  a: [r(11, 8, 2)],
  b: [r(13, 10, 2)],
  spikes: [sp(4, 13), sp(6, 13), sp(8, 13), sp(15, 13), sp(17, 13), sp(19, 13), sp(21, 13), sp(23, 13), sp(25, 13)],
  saws: [{ x: 21, y: 12, r: 11, ax: 19, ay: 12, bx: 23, by: 12, speed: 1.1 }],
  checks: [[2, 13]],
  ads: [[10, 8], [22, 4]],
});

// ===========================================================================
// 5 — SELENE (everything)
// ===========================================================================
add({
  d: 5, name: 'ASCENT', par: 40,
  spawn: [2, 13], goal: [26, 2],
  flip: true,
  hint: 'The moon is close enough to taste. That is not a metaphor.',
  solid: [r(1, 14, 5), r(26, 3, 3), r(9, 8, 3), r(18, 6, 3)],
  a: [r(7, 12, 2), r(14, 10, 2), r(23, 8, 2)],
  b: [r(11, 9, 2), r(16, 12, 2), r(21, 5, 2)],
  spikes: [sp(12, 13), sp(13, 13), sp(14, 13), sp(19, 13), sp(20, 13)],
  checks: [[4, 13]],
  ads: [[10, 7], [24, 3]],
});

add({
  d: 5, name: 'SILENCE', par: 42,
  spawn: [2, 2], goal: [26, 13],
  flip: true,
  hint: 'No sound. No floor. No refunds.',
  solid: [r(1, 0, 28), r(5, 4, 4), r(12, 6, 3), r(18, 4, 3), r(23, 9, 3)],
  crumble: [r(9, 10, 3), r(15, 12, 2), r(21, 7, 2)],
  lasers: [
    { x: 8, y: 4, dir: 'down', len: 5, period: 3.0, offset: 0, duty: 0.4 },
    { x: 21, y: 4, dir: 'down', len: 5, period: 2.6, offset: 0.9, duty: 0.4 },
  ],
  checks: [[3, 3], [20, 3]],
  ads: [[14, 8], [24, 11]],
});

add({
  d: 5, name: 'THE NEEDLE', par: 44,
  spawn: [2, 13], goal: [27, 2],
  hint: 'Two tiles wide is generous. One is enough.',
  solid: [r(1, 14, 4), r(27, 3, 2), r(8, 12, 1), r(12, 10, 1), r(16, 8, 1), r(20, 6, 1), r(24, 4, 1)],
  crumble: [r(6, 11, 1), r(10, 9, 1), r(14, 7, 1), r(18, 5, 1), r(22, 3, 1)],
  a: [r(7, 13, 1), r(11, 11, 1), r(15, 9, 1)],
  b: [r(9, 13, 1), r(13, 11, 1), r(17, 9, 1)],
  spikes: [sp(5, 13), sp(6, 13), sp(7, 13), sp(9, 13), sp(10, 13), sp(11, 13), sp(13, 13), sp(14, 13), sp(15, 13), sp(17, 13), sp(18, 13), sp(19, 13), sp(21, 13), sp(22, 13), sp(23, 13), sp(25, 13), sp(26, 13)],
  checks: [[3, 13]],
  ads: [[10, 6], [23, 3]],
});

add({
  d: 5, name: 'ORBITAL', par: 46,
  spawn: [2, 13], goal: [27, 2],
  flip: true,
  hint: 'Orbit is falling with better branding.',
  solid: [r(1, 14, 4), r(27, 3, 2), r(10, 1, 4), r(18, 1, 4), r(14, 9, 4)],
  a: [r(6, 12, 2), r(16, 11, 2), r(23, 7, 2)],
  b: [r(8, 10, 2), r(20, 8, 2), r(25, 5, 2)],
  spikes: [sp(12, 1, 'v'), sp(13, 1, 'v'), sp(22, 1, 'v'), sp(23, 1, 'v')],
  saws: [{ x: 19, y: 13, r: 12, ax: 17, ay: 13, bx: 24, by: 13, speed: 0.9 }],
  lasers: [{ x: 14, y: 4, dir: 'down', len: 4, period: 2.8, offset: 0.5, duty: 0.4 }],
  checks: [[3, 13], [15, 8]],
  ads: [[11, 8], [23, 3]],
});

add({
  d: 5, name: 'HORIZON', par: 48,
  spawn: [2, 13], goal: [27, 2],
  flip: true,
  hint: 'The horizon is where the floors stop pretending.',
  solid: [r(1, 14, 5), r(27, 3, 2), r(9, 1, 3), r(20, 1, 3), r(13, 10, 4)],
  crumble: [r(7, 12, 2), r(11, 8, 2), r(18, 12, 2), r(23, 9, 2)],
  blink: [r(15, 6, 2), r(20, 4, 2), r(25, 6, 2)],
  a: [r(10, 5, 2), r(17, 8, 2)],
  b: [r(12, 7, 2), r(22, 7, 2)],
  lasers: [
    { x: 6, y: 9, dir: 'up', len: 4, period: 2.8, offset: 0, duty: 0.4 },
    { x: 24, y: 9, dir: 'up', len: 4, period: 3.2, offset: 1.1, duty: 0.4 },
  ],
  saws: [{ x: 15, y: 13, r: 11, ax: 13, ay: 13, bx: 18, by: 13, speed: 1.0 }],
  checks: [[4, 13], [14, 9]],
  ads: [[12, 7], [24, 3]],
});

add({
  d: 5, name: 'FINAL DESCENT', par: 52,
  spawn: [2, 2], goal: [27, 13],
  flip: true,
  hint: 'They saved the worst for the top of the building.',
  solid: [r(1, 0, 28), r(5, 3, 4), r(12, 4, 2), r(16, 7, 2), r(21, 3, 4), r(24, 10, 3)],
  crumble: [r(9, 7, 2), r(14, 10, 2), r(19, 9, 2), r(25, 6, 2)],
  blink: [r(7, 12, 2), r(12, 13, 2), r(18, 5, 2), r(22, 8, 2)],
  a: [r(10, 12, 2), r(17, 11, 2)],
  b: [r(8, 9, 2), r(20, 12, 2)],
  spikes: [sp(4, 13), sp(5, 13), sp(6, 13), sp(13, 13), sp(14, 13), sp(23, 13), sp(26, 13)],
  saws: [
    { x: 16, y: 13, r: 11, ax: 14, ay: 13, bx: 19, by: 13, speed: 1.1 },
    { x: 24, y: 5, r: 11, ax: 22, ay: 5, bx: 26, by: 5, speed: 0.9, phase: 1 },
  ],
  lasers: [{ x: 11, y: 1, dir: 'down', len: 4, period: 3.0, offset: 0.4, duty: 0.4 }],
  checks: [[3, 1], [15, 6], [25, 12]],
  ads: [[9, 6], [23, 4]],
});

// ---------------------------------------------------------------------------
// FRAME 35 — intentionally undocumented. It only opens once 34 frames are
// cleared, it is not named on the map, and finishing it is not a victory.
// ---------------------------------------------------------------------------
add({
  d: 5, name: 'TO THE MOON', par: 90,
  w: 30, h: 22, flip: true, glitch: true, secret: true,
  spawn: [2, 20], goal: [27, 2],
  hint: '',
  solid: [r(1, 21, 7), r(25, 3, 3)],
  a: [r(10, 20, 2), r(16, 18, 2), r(22, 16, 2), r(22, 14, 2), r(16, 12, 2), r(10, 10, 2), r(10, 8, 2), r(16, 6, 2), r(22, 4, 2)],
  b: [r(13, 19, 2), r(19, 17, 2), r(25, 15, 2), r(19, 13, 2), r(13, 11, 2), r(7, 9, 2), r(13, 7, 2), r(19, 5, 2)],
  crumble: [r(10, 20, 2), r(22, 14, 2), r(10, 8, 2)],
  blink: [r(7, 9, 2), r(19, 5, 2)],
  spikes: [sp(8, 20), sp(9, 20)],
  saws: [
    { x: 5, y: 17, r: 12, ax: 3, ay: 17, bx: 7, by: 17, speed: 1.2 },
    { x: 27, y: 10, r: 11, ax: 26, ay: 8, bx: 27, by: 12, speed: 0.9, phase: 1 },
    { x: 5, y: 4, r: 11, ax: 3, ay: 4, bx: 7, by: 4, speed: 1.0, phase: 2 },
  ],
  lasers: [
    { x: 12, y: 2, dir: 'down', len: 6, period: 2.2, offset: 0, duty: 0.35 },
    { x: 21, y: 10, dir: 'up', len: 5, period: 2.6, offset: 0.8, duty: 0.36 },
    { x: 25, y: 6, dir: 'down', len: 4, period: 2.0, offset: 0.3, duty: 0.38 },
  ],
  checks: [],
  ads: [[12, 17], [20, 11], [24, 4]],
  gems: [[14, 15], [12, 6], [24, 4]],
});

// ---------------------------------------------------------------------------
// build a collidable level from the declarative rectangles
// ---------------------------------------------------------------------------
export function buildLevel(def) {
  const w = def.w, h = def.h;
  const grid = Array.from({ length: h }, () => Array(w).fill(' '));
  const paint = (rects, ch) => {
    for (const [rx, ry, rw = 1, rh = 1] of rects || []) {
      for (let y = ry; y < ry + rh; y++) {
        for (let x = rx; x < rx + rw; x++) {
          if (x > 0 && y > 0 && x < w - 1 && y < h - 1) grid[y][x] = ch;
        }
      }
    }
  };
  for (let x = 0; x < w; x++) { grid[0][x] = '#'; grid[h - 1][x] = '#'; }
  for (let y = 0; y < h; y++) { grid[y][0] = '#'; grid[y][w - 1] = '#'; }

  paint(def.solid, '#');
  paint(def.a, 'A');
  paint(def.b, 'B');
  paint(def.crumble, 'c');
  paint(def.blink, '~');
  for (const [x, y, ch = '^'] of def.spikes || []) {
    if (x > 0 && y > 0 && x < w - 1 && y < h - 1) grid[y][x] = ch;
  }

  // Gems: three per frame, spread along the climb. Optional but expensive.
  const gems = [];
  if (def.gems) {
    for (const [gx, gy] of def.gems) gems.push({ x: (gx + 0.5) * TILE_UNIT, y: (gy + 0.5) * TILE_UNIT });
  } else {
    const rects = [...(def.solid || []), ...(def.a || []), ...(def.b || [])]
      .filter((r) => r[3] === 1 && r[2] >= 1)
      .sort((p, q) => (p[1] - q[1]) || (p[0] - q[0]));
    const picks = [];
    if (rects.length) {
      const want = [0.18, 0.5, 0.82];
      for (const f of want) {
        let best = null, bestD = Infinity;
        for (const r of rects) {
          const x = r[0] + Math.floor(r[2] / 2);
          const y = r[1] - 1;
          const key = x + ',' + y;
          if (y <= 0 || y >= h - 1) continue;
          if (grid[y][x] !== ' ') continue;
          if (picks.some((p) => p.key === key)) continue;
          const d = Math.abs(f * (rects.length - 1) - rects.indexOf(r));
          if (d < bestD) { bestD = d; best = { x, y, key }; }
        }
        if (best) picks.push(best);
      }
    }
    for (const p of picks) gems.push({ x: (p.x + 0.5) * TILE_UNIT, y: (p.y + 0.5) * TILE_UNIT });
  }
  for (const [x, y] of def.ads || []) {
    if (grid[y] && grid[y][x] === ' ') grid[y][x] = 'E';
  }
  for (const [x, y] of def.checks || []) {
    if (grid[y] && grid[y][x] === ' ') grid[y][x] = 'C';
  }
  const [gx, gy] = def.goal;
  if (grid[gy] && grid[gy][gx] === ' ') grid[gy][gx] = 'G';
  const [sx, sy] = def.spawn;
  if (grid[sy] && grid[sy][sx] === ' ') grid[sy][sx] = 'S';

  return {
    ...def,
    cols: w, rows: h,
    pxW: w * TILE_UNIT, pxH: h * TILE_UNIT,
    grid,
    gems,
    goalPx: { x: gx * TILE_UNIT + TILE_UNIT / 2, y: gy * TILE_UNIT + TILE_UNIT / 2 },
  };
}

export const LEVELS = levels;
export const DISTRICTS = Object.values(D);
