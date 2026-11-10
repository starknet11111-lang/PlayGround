import { TILE, PW, PH } from './physics.js';
import { drawCreative, brandById } from './campaign.js';

export const THEMES = {
  parallax: {
    sky: ['#05071a', '#180a3c', '#2a0d3f'], accent: '#6df7ff', accent2: '#ff4fd8',
    solid: '#0d1836', solidEdge: '#2e4a86', glow: 'rgba(109,247,255,.24)', moon: '#f4f1de',
  },
  gravitas: {
    sky: ['#12030f', '#2b0426', '#3a0a1e'], accent: '#ff4fd8', accent2: '#ffc857',
    solid: '#230d25', solidEdge: '#67306a', glow: 'rgba(255,79,216,.22)', moon: '#ffd9f2',
  },
  thorns: {
    sky: ['#0a0309', '#26030e', '#1a0d02'], accent: '#ff3b5c', accent2: '#c6ff5e',
    solid: '#210a12', solidEdge: '#6b1f2f', glow: 'rgba(255,59,92,.22)', moon: '#ffe1d6',
  },
  collapse: {
    sky: ['#020d0e', '#04201f', '#06101f'], accent: '#37f0c2', accent2: '#ff7a9c',
    solid: '#09201f', solidEdge: '#1d5b54', glow: 'rgba(55,240,194,.2)', moon: '#dffcf4',
  },
  selene: {
    sky: ['#020207', '#0a0c1c', '#12121f'], accent: '#f4f1de', accent2: '#ffc857',
    solid: '#11131f', solidEdge: '#3b3f58', glow: 'rgba(244,241,222,.2)', moon: '#fffdf2',
  },
};

export function adRect(tx, ty) {
  return {
    x: (tx + 0.5) * TILE - TILE * 1.65,
    y: (ty + 0.5) * TILE - TILE * 1.05,
    w: TILE * 3.3,
    h: TILE * 1.85,
  };
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else {
    const rad = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.dpr = 1;
    this.w = 1;
    this.h = 1;
    this.particles = [];
    this.adCache = new Map();
    this.shakeX = 0;
    this.shakeY = 0;
    this.time = 0;
    this.stars = Array.from({ length: 90 }, (_, i) => ({
      x: ((Math.sin(i * 127.1) * 43758.5453) % 1 + 1) % 1,
      y: ((Math.sin(i * 311.7) * 24634.6345) % 1 + 1) % 1,
      r: 0.4 + (((i * 53) % 13) / 13) * 1.5,
      d: 0.2 + (((i * 17) % 9) / 9) * 0.8,
      tw: i,
    }));
    this.resize();
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.dpr = dpr;
    this.w = this.canvas.clientWidth || window.innerWidth;
    this.h = this.canvas.clientHeight || window.innerHeight;
    this.canvas.width = Math.max(1, Math.round(this.w * dpr));
    this.canvas.height = Math.max(1, Math.round(this.h * dpr));
  }

  burst(x, y, color, n = 14, speed = 4, life = 0.7, gravity = 0.2) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.25 + Math.random() * 0.9);
      this.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * 0.25,
        life: life * (0.6 + Math.random() * 0.7), max: life, color, size: 1 + Math.random() * 2.4,
        gravity,
      });
    }
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.985;
    }
  }

  begin() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
  }

  // ============ ambient / menu backdrop ============
  drawAmbient(t, progress, themeKey = 'parallax', opts = {}) {
    const ctx = this.ctx;
    const w = this.w, h = this.h;
    const theme = THEMES[themeKey] || THEMES.parallax;
    this.begin();
    this.time = t;

    const g = ctx.createLinearGradient(0, 0, w * 0.35, h);
    g.addColorStop(0, theme.sky[0]);
    g.addColorStop(0.55, theme.sky[1]);
    g.addColorStop(1, theme.sky[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // stars
    for (const s of this.stars) {
      const tw = 0.45 + 0.55 * Math.sin(t * 1.4 + s.tw);
      ctx.globalAlpha = 0.25 + tw * 0.55 * s.d;
      ctx.fillStyle = '#dfe6ff';
      ctx.fillRect(s.x * w, s.y * h * 0.92, s.r, s.r);
    }
    ctx.globalAlpha = 1;

    // moon
    const mx = w * 0.76, my = h * 0.3;
    const mr = Math.min(w, h) * (0.1 + 0.16 * progress);
    this.drawMoon(ctx, mx, my, mr, theme, t, progress);

    // horizon glow
    const hg = ctx.createRadialGradient(w * 0.5, h * 0.72, 0, w * 0.5, h * 0.72, w * 0.6);
    hg.addColorStop(0, theme.glow);
    hg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, w, h);

    // impossible staircase silhouette
    this.drawStairs(ctx, w * 0.24, h * 0.62, Math.min(w, h) * 0.3, t, theme);

    // perspective floor grid
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 1;
    const horizon = h * 0.74;
    for (let i = -12; i <= 12; i++) {
      ctx.beginPath();
      ctx.moveTo(w * 0.5 + i * 18, horizon);
      ctx.lineTo(w * 0.5 + i * w * 0.11, h * 1.05);
      ctx.stroke();
    }
    for (let i = 0; i < 10; i++) {
      const y = horizon + Math.pow(i / 10, 2.1) * (h - horizon) * 1.2;
      ctx.globalAlpha = 0.05 + i * 0.012;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();

    // drifting shards
    ctx.save();
    for (let i = 0; i < 9; i++) {
      const seed = i * 91.7;
      const x = ((Math.sin(seed) * 0.5 + 0.5) * w + t * (6 + (i % 3) * 5)) % (w + 140) - 70;
      const y = (Math.sin(seed * 1.7 + t * 0.25) * 0.5 + 0.5) * h;
      const size = 8 + (i % 4) * 9;
      ctx.globalAlpha = 0.06 + (i % 3) * 0.03;
      ctx.strokeStyle = i % 2 ? theme.accent2 : theme.accent;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size * 0.8, y);
      ctx.lineTo(x, y + size);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();

    if (opts.ending) {
      const rg = ctx.createRadialGradient(w * 0.5, h * 0.4, 0, w * 0.5, h * 0.4, w * 0.7);
      rg.addColorStop(0, 'rgba(255,255,255,.10)');
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, w, h);
    }
  }

  drawMoon(ctx, x, y, r, theme, t, progress) {
    ctx.save();
    const halo = ctx.createRadialGradient(x, y, r * 0.7, x, y, r * 2.6);
    halo.addColorStop(0, 'rgba(244,241,222,.18)');
    halo.addColorStop(1, 'rgba(244,241,222,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.6, 0, Math.PI * 2);
    ctx.fill();

    const mg = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    mg.addColorStop(0, '#fffdf2');
    mg.addColorStop(0.65, theme.moon || '#f4f1de');
    mg.addColorStop(1, '#9d99a8');
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // craters
    ctx.fillStyle = 'rgba(40,38,58,.18)';
    const craters = [[-0.32, -0.2, 0.17], [0.24, 0.12, 0.22], [-0.1, 0.4, 0.12], [0.4, -0.3, 0.1], [-0.48, 0.28, 0.08], [0.05, -0.44, 0.07]];
    for (const [cx, cy, cr] of craters) {
      ctx.beginPath();
      ctx.arc(x + cx * r, y + cy * r, cr * r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.28)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, r - 1, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();

    // moon cracks when progress is maxed
    if (progress > 0.86) {
      ctx.strokeStyle = `rgba(10,6,18,${0.25 + 0.2 * Math.sin(t * 3)})`;
      ctx.lineWidth = Math.max(1, r * 0.012);
      ctx.beginPath();
      ctx.moveTo(x - r * 0.55, y - r * 0.6);
      ctx.lineTo(x - r * 0.1, y - r * 0.15);
      ctx.lineTo(x - r * 0.22, y + r * 0.3);
      ctx.lineTo(x + r * 0.15, y + r * 0.62);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + r * 0.15, y - r * 0.72);
      ctx.lineTo(x + r * 0.3, y - r * 0.2);
      ctx.lineTo(x + r * 0.12, y + r * 0.05);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawStairs(ctx, cx, cy, size, t, theme) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 1.2;
    const steps = 12;
    const rot = t * 0.06;
    for (let i = 0; i < steps; i++) {
      const a = rot + (i / steps) * Math.PI * 2;
      const rr2 = size * (0.75 + 0.25 * Math.sin(a * 2));
      const x = Math.cos(a) * rr2;
      const y = Math.sin(a) * rr2 * 0.52 - (i / steps) * size * 0.55;
      const s = size * 0.13;
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(s, -s * 0.5);
      ctx.lineTo(s, s * 0.3);
      ctx.lineTo(0, s * 0.8);
      ctx.closePath();
      ctx.stroke();
      ctx.globalAlpha = 0.1;
      ctx.beginPath();
      ctx.moveTo(0, s * 0.8);
      ctx.lineTo(s, s * 0.3);
      ctx.stroke();
      ctx.globalAlpha = 0.2;
      ctx.restore();
    }
    ctx.restore();
  }

  // ============ level ============
  drawLevel(v) {
    const ctx = this.ctx;
    const { level } = v;
    const theme = THEMES[level.district.key] || THEMES.parallax;
    this.begin();
    this.time = v.time;
    this.updateParticles(v.dt || 1 / 60);

    const w = this.w, h = this.h;
    const g = ctx.createLinearGradient(0, 0, w * 0.4, h);
    g.addColorStop(0, theme.sky[0]);
    g.addColorStop(0.6, theme.sky[1]);
    g.addColorStop(1, theme.sky[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // ambient moon in the distance
    const prog = v.progress ?? 0.4;
    ctx.globalAlpha = 0.9;
    this.drawMoon(ctx, w * 0.82, h * 0.18, Math.min(w, h) * (0.06 + 0.1 * prog), theme, v.time, prog);
    ctx.globalAlpha = 1;

    // faint distant grid
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 1;
    const spacing = 46 * v.cam.scale;
    const ox = -(v.cam.x * v.cam.scale) % spacing;
    const oy = -(v.cam.y * v.cam.scale) % spacing;
    for (let x = ox; x < w; x += spacing) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = oy; y < h; y += spacing) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    ctx.restore();

    const cam = v.cam;
    const sx = (Math.random() - 0.5) * (cam.shake || 0);
    const sy = (Math.random() - 0.5) * (cam.shake || 0);
    v.cam.shake = Math.max(0, (cam.shake || 0) - (v.dt || 1 / 60) * 60);

    ctx.save();
    ctx.translate(w / 2 + sx, h / 2 + sy);
    ctx.scale(cam.scale, cam.scale);
    ctx.translate(-(cam.x), -(cam.y));

    this.drawLevelTiles(v, theme);
    this.drawHazards(v, theme);
    this.drawAds(v, theme);
    this.drawCheckpoints(v, theme);
    this.drawGems(v, theme);
    this.drawGoal(v, theme);
    this.drawPlayer(v, theme);
    if (v.frog) this.drawFrog(v, theme);
    this.drawParticles();

    ctx.restore();

    // near-ad prompt / floating world labels are drawn after restore for crispness
    if (v.nearAd) this.drawAdPrompt(v, theme);

    if (level.glitch) this.drawGlitch(v, theme);
    if (v.shock > 0) this.drawShock(v);
    if (v.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(0.85, v.flash)})`;
      ctx.fillRect(0, 0, w, h);
    }
    if (v.deathFlash > 0) {
      ctx.fillStyle = `rgba(255,40,80,${v.deathFlash * 0.35})`;
      ctx.fillRect(0, 0, w, h);
    }

    // vignette (soft, in-canvas)
    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,.45)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }

  drawLevelTiles(v, theme) {
    const ctx = this.ctx;
    const level = v.level;
    const phase = v.phase;
    const time = v.time;
    const T = TILE;

    // backdrop floor shadow + level frame glow
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.04)';
    ctx.lineWidth = 1;
    ctx.strokeRect(T * 0.5, T * 0.5, level.pxW - T, level.pxH - T);
    ctx.restore();

    for (let ty = 0; ty < level.rows; ty++) {
      for (let tx = 0; tx < level.cols; tx++) {
        const ch = level.grid[ty][tx];
        const x = tx * T, y = ty * T;
        if (ch === '#') {
          this.solidTile(x, y, T, theme, tx, ty);
        } else if (ch === 'A' || ch === 'B') {
          const active = (ch === 'A') === (phase === 0);
          const col = ch === 'A' ? '#ffc857' : '#6df7ff';
          if (active) {
            this.phaseTile(x, y, T, col, theme);
          } else {
            ctx.save();
            ctx.globalAlpha = 0.22 + 0.05 * Math.sin(time * 2 + tx);
            ctx.strokeStyle = col;
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(x + 3.5, y + 3.5, T - 7, T - 7);
            ctx.setLineDash([]);
            ctx.globalAlpha = 0.08;
            ctx.fillStyle = col;
            ctx.fillRect(x + 2, y + 2, T - 4, T - 4);
            ctx.restore();
          }
        } else if (ch === 'c') {
          const key = tx + ',' + ty;
          const state = v.crumble && v.crumble.get(key);
          if (state && state.broken) {
            ctx.save();
            ctx.globalAlpha = 0.14;
            ctx.strokeStyle = '#d8b28a';
            ctx.setLineDash([2, 4]);
            ctx.strokeRect(x + 4, y + 4, T - 8, T - 8);
            ctx.restore();
          } else {
            this.crumbleTile(x, y, T, theme, state);
          }
        } else if (ch === '~') {
          const solid = Math.sin(time * 3.2 + (tx + ty) * 0.55) > -0.15;
          if (solid) this.blinkTile(x, y, T, theme);
          else {
            ctx.save();
            ctx.globalAlpha = 0.18;
            ctx.fillStyle = '#37f0c2';
            ctx.fillRect(x + 4, y + T - 5, T - 8, 2);
            ctx.restore();
          }
        } else if (ch === '^' || ch === 'v' || ch === '<' || ch === '>') {
          this.spike(x, y, T, ch, theme);
        }
      }
    }
  }

  solidTile(x, y, T, theme, tx, ty) {
    const ctx = this.ctx;
    const g = ctx.createLinearGradient(x, y, x, y + T);
    g.addColorStop(0, theme.solidEdge);
    g.addColorStop(0.14, theme.solid);
    g.addColorStop(1, '#05070f');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, T, T);
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    ctx.fillRect(x, y, T, 1.5);
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.fillRect(x, y + T - 2, T, 2);
    if ((tx + ty) % 5 === 0) {
      ctx.fillStyle = 'rgba(255,255,255,.035)';
      ctx.fillRect(x + 5, y + 5, T - 10, T - 10);
    }
    ctx.strokeStyle = 'rgba(255,255,255,.028)';
    ctx.strokeRect(x + 0.5, y + 0.5, T - 1, T - 1);
  }

  phaseTile(x, y, T, col, theme) {
    const ctx = this.ctx;
    const g = ctx.createLinearGradient(x, y, x + T, y + T);
    g.addColorStop(0, col);
    g.addColorStop(1, col + '55');
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = g;
    ctx.fillRect(x, y, T, T);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 1, y + 1, T - 2, T - 2);
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 4, y + 4, T - 8, T - 8);
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = col;
    ctx.fillRect(x + 8, y + T / 2 - 1, T - 16, 1.5);
    ctx.globalAlpha = 1;
  }

  crumbleTile(x, y, T, theme, state) {
    const ctx = this.ctx;
    const shake = state && state.touched ? 3 : 0;
    ctx.save();
    ctx.translate(x + (Math.random() - 0.5) * shake, y + (Math.random() - 0.5) * shake);
    const g = ctx.createLinearGradient(0, 0, 0, T);
    g.addColorStop(0, '#c5a27d');
    g.addColorStop(0.2, '#6b513c');
    g.addColorStop(1, '#2a1e16');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, T, T);
    ctx.strokeStyle = 'rgba(0,0,0,.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(T * 0.2, 0); ctx.lineTo(T * 0.35, T * 0.4); ctx.lineTo(T * 0.22, T * 0.7); ctx.lineTo(T * 0.36, T);
    ctx.moveTo(T * 0.7, 0); ctx.lineTo(T * 0.6, T * 0.3); ctx.lineTo(T * 0.78, T * 0.6);
    ctx.stroke();
    ctx.restore();
  }

  blinkTile(x, y, T, theme) {
    const ctx = this.ctx;
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 3.2 + x * 0.02);
    ctx.save();
    ctx.globalAlpha = 0.7 + pulse * 0.3;
    const g = ctx.createLinearGradient(x, y, x, y + T);
    g.addColorStop(0, '#37f0c2');
    g.addColorStop(1, '#0d5a4c');
    ctx.fillStyle = g;
    ctx.fillRect(x + 1, y + 1, T - 2, T - 2);
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#eafff9';
    ctx.fillRect(x + 4, y + 4, T - 8, 2);
    ctx.restore();
  }

  spike(x, y, T, dir, theme) {
    const ctx = this.ctx;
    ctx.save();
    const n = 3;
    const gap = T / n;
    ctx.fillStyle = '#e3e9ff';
    ctx.strokeStyle = 'rgba(255,59,92,.8)';
    ctx.shadowColor = 'rgba(255,59,92,.6)';
    ctx.shadowBlur = 7;
    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      if (dir === '^') {
        const bx = x + i * gap;
        ctx.moveTo(bx, y + T);
        ctx.lineTo(bx + gap / 2, y + T * 0.22);
        ctx.lineTo(bx + gap, y + T);
      } else if (dir === 'v') {
        const bx = x + i * gap;
        ctx.moveTo(bx, y);
        ctx.lineTo(bx + gap / 2, y + T * 0.78);
        ctx.lineTo(bx + gap, y);
      } else if (dir === '<') {
        const by = y + i * gap;
        ctx.moveTo(x + T, by);
        ctx.lineTo(x + T * 0.22, by + gap / 2);
        ctx.lineTo(x + T, by + gap);
      } else {
        const by = y + i * gap;
        ctx.moveTo(x, by);
        ctx.lineTo(x + T * 0.78, by + gap / 2);
        ctx.lineTo(x, by + gap);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  drawHazards(v, theme) {
    const ctx = this.ctx;
    const level = v.level;
    const t = v.hazardTime ?? v.time;
    const T = TILE;

    for (const l of level.lasers || []) {
      const cx = (l.x + 0.5) * T, cy = (l.y + 0.5) * T;
      const on = ((t + (l.offset || 0)) % l.period) < l.period * (l.duty || 0.4);
      let dx = 0, dy = 0;
      if (l.dir === 'up') dy = -1;
      if (l.dir === 'down') dy = 1;
      if (l.dir === 'left') dx = -1;
      if (l.dir === 'right') dx = 1;
      const ex = cx + dx * l.len * T;
      const ey = cy + dy * l.len * T;

      // emitter
      ctx.save();
      ctx.fillStyle = on ? '#ff3b5c' : '#411523';
      ctx.shadowColor = '#ff3b5c';
      ctx.shadowBlur = on ? 14 : 0;
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (on) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const warn = ((t * 8) % 1 + 1) % 1;
        ctx.strokeStyle = `rgba(255,59,92,${0.16 + warn * 0.1})`;
        ctx.lineWidth = 9;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,90,120,.9)';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ff3b5c';
        ctx.shadowBlur = 16;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.restore();
      }
    }

    for (const s of level.saws || []) {
      const ph = s.phase || 0;
      const k = (Math.sin(t * (s.speed || 0.8) + ph * 1.9) * 0.5 + 0.5);
      const cx = ((s.ax ?? s.x) + ((s.bx ?? s.x) - (s.ax ?? s.x)) * k) * T + T / 2;
      const cy = ((s.ay ?? s.y) + ((s.by ?? s.y) - (s.ay ?? s.y)) * k) * T + T / 2;
      const r = s.r || 12;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * 6);
      ctx.fillStyle = '#b9c4e8';
      ctx.shadowColor = 'rgba(255,59,92,.85)';
      ctx.shadowBlur = 12;
      const teeth = 10;
      ctx.beginPath();
      for (let i = 0; i < teeth * 2; i++) {
        const a = (i / (teeth * 2)) * Math.PI * 2;
        const rad = i % 2 === 0 ? r : r * 0.66;
        if (i === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
        else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2a1020';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff3b5c';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawAds(v, theme) {
    const ctx = this.ctx;
    const brand = brandById(v.campaign.brand);
    for (const [tx, ty] of v.level.ads) {
      const rect = adRect(tx, ty);
      const bob = Math.sin(v.time * 1.6 + tx) * 2;
      const x = rect.x, y = rect.y + bob, w = rect.w, h = rect.h;
      const near = v.nearAd && v.nearAd.tx === tx && v.nearAd.ty === ty;
      ctx.save();
      // glow plate
      ctx.shadowColor = near ? 'rgba(109,247,255,.75)' : 'rgba(0,0,0,.6)';
      ctx.shadowBlur = near ? 26 : 12;
      ctx.fillStyle = '#080a16';
      rr(ctx, x - 3, y - 3, w + 6, h + 6, 6);
      ctx.fill();
      ctx.shadowBlur = 0;
      // creative (cached)
      const key = brand.id;
      if (!this.adCache.has(key)) {
        const c = document.createElement('canvas');
        c.width = 330; c.height = 185;
        const cx2 = c.getContext('2d');
        drawCreative(cx2, c.width, c.height, brand, 0, true);
        this.adCache.set(key, c);
      }
      ctx.save();
      rr(ctx, x, y, w, h, 4);
      ctx.clip();
      ctx.drawImage(this.adCache.get(key), x, y, w, h);
      // animated sheen on the billboard itself
      const sheen = ((v.time * 0.35 + tx * 0.1) % 1) * (w * 1.6) - w * 0.3;
      const sg = ctx.createLinearGradient(x + sheen, y, x + sheen + w * 0.4, y + h);
      sg.addColorStop(0, 'rgba(255,255,255,0)');
      sg.addColorStop(0.5, 'rgba(255,255,255,.18)');
      sg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(x, y, w, h);
      ctx.restore();

      // frame
      ctx.strokeStyle = near ? '#6df7ff' : 'rgba(200,210,255,.3)';
      ctx.lineWidth = 1.4;
      rr(ctx, x, y, w, h, 4);
      ctx.stroke();

      // mounting arm
      ctx.strokeStyle = 'rgba(160,175,230,.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y + h);
      ctx.lineTo(x + w / 2, y + h + 7);
      ctx.stroke();

      if (near) {
        const pulse = 0.6 + 0.4 * Math.sin(v.time * 7);
        ctx.fillStyle = `rgba(109,247,255,${0.14 + pulse * 0.1})`;
        rr(ctx, x, y, w, h, 4);
        ctx.fill();
        ctx.fillStyle = '#050810';
        ctx.font = '700 9px ui-monospace, monospace';
        ctx.textAlign = 'center';
        const bw = 92, bh = 17;
        rr(ctx, x + w / 2 - bw / 2, y - bh - 5, bw, bh, 3);
        ctx.fill();
        ctx.strokeStyle = 'rgba(109,247,255,.6)';
        ctx.stroke();
        ctx.fillStyle = '#6df7ff';
        ctx.textBaseline = 'middle';
        ctx.fillText(v.adClickedKey === tx + ',' + ty ? 'CLICKED ✓' : 'TOUCH TO CLICK', x + w / 2, y - bh / 2 - 4);
      }
      ctx.restore();
    }
  }

  drawAdPrompt(v, theme) {
    // small credits floater handled via particles; reserved for future use
  }

  drawCheckpoints(v, theme) {
    const ctx = this.ctx;
    const T = TILE;
    for (const [tx, ty] of v.level.checks) {
      const cx = (tx + 0.5) * T, cy = (ty + 0.5) * T;
      const active = v.activeChecks.has(tx + ',' + ty);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.strokeStyle = active ? '#c6ff5e' : 'rgba(170,190,220,.5)';
      ctx.fillStyle = active ? 'rgba(198,255,94,.18)' : 'rgba(120,140,180,.1)';
      ctx.lineWidth = 1.4;
      ctx.shadowColor = active ? '#c6ff5e' : 'transparent';
      ctx.shadowBlur = active ? 18 : 0;
      ctx.beginPath();
      ctx.moveTo(0, 12);
      ctx.lineTo(9, 0);
      ctx.lineTo(0, -12);
      ctx.lineTo(-9, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 12); ctx.lineTo(0, 22); ctx.stroke();
      ctx.restore();
    }
  }

  drawGems(v, theme) {
    const ctx = this.ctx;
    const taken = v.gemTaken || [];
    (v.level.gems || []).forEach((g, i) => {
      if (taken[i]) return;
      const bob = Math.sin(v.time * 2.4 + i * 2) * 3;
      const spin = Math.abs(Math.cos(v.time * 1.8 + i));
      ctx.save();
      ctx.translate(g.x, g.y + bob);
      ctx.globalCompositeOperation = 'lighter';
      ctx.shadowColor = '#9ef9ff';
      ctx.shadowBlur = 20;
      ctx.scale(0.35 + spin * 0.65, 1);
      ctx.fillStyle = '#d8feff';
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(6, 0);
      ctx.lineTo(0, 8);
      ctx.lineTo(-6, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(v.time * 4 + i);
      ctx.fillStyle = '#9ef9ff';
      ctx.fillRect(g.x - 1, g.y - 16 + bob, 2, 4);
      ctx.restore();
    });
  }

  drawGoal(v, theme) {
    const ctx = this.ctx;
    const T = TILE;
    const [gx, gy] = v.level.goal;
    const cx = (gx + 0.5) * T, cy = (gy + 0.5) * T;
    const t = v.time;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const r = T * (0.34 + i * 0.13) + Math.sin(t * 2 + i * 1.3) * 3;
      ctx.strokeStyle = i === 0 ? 'rgba(255,255,255,.9)' : `rgba(109,247,255,${0.42 - i * 0.1})`;
      ctx.lineWidth = i === 0 ? 2 : 1;
      ctx.beginPath();
      ctx.arc(0, 0, r, t * (0.8 + i * 0.5), t * (0.8 + i * 0.5) + Math.PI * 1.5);
      ctx.stroke();
    }
    const gg = ctx.createRadialGradient(0, 0, 1, 0, 0, T * 0.5);
    gg.addColorStop(0, 'rgba(255,255,255,.9)');
    gg.addColorStop(0.4, 'rgba(109,247,255,.5)');
    gg.addColorStop(1, 'rgba(109,247,255,0)');
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.arc(0, 0, T * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.55 + 0.2 * Math.sin(t * 3);
    ctx.fillStyle = theme.accent2;
    ctx.font = '700 8px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(v.level.secret ? '???' : 'EXIT', cx, cy + T * 0.95);
    ctx.restore();
  }

  drawPlayer(v, theme) {
    const ctx = this.ctx;
    const p = v.player;
    const t = v.time;
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;

    // trail
    if (v.trail) {
      for (let i = 0; i < v.trail.length; i++) {
        const tr = v.trail[i];
        const a = (i / v.trail.length) * 0.35;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(tr.x, tr.y);
        ctx.rotate(tr.rot);
        ctx.fillStyle = i % 2 ? theme.accent2 : theme.accent;
        ctx.fillRect(-PW * 0.3, -PH * 0.3, PW * 0.6, PH * 0.6);
        ctx.restore();
      }
    }

    ctx.save();
    ctx.translate(cx, cy);
    const gd = p.gravDir || 1;
    ctx.scale(1, gd);
    const tilt = (p.vx || 0) * 0.055;
    ctx.rotate(tilt);
    const pulse = 1 + Math.sin(t * 8) * 0.035;
    ctx.scale(pulse, pulse);

    ctx.shadowColor = theme.accent;
    ctx.shadowBlur = 22;
    ctx.fillStyle = '#f8fbff';
    ctx.beginPath();
    ctx.moveTo(0, -PH * 0.52);
    ctx.lineTo(PW * 0.55, PH * 0.12);
    ctx.lineTo(0, PH * 0.48);
    ctx.lineTo(-PW * 0.55, PH * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0a0d1c';
    ctx.beginPath();
    ctx.moveTo(0, -PH * 0.3);
    ctx.lineTo(PW * 0.24, PH * 0.04);
    ctx.lineTo(0, PH * 0.24);
    ctx.lineTo(-PW * 0.24, PH * 0.04);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    ctx.arc(0, -PH * 0.02, 1.9, 0, Math.PI * 2);
    ctx.fill();

    // phase ring
    ctx.strokeStyle = v.phase === 0 ? '#ffc857' : '#6df7ff';
    ctx.globalAlpha = 0.65;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, PW * 0.8 + Math.sin(t * 4) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawParticles() {
    const ctx = this.ctx;
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max));
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  drawFrog(v) {
    const ctx = this.ctx;
    const f = v.frog;
    if (!f) return;
    const T = TILE;
    const scale = f.scale || 2.6;
    const w = T * scale;
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.angle || 0);
    ctx.scale(f.flip || 1, 1);
    const bob = Math.sin(v.time * 4) * 3;
    ctx.translate(0, bob);

    // body
    ctx.fillStyle = '#7bd44a';
    ctx.strokeStyle = '#2d5c14';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(123,212,74,.55)';
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.5, w * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // belly
    ctx.fillStyle = '#d7f7a8';
    ctx.beginPath();
    ctx.ellipse(0, w * 0.12, w * 0.31, w * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // eyes
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#8ee55a';
      ctx.beginPath();
      ctx.arc(s * w * 0.22, -w * 0.28, w * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#2d5c14';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(s * w * 0.22, -w * 0.28, w * 0.105, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0a0a0a';
      ctx.beginPath();
      ctx.arc(s * w * 0.19, -w * 0.285, w * 0.052, 0, Math.PI * 2);
      ctx.fill();
    }

    // mouth
    const open = f.croaking ? 0.5 + Math.sin(v.time * 22) * 0.5 : 0.1;
    ctx.strokeStyle = '#20400e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, w * 0.08, w * (0.15 + open * 0.08), w * (0.03 + open * 0.07), 0, 0, Math.PI);
    ctx.stroke();

    // legs
    ctx.strokeStyle = '#5aa82f';
    ctx.lineWidth = 5;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * w * 0.28, w * 0.18);
      ctx.lineTo(s * w * 0.44, w * 0.4);
      ctx.stroke();
    }

    if (f.croaking) {
      ctx.fillStyle = 'rgba(5,8,20,.85)';
      ctx.strokeStyle = 'rgba(198,255,94,.6)';
      ctx.lineWidth = 1;
      const bw = 96, bh = 26;
      rr(ctx, w * 0.1, -w * 0.75, bw, bh, 4);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c6ff5e';
      ctx.font = '700 10px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('RIBBIT.', w * 0.1 + bw / 2, -w * 0.75 + bh / 2);
    }
    ctx.restore();
  }

  drawGlitch(v, theme) {
    const ctx = this.ctx;
    const w = this.w, h = this.h;
    const t = v.time;
    const intensity = v.glitch ?? 0.4;
    ctx.save();
    // horizontal slice displacement of the already-rendered frame
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (Math.random() < 0.55 * intensity) {
      const dw = this.canvas.width, dh = this.canvas.height;
      for (let i = 0; i < 4; i++) {
        const sy = Math.random() * dh * 0.9;
        const sh = dh * (0.01 + Math.random() * 0.05);
        const dx = (Math.random() - 0.5) * dw * 0.07 * intensity;
        ctx.drawImage(this.canvas, 0, sy, dw, sh, dx, sy, dw, sh);
      }
    }
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.globalCompositeOperation = 'difference';
    if (Math.random() < 0.25) {
      ctx.fillStyle = `rgba(255,0,72,${0.12 * intensity})`;
      ctx.fillRect(0, Math.random() * h, w, 2 + Math.random() * 12);
    }
    ctx.globalCompositeOperation = 'source-over';

    // corrupted scanline / text artifacts
    if (Math.random() < 0.3) {
      ctx.fillStyle = 'rgba(255,255,255,.06)';
      ctx.fillRect(0, Math.random() * h, w, 1);
    }
    ctx.font = '700 9px ui-monospace, monospace';
    ctx.fillStyle = 'rgba(255,60,90,.75)';
    for (let i = 0; i < 2; i++) {
      if (Math.random() < 0.5) {
        ctx.fillText(`0x${(Math.random() * 0xffffff | 0).toString(16).toUpperCase()} FRAME_35`, Math.random() * w * 0.9, 20 + Math.random() * h);
      }
    }
    ctx.restore();
  }

  drawShock(v) {
    const ctx = this.ctx;
    const w = this.w, h = this.h;
    const s = v.shock;
    const k = Math.min(1, s / 0.2);
    ctx.save();
    // brightest possible planes
    ctx.globalCompositeOperation = 'lighter';
    const cols = ['#ffffff', '#ff00ff', '#00ffff', '#ffe600', '#ff0044'];
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = cols[i % cols.length];
      ctx.globalAlpha = 0.28 + Math.random() * 0.4;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    const cx = w / 2 + (Math.random() - 0.5) * 26;
    const cy = h / 2 + (Math.random() - 0.5) * 26;
    const R = Math.min(w, h) * 0.22;
    ctx.translate(cx, cy);
    ctx.rotate((Math.random() - 0.5) * 0.25);

    // crude, cartoonish, deliberately silly
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 40;
    ctx.fillStyle = '#ffd9f2';
    ctx.strokeStyle = '#ff2d6f';
    ctx.lineWidth = Math.max(4, R * 0.09);
    const shaftW = R * 0.42;
    ctx.beginPath();
    ctx.roundRect(-shaftW / 2, -R * 0.32, shaftW, R * 1.62, shaftW * 0.4);
    ctx.fill(); ctx.stroke();
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(side * R * 0.3, R * 1.22, R * 0.29, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ff2d6f';
    ctx.fillRect(-shaftW * 0.14, -R * 0.24, shaftW * 0.28, 8);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = `rgba(255,255,255,${0.35 + Math.random() * 0.4})`;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    void k;
  }

  // finale: obnoxious strobe + implode
  drawFinale(t, phase) {
    const ctx = this.ctx;
    const w = this.w, h = this.h;
    this.begin();
    // phase 0-1.6s: mega annoying colour assault, 2-2.4: drain to black
    if (phase === 'strobe') {
      const cols = ['#ff004d', '#00fff0', '#ffe600', '#7d00ff', '#00ff5e', '#ff7b00', '#ffffff'];
      const i = Math.floor(t * 14) % cols.length;
      ctx.fillStyle = cols[i];
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.globalCompositeOperation = 'difference';
      ctx.fillStyle = cols[(i + 3) % cols.length];
      for (let k = 0; k < 7; k++) {
        const y = ((t * (80 + k * 30) + k * 90) % (h + 100)) - 50;
        ctx.fillRect(0, y, w, 18 + (k % 3) * 12);
      }
      ctx.restore();

      ctx.save();
      ctx.font = '900 34px "Arial Black", Impact, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = i % 2 ? '#000' : '#fff';
      const words = ['BUY', 'OBEY', 'RIBBIT', 'AD', 'RESET', 'TO THE MOON', 'CLICK'];
      for (let k = 0; k < 5; k++) {
        ctx.save();
        ctx.translate(w * (0.18 + (k % 3) * 0.32), h * (0.18 + k * 0.17));
        ctx.rotate(Math.sin(t * 9 + k) * 0.2);
        ctx.scale(1 + Math.sin(t * 20 + k) * 0.1, 1);
        ctx.fillText(words[(k + i) % words.length], 0, 0);
        ctx.restore();
      }
      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = 'difference';
      ctx.fillStyle = 'rgba(255,255,255,.4)';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    } else if (phase === 'implode') {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      const k = Math.min(1, t / 0.5);
      const r = (1 - k) * Math.min(w, h) * 0.7;
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(t * 12);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
