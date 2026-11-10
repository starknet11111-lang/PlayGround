// Shared, deterministic player physics. Used by the game loop AND the offline
// level validator so "solvable" means the exact same thing in both places.
//
// Units are pixels and frames (fixed 60 Hz). Gravity is +y unless flipped.

export const TILE = 34;
export const PW = 18;
export const PH = 24;

export const K = {
  gravity: 0.62,
  accel: 0.86,
  maxRun: 4.4,
  frictionGround: 0.76,
  frictionAir: 0.94,
  jump: 11.6,
  maxFall: 14,
  coyoteFrames: 7,
  bufferFrames: 7,
  jumpCut: 0.48,
};

const SPIKE_CHARS = new Set(['^', 'v', '<', '>']);

export function isSpikeChar(ch) {
  return SPIKE_CHARS.has(ch);
}

export function tileAt(level, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= level.cols || ty >= level.rows) return '#';
  return level.grid[ty][tx];
}

export function isSolidChar(ch, phase) {
  if (ch === '#') return true;
  if (ch === 'A') return phase === 0;
  if (ch === 'B') return phase === 1;
  if (ch === 'c' || ch === '~') return true;
  return false;
}

export function isSolid(level, tx, ty, phase, dynamic) {
  const ch = tileAt(level, tx, ty);
  if (dynamic) {
    const override = dynamic(tx, ty, ch, phase);
    if (override !== undefined && override !== null) return override;
  }
  return isSolidChar(ch, phase);
}

// Is any solid tile overlapping this AABB?
export function boxSolid(level, x, y, w, h, phase, dynamic) {
  const x0 = Math.floor(x / TILE), x1 = Math.floor((x + w - 0.01) / TILE);
  const y0 = Math.floor(y / TILE), y1 = Math.floor((y + h - 0.01) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (isSolid(level, tx, ty, phase, dynamic)) return true;
    }
  }
  return false;
}

export function makePlayer(spawn, phase = 0) {
  return {
    x: spawn.x * TILE + (TILE - PW) / 2,
    y: spawn.y * TILE + (TILE - PH) / 2,
    w: PW, h: PH,
    vx: 0, vy: 0,
    grounded: false,
    coyote: 0,
    buffer: 0,
    cut: false,
    phase,
    gravDir: 1,
    facing: 1,
    alive: true,
  };
}

function resolveX(level, p, phase, dynamic) {
  const x0 = Math.floor(p.x / TILE);
  const x1 = Math.floor((p.x + p.w - 0.01) / TILE);
  const y0 = Math.floor(p.y / TILE);
  const y1 = Math.floor((p.y + p.h - 0.01) / TILE);
  let hit = false;
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (!isSolid(level, tx, ty, phase, dynamic)) continue;
      const left = tx * TILE, right = left + TILE;
      if (p.vx > 0) p.x = left - p.w - 0.01;
      else if (p.vx < 0) p.x = right + 0.01;
      else p.x = left - p.w - 0.01;
      p.vx = 0;
      hit = true;
    }
    if (hit) break;
  }
}

function resolveY(level, p, phase, dynamic) {
  const x0 = Math.floor(p.x / TILE);
  const x1 = Math.floor((p.x + p.w - 0.01) / TILE);
  const y0 = Math.floor(p.y / TILE);
  const y1 = Math.floor((p.y + p.h - 0.01) / TILE);
  let hit = false;
  for (let tx = x0; tx <= x1; tx++) {
    for (let ty = y0; ty <= y1; ty++) {
      if (!isSolid(level, tx, ty, phase, dynamic)) continue;
      const top = ty * TILE, bottom = top + TILE;
      if (p.vy > 0) { p.y = top - p.h - 0.01; p.grounded = true; }
      else if (p.vy < 0) { p.y = bottom + 0.01; }
      else { p.y = top - p.h - 0.01; p.grounded = true; }
      p.vy = 0;
      hit = true;
    }
    if (hit) break;
  }
}

function spikeBox(ch, tx, ty) {
  const t = TILE;
  switch (ch) {
    case '^': return { x: tx * t + 4, y: ty * t + t * 0.45, w: t - 8, h: t * 0.55 - 2 };
    case 'v': return { x: tx * t + 4, y: ty * t, w: t - 8, h: t * 0.55 - 2 };
    case '<': return { x: tx * t + t * 0.45, y: ty * t + 4, w: t * 0.55 - 2, h: t - 8 };
    case '>': return { x: tx * t, y: ty * t + 4, w: t * 0.55 - 2, h: t - 8 };
  }
  return null;
}

export function touchingSpike(level, x, y, w, h) {
  const x0 = Math.floor((x + 3) / TILE), x1 = Math.floor((x + w - 3) / TILE);
  const y0 = Math.floor((y + 3) / TILE), y1 = Math.floor((y + h - 3) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const ch = tileAt(level, tx, ty);
      if (!isSpikeChar(ch)) continue;
      const b = spikeBox(ch, tx, ty);
      if (x < b.x + b.w && x + w > b.x && y < b.y + b.h && y + h > b.y) return true;
    }
  }
  return false;
}

/**
 * Advance one fixed frame.
 * input: { left, right, jump, phasePressed, flipPressed }
 * opts: { dynamic(tx,ty,ch,phase) -> boolean|undefined, time }
 * returns events: { jumped, died, phaseBlocked, flipped, landed }
 */
export function stepPlayer(level, p, input, opts = {}) {
  const dynamic = opts.dynamic;
  const ev = { jumped: false, died: false, phaseBlocked: false, flipped: false, landed: false };

  if (!p.alive) return ev;

  // --- phase swap (refuse if it would embed the body) ---
  if (input.phasePressed) {
    const next = 1 - p.phase;
    if (!boxSolid(level, p.x, p.y, p.w, p.h, next, dynamic)) {
      p.phase = next;
      p.vy *= 0.35;
      ev.phaseSwapped = true;
    } else {
      ev.phaseBlocked = true;
    }
  }

  // --- gravity inversion (only with footing) ---
  if (input.flipPressed && (p.grounded || p.coyote > 0)) {
    p.gravDir *= -1;
    p.grounded = false;
    p.coyote = 0;
    p.vy = 0;
    ev.flipped = true;
  }

  const wasGrounded = p.grounded;
  p.grounded = false;

  // --- horizontal ---
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (dir !== 0) {
    p.vx += dir * K.accel;
    p.facing = dir;
  } else {
    p.vx *= wasGrounded ? K.frictionGround : K.frictionAir;
    if (Math.abs(p.vx) < 0.06) p.vx = 0;
  }
  if (p.vx > K.maxRun) p.vx = K.maxRun;
  if (p.vx < -K.maxRun) p.vx = -K.maxRun;

  // --- jump buffering / coyote ---
  if (input.jumpPressed) p.buffer = K.bufferFrames;
  if (wasGrounded) p.coyote = K.coyoteFrames;
  if (p.buffer > 0) p.buffer--;
  if (p.coyote > 0) p.coyote--;

  if (p.buffer > 0 && (p.coyote > 0 || wasGrounded)) {
    p.vy = -K.jump * p.gravDir;
    p.buffer = 0;
    p.coyote = 0;
    p.cut = false;
    ev.jumped = true;
  }

  // jump cut — releasing early trims the arc
  if (!input.jump && !p.cut && p.vy * p.gravDir < -2.2) {
    p.vy *= K.jumpCut;
    p.cut = true;
  }
  if (input.jump && p.vy * p.gravDir >= 0) p.cut = false;

  // --- gravity ---
  p.vy += K.gravity * p.gravDir;
  if (p.vy > K.maxFall) p.vy = K.maxFall;
  if (p.vy < -K.maxFall) p.vy = -K.maxFall;

  // --- integrate & collide, sub-stepped to stay safe at high speed ---
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(p.vx), Math.abs(p.vy)) / 6));
  for (let s = 0; s < steps; s++) {
    p.x += p.vx / steps;
    resolveX(level, p, p.phase, dynamic);
    p.y += p.vy / steps;
    resolveY(level, p, p.phase, dynamic);
  }

  if (!wasGrounded && p.grounded) ev.landed = true;

  if (p.grounded) p.coyote = K.coyoteFrames;

  if (touchingSpike(level, p.x, p.y, p.w, p.h)) {
    p.alive = false;
    ev.died = true;
  }

  // out of world (shouldn't happen in sealed frames, but free levels can fall)
  if (p.y > level.rows * TILE + 80 || p.y < -140) {
    p.alive = false;
    ev.died = true;
  }

  return ev;
}

export function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
