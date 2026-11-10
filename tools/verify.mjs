// Offline validator: searches for a real input sequence through each frame
// using the same physics module the game runs. No fake reachability graphs.
import { LEVELS, buildLevel } from '../js/levels.js';
import { stepPlayer, makePlayer, aabb, TILE } from '../js/physics.js';

const MACRO = 5; // frames per action
const DIRS = [-1, 0, 1];
const JUMPS = [0, 1, 2]; // none, tap, hold
const TOGGLES = [0, 1];

function goalRect(level) {
  const [gx, gy] = level.goal;
  return { x: gx * TILE - 4, y: gy * TILE - 4, w: TILE + 8, h: TILE + 8 };
}

function key(p) {
  return [
    Math.round(p.x / 2),
    Math.round(p.y / 2),
    Math.round(p.vx),
    Math.round(p.vy),
    p.phase,
    p.gravDir,
    p.grounded ? 1 : 0,
    p.cut ? 1 : 0,
  ].join(',');
}

function simulate(level, start, act, goal) {
  const p = { ...start };
  const input = {
    left: act.dir < 0, right: act.dir > 0,
    jump: false, jumpPressed: false,
    phasePressed: false, flipPressed: false,
  };
  let best = Infinity;
  for (let f = 0; f < MACRO; f++) {
    input.jumpPressed = f === 0 && act.jump > 0;
    input.jump = act.jump === 2 || (act.jump === 1 && f === 0);
    input.phasePressed = f === 0 && act.ph;
    input.flipPressed = f === 0 && act.flip;
    const ev = stepPlayer(level, p, input, {});
    if (ev.died) return { dead: true, p, best };
    const d = Math.hypot((p.x + p.w / 2) - (goal.x + goal.w / 2), (p.y + p.h / 2) - (goal.y + goal.h / 2));
    if (d < best) best = d;
    if (aabb(p, goal)) return { won: true, p, best };
  }
  return { p, best, dead: false };
}

export function solve(def, budget = 1500000) {
  const level = buildLevel(def);
  const start = makePlayer({ x: def.spawn[0], y: def.spawn[1] });
  const goal = goalRect(level);
  const gc = { x: goal.x + (goal.w - 8) / 2, y: goal.y + (goal.h - 8) / 2 };

  let seq = 0;
  const heap = [];
  const push = (node, pr) => {
    heap.push({ node, pr, seq: seq++ });
    let i = heap.length - 1;
    while (i > 0) {
      const par = (i - 1) >> 1;
      if (heap[par].pr <= heap[i].pr) break;
      [heap[par], heap[i]] = [heap[i], heap[par]];
      i = par;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < heap.length && heap[l].pr < heap[m].pr) m = l;
        if (r < heap.length && heap[r].pr < heap[m].pr) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };

  const dist = (p) => Math.hypot((p.x + p.w / 2) - gc.x, (p.y + p.h / 2) - gc.y);
  const seen = new Set();
  const visited = new Set();
  push({ p: start, depth: 0 }, dist(start));
  let expanded = 0;
  let bestSeen = dist(start);
  let bestP = start;

  while (heap.length && expanded < budget) {
    const { node } = pop();
    expanded++;
    const p = node.p;
    if (dist(p) < bestSeen) { bestSeen = dist(p); bestP = p; }
    visited.add(`${Math.floor((p.x + p.w / 2) / TILE)},${Math.floor((p.y + p.h / 2) / TILE)}`);

    for (const dir of DIRS) {
      for (const jump of JUMPS) {
        for (const ph of TOGGLES) {
          for (const flip of (def.flip ? TOGGLES : [0])) {
            if (flip && !(p.grounded || p.coyote > 0)) continue;
            const res = simulate(level, p, { dir, jump, ph, flip }, goal);
            if (res.dead) continue;
            const np = res.p;
            const k = key(np);
            if (seen.has(k)) continue;
            seen.add(k);
            if (res.won) return { ok: true, frames: (node.depth + 1) * MACRO, expanded, level, visited };
            push({ p: np, depth: node.depth + 1 }, (node.depth + 1) * MACRO + dist(np) / 4.4);
          }
        }
      }
    }
  }
  return { ok: false, expanded, best: bestSeen, bestP, level, visited };
}

function dumpMap(res) {
  const level = res.level;
  const rows = level.grid.map((row) => row.slice());
  for (const key of res.visited) {
    const [tx, ty] = key.split(',').map(Number);
    if (rows[ty] && rows[ty][tx] === ' ') rows[ty][tx] = '·';
  }
  console.log('   ' + Array.from({ length: level.cols }, (_, i) => (i % 10)).join(''));
  rows.forEach((row, i) => console.log(String(i).padStart(2) + ' ' + row.join('')));
}

const only = process.argv[2] ? Number(process.argv[2]) : null;
const dump = process.env.DUMP === '1';
let failures = 0;
for (const def of LEVELS) {
  if (only && def.id !== only) continue;
  const t0 = Date.now();
  const res = solve(def);
  const ms = Date.now() - t0;
  if (res.ok) {
    console.log(`✓ ${String(def.id).padStart(2, '0')} ${def.name.padEnd(16)} ${(res.frames / 60).toFixed(1)}s   ${res.expanded} nodes   ${ms}ms`);
  } else {
    failures++;
    const p = res.bestP;
    console.log(`✗ ${String(def.id).padStart(2, '0')} ${def.name.padEnd(16)} unreachable   closest ${Math.round(res.best)}px at tile ${(p.x / TILE).toFixed(1)},${(p.y / TILE).toFixed(1)}   ${res.expanded} nodes ${ms}ms`);
    if (dump) dumpMap(res);
  }
}
if (failures) {
  console.log(`\n${failures} frame(s) need work.`);
  process.exitCode = 1;
} else {
  console.log('\nAll frames verified beatable.');
}
