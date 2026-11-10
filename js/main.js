import { LEVELS, buildLevel, DISTRICTS } from './levels.js';
import { TILE, stepPlayer, makePlayer, aabb } from './physics.js';
import { Renderer, adRect } from './render.js';
import { Sound } from './audio.js';
import { loadSave, saveGame, wipeProgress, freshSave, SKINS } from './save.js';
import * as Ad from './campaign.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const SCREENS = {
  title: '#screen-title',
  levels: '#screen-levels',
  adspace: '#screen-adspace',
  howto: '#screen-howto',
  pause: '#screen-pause',
  complete: '#screen-complete',
  ending: '#screen-ending',
};

const app = {
  save: loadSave(),
  scene: 'title',
  level: null,
  def: null,
  player: null,
  levelIndex: 0,
  trail: [],
  trailTick: 0,
  elapsed: 0,
  deathsRun: 0,
  activeChecks: new Set(),
  crumble: new Map(),
  gemTaken: [],
  gemsRun: 0,
  runAd: { impressions: 0, clicks: 0, revenue: 0 },
  adsSeen: new Set(),
  adsClicked: new Set(),
  dead: false,
  deathTimer: 0,
  respawnAt: null,
  sponsoredUsed: false,
  invuln: 0,
  ward: 0,
  chrono: 0,
  chronoMax: 0,
  slowToggle: false,
  clock: 0,
  cam: { x: 0, y: 0, scale: 1, shake: 0 },
  nearAd: null,
  frog: null,
  frogWill: false,
  frogSpawned: false,
  shock: 0,
  flash: 0,
  deathFlash: 0,
  shake: 0,
  acc: 0,
  keys: new Set(),
  input: { jumpPressed: false, phasePressed: false, flipPressed: false, holdJump: false },
  touch: { left: false, right: false, jump: false },
  paused: false,
  finale: null,
  adspaceReturn: 'title',
  lastFrame: 0,
  finished: false,
};

const canvas = $('#game');
const renderer = new Renderer(canvas);
const sound = new Sound();
sound.setMuted(!!app.save.muted);

// ---------------------------------------------------------------------------
// boot / screens
// ---------------------------------------------------------------------------
function showScene(name) {
  app.scene = name;
  for (const [key, sel] of Object.entries(SCREENS)) {
    $(sel).classList.toggle('show', name === key);
  }
  $('#hud').classList.toggle('hidden', !['play', 'pause'].includes(name));
  $('#touch-controls').classList.toggle('hidden', !(name === 'play' && isCoarse()));
  $('#death-prompt').classList.add('hidden');
  if (name !== 'pause') {
    $('#screen-pause').classList.remove('show');
  }
  if (name === 'play') $('#screen-pause').classList.remove('show');
  if (name === 'title') sound.startAmbient('parallax');
  else if (name === 'levels') sound.startAmbient('collapse');
  else if (name === 'adspace') sound.startAmbient('gravitas');
  else if (!['play', 'pause'].includes(name)) sound.startAmbient('parallax');
}

function isCoarse() {
  return window.matchMedia('(pointer: coarse)').matches;
}

function updateWallets() {
  $$('[data-credits]').forEach((el) => { el.textContent = app.save.credits; });
  $$('[data-diamonds]').forEach((el) => { el.textContent = app.save.diamonds; });
  $('#title-credits').textContent = `₡ ${app.save.credits}`;
  $('#title-diamonds').textContent = `◆ ${app.save.diamonds}`;
  const cleared = Object.keys(app.save.cleared).length;
  $('#title-progress').textContent = `${cleared} / 35 CLEARED`;
  $('#mute-btn').textContent = app.save.muted ? 'SOUND OFF' : 'SOUND ON';
}

function pushToast(text, cls = '') {
  const wrap = $('#toast-wrap');
  const el = document.createElement('div');
  el.className = `toast ${cls}`;
  el.textContent = text;
  wrap.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 320);
  }, 2400);
}

function addCredits(n) {
  app.save.credits += n;
  updateWallets();
  saveGame(app.save);
}
function addDiamonds(n) {
  if (!n) return;
  app.save.diamonds += n;
  updateWallets();
  saveGame(app.save);
}

function isUnlocked(id) {
  if (id === 35) {
    return Object.keys(app.save.cleared).filter((k) => Number(k) <= 34).length >= 34;
  }
  return id <= app.save.unlocked;
}

function currentLevelNumber() {
  for (let i = 1; i <= 34; i++) {
    if (!app.save.cleared[i] && isUnlocked(i)) return i;
  }
  return isUnlocked(35) ? 35 : 1;
}

// ---------------------------------------------------------------------------
// level select
// ---------------------------------------------------------------------------
function medalFor(id) {
  const best = app.save.best[id];
  if (!best) return null;
  const def = LEVELS[id - 1];
  if (best <= def.par) return 'gold';
  if (best <= def.par * 1.4) return 'silver';
  return 'bronze';
}

function renderLevelSelect() {
  const root = $('#district-list');
  root.innerHTML = '';
  let n = 0;
  for (const district of DISTRICTS) {
    const levels = LEVELS.filter((l) => l.district.key === district.key);
    const sec = document.createElement('section');
    sec.className = 'district';
    sec.innerHTML = `
      <div class="district-head">
        <span class="district-num">${String(levels[0].id).padStart(2, '0')}</span>
        <span class="district-name">${district.name}</span>
        <span class="district-sub">${district.sub} · ${levels.length} FRAMES</span>
      </div>
      <div class="level-row"></div>`;
    const row = $('.level-row', sec);
    for (const def of levels) {
      n++;
      const unlocked = isUnlocked(def.id);
      const cleared = !!app.save.cleared[def.id];
      const medal = medalFor(def.id);
      const secret = def.secret && !unlocked;
      const gems = app.save.gems[def.id] || [];
      const gemCount = gems.filter(Boolean).length;
      const card = document.createElement('button');
      card.className = `level-card${unlocked ? '' : ' locked'}${cleared ? ' cleared' : ''}${def.id === currentLevelNumber() ? ' current' : ''}`;
      card.dataset.act = unlocked ? 'level' : 'locked';
      card.dataset.id = def.id;
      card.innerHTML = `
        <div class="num">${String(def.id).padStart(2, '0')}</div>
        <div class="name">${secret ? '???' : def.name}</div>
        <div class="meta">
          <span>${cleared ? (medal ? `<i class="medal-dot ${medal}"></i> ${fmtShort(app.save.best[def.id])}` : 'CLEARED') : (unlocked ? 'OPEN' : 'LOCKED')}</span>
          <span>${unlocked ? `◆${gemCount}/3` : '<span class="lock">⌁</span>'}</span>
        </div>`;
      row.appendChild(card);
    }
    root.appendChild(sec);
  }
  updateWallets();
}

function fmtShort(sec) {
  if (sec == null) return '—';
  return `${sec.toFixed(1)}s`;
}
function fmtClock(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const cs = Math.floor((sec % 1) * 100);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}
function fmtHM(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// ADSPACE dashboard
// ---------------------------------------------------------------------------
function renderCampaignPanel() {
  const c = app.save.campaign;
  const brand = Ad.brandById(c.brand);
  const live = Ad.campaignLive(c);

  $('#campaign-status').textContent = live ? 'LIVE' : 'PAUSED';
  $('#campaign-status').classList.toggle('off', !live);

  const box = $('#campaign-creative');
  box.innerHTML = '';
  const cv = document.createElement('canvas');
  const w = Math.min(620, Math.max(320, window.innerWidth - 120));
  cv.width = 620; cv.height = 280;
  cv.style.width = '100%'; cv.style.height = 'auto';
  Ad.drawCreative(cv.getContext('2d'), cv.width, cv.height, brand, app.clock, false);
  box.appendChild(cv);

  $('#stat-impressions').textContent = c.impressions.toLocaleString();
  $('#stat-clicks').textContent = c.clicks.toLocaleString();
  $('#stat-ctr').textContent = `${Ad.ctr(c).toFixed(1)}%`;
  $('#stat-revenue').textContent = `₡${c.revenue.toLocaleString()}`;
  $('#budget-text').textContent = `₡${Math.round(c.budget)} / ₡${c.maxBudget}`;
  $('#budget-bar').style.width = `${clamp((c.budget / c.maxBudget) * 100, 0, 100)}%`;
  $('#btn-campaign').textContent = c.active ? 'PAUSE CAMPAIGN' : 'RESUME CAMPAIGN';
  const refuel = $('#btn-refuel');
  refuel.disabled = app.save.credits < 60 || c.budget >= c.maxBudget;
  refuel.style.opacity = refuel.disabled ? 0.45 : 1;

  // creative rotation
  const list = $('#creative-list');
  list.innerHTML = '';
  for (const b of Ad.BRANDS) {
    const btn = document.createElement('button');
    btn.className = `creative-mini${b.id === c.brand ? ' active' : ''}`;
    btn.dataset.act = 'brand';
    btn.dataset.brand = b.id;
    const mini = document.createElement('canvas');
    mini.width = 300; mini.height = 150;
    Ad.drawCreative(mini.getContext('2d'), 300, 150, b, 0, true);
    btn.appendChild(mini);
    const foot = document.createElement('div');
    foot.className = 'mini-foot';
    foot.innerHTML = `<div><div class="mini-name">${b.name}</div><div class="mini-tag">${b.tag}</div></div><div class="mini-pay">₡${b.payout}/CLK</div>`;
    btn.appendChild(foot);
    list.appendChild(btn);
  }

  // objectives
  const objRoot = $('#objective-list');
  objRoot.innerHTML = '';
  for (const o of Ad.OBJECTIVES) {
    const done = !!c.objectives[o.id];
    if (o.secret && !done && app.save.endings === 0) continue;
    const cur = objectiveProgress(o);
    const div = document.createElement('div');
    div.className = `objective${done ? ' done' : ''}`;
    div.innerHTML = `
      <span class="obj-check">${done ? '✓' : ''}</span>
      <span>${o.label}${o.secret && !done ? ' (undisclosed)' : ''}</span>
      <span class="obj-reward">${done ? 'CLAIMED' : `${Math.min(cur, o.goal)}/${o.goal}`} · ₡${o.reward}</span>`;
    objRoot.appendChild(div);
  }

  // upgrades
  const upRoot = $('#upgrade-list');
  upRoot.innerHTML = '';
  for (const u of Ad.UPGRADES) {
    const tier = app.save.upgrades[u.id] || 0;
    const maxed = tier >= 3;
    const cost = maxed ? null : u.tiers[tier];
    const div = document.createElement('div');
    div.className = `upgrade${maxed ? ' maxed' : ''}`;
    div.innerHTML = `
      <div><div class="up-name">${u.name} · ${['I', 'II', 'III'][Math.max(0, tier - 1)] || '—'}</div>
        <div class="up-pips">${[0, 1, 2].map((i) => `<i class="pip${i < tier ? ' on' : ''}"></i>`).join('')}</div>
      </div>
      ${maxed ? '<button class="btn small ghost">MAX</button>' : `<button class="btn small" data-act="upgrade" data-up="${u.id}">₡${cost}</button>`}
      <div class="up-desc">${u.desc}</div>`;
    upRoot.appendChild(div);
  }

  // diamond vault
  const vault = $('#vault-list');
  vault.innerHTML = '';
  for (const skin of SKINS) {
    const owned = app.save.skins.includes(skin.id);
    const equipped = app.save.skin === skin.id;
    const div = document.createElement('div');
    div.className = 'upgrade';
    div.innerHTML = `
      <div><div class="up-name" style="color:${skin.colors[0]}">${skin.name}</div>
        <div class="up-pips">${skin.colors.map((c) => `<i class="pip on" style="background:${c}"></i>`).join('')}</div>
      </div>
      <button class="btn small ${equipped ? 'ghost' : ''}" ${owned ? 'data-act="equip"' : 'data-act="buy-skin"'} data-skin="${skin.id}" ${equipped ? 'disabled' : ''}>${equipped ? 'WORN' : owned ? 'WEAR' : `◆${skin.cost}`}</button>
      <div class="up-desc">${owned ? 'Owned. Purely cosmetic. Deeply important.' : 'Cut from a level that was never built.'}</div>`;
    vault.appendChild(div);
  }
  updateWallets();
}

function objectiveProgress(o) {
  const c = app.save.campaign;
  if (o.kind === 'impressions') return c.impressions;
  if (o.kind === 'clicks') return c.clicks;
  if (o.kind === 'clears') return c.clears;
  if (o.kind === 'totalClears') return app.save.totalClears;
  if (o.kind === 'ending') return app.save.endings;
  return 0;
}

function checkObjectives() {
  const c = app.save.campaign;
  for (const o of Ad.OBJECTIVES) {
    if (c.objectives[o.id]) continue;
    const cur = objectiveProgress(o);
    if (cur >= o.goal) {
      c.objectives[o.id] = true;
      addCredits(o.reward);
      pushToast(`OBJECTIVE COMPLETE · ₡${o.reward}`, 'gold');
      sound.gem();
    }
  }
}

// ---------------------------------------------------------------------------
// level lifecycle
// ---------------------------------------------------------------------------
function startLevel(index) {
  const def = LEVELS[clamp(index, 0, 34)];
  if (!def) return;
  if (!isUnlocked(def.id)) {
    pushToast('FRAME LOCKED');
    sound.deny();
    return;
  }
  const level = buildLevel(def);
  app.levelIndex = def.id - 1;
  app.def = def;
  app.level = level;
  app.player = makePlayer({ x: def.spawn[0], y: def.spawn[1] });
  app.phase = 0;
  app.trail = [];
  app.trailTick = 0;
  app.elapsed = 0;
  app.deathsRun = 0;
  app.activeChecks = new Set();
  app.crumble = new Map();
  app.adsSeen = new Set();
  app.adsClicked = new Set();
  app.runAd = { impressions: 0, clicks: 0, revenue: 0 };
  app.dead = false;
  app.deathTimer = 0;
  app.respawnAt = [def.spawn[0], def.spawn[1]];
  app.sponsoredUsed = false;
  app.invuln = 1.0;
  app.ward = app.save.upgrades.ward || 0;
  app.chronoMax = [0, 1.4, 2.8, 4.6][app.save.upgrades.chrono || 0];
  app.chrono = app.chronoMax;
  app.slowToggle = false;
  app.nearAd = null;
  app.frog = null;
  app.frogSpawned = false;
  app.frogWill = def.frog ? Math.random() < 0.78 : false;
  app.shock = 0;
  app.flash = 0;
  app.deathFlash = 0;
  app.shake = 0;
  app.paused = false;
  app.finished = false;
  app.acc = 0;
  app.input.jumpPressed = false;
  app.input.phasePressed = false;
  app.input.flipPressed = false;
  app.touch = { left: false, right: false, jump: false };
  app.keys.clear();

  const savedGems = app.save.gems[def.id] || [];
  app.gemTaken = [!!savedGems[0], !!savedGems[1], !!savedGems[2]];
  app.gemsRun = app.gemTaken.filter(Boolean).length;

  app.cam = { x: level.pxW / 2, y: level.pxH / 2, scale: 1, shake: 0 };
  app.finale = null;
  app.deathPromptUntil = 0;
  $('#death-prompt').classList.add('hidden');

  // level 34's undocumented one-frame event
  if (def.id === 34 && !app.save.seen.shock34) {
    app.shock = 0.2;
    app.shake = 18;
    app.save.seen.shock34 = true;
    saveGame(app.save);
    sound.shock();
  }

  app.hazardTime = 0;
  if (app.save.assist) {
    app.ward = Math.max(app.ward, 1);
    const mid = level.checks && level.checks.length ? level.checks[Math.floor(level.checks.length / 2)] : null;
    if (mid) {
      app.activeChecks.add(mid[0] + ',' + mid[1]);
      app.respawnAt = [mid[0], mid[1]];
    }
  }
  document.body.classList.toggle('glitch-mode', !!def.glitch);
  updateCamera(1);
  showScene('play');
  updateHud();
  sound.stopAmbient();
  sound.startAmbient(def.district.key);
  pushToast(`${String(def.id).padStart(2, '0')} · ${def.name}`);
  if (def.hint) setTimeout(() => { if (app.scene === 'play') pushToast(def.hint); }, 900);
}

function updateHud() {
  const def = app.def;
  if (!def) return;
  $('#hud-district').textContent = def.district.name;
  $('#hud-levelnum').textContent = String(def.id).padStart(2, '0');
  $('#hud-levelname').textContent = def.name;
  $('#hud-time').textContent = fmtClock(app.elapsed);
  $('#hud-deaths').textContent = app.deathsRun;
  const ph = app.player ? app.player.phase : 0;
  $('#phase-label').textContent = ph === 0 ? 'PHASE A' : 'PHASE B';
  $('#btn-phase-hud').classList.toggle('b', ph === 1);
  $('#phase-dot').style.color = ph === 0 ? '#ffc857' : '#6df7ff';

  const c = app.save.campaign;
  const live = Ad.campaignLive(c);
  const b = Ad.brandById(c.brand);
  const gems = app.gemTaken.filter(Boolean).length;
  const extras = [];
  if (app.ward > 0) extras.push(`WARD ${app.ward}`);
  if (app.chronoMax > 0) extras.push(`FOCUS ${app.chrono.toFixed(1)}s`);
  $('#hud-ticker').innerHTML = live
    ? `<span class="live"></span><span class="tick-brand">${b.name}</span><span>${c.impressions.toLocaleString()} IMPR</span><span>${c.clicks.toLocaleString()} CLICKS</span><span>◆ ${gems}/3</span>${extras.length ? `<span>${extras.join(' · ')}</span>` : ''}`
    : `<span>ADSPACE PAUSED</span><span>◆ ${gems}/3</span>${extras.length ? `<span>${extras.join(' · ')}</span>` : ''}`;
  $('#hud-hint').textContent = def.hint || '';
}

// ---------------------------------------------------------------------------
// input
// ---------------------------------------------------------------------------
function isLeft() {
  return app.keys.has('ArrowLeft') || app.keys.has('KeyA') || app.touch.left;
}
function isRight() {
  return app.keys.has('ArrowRight') || app.keys.has('KeyD') || app.touch.right;
}
function holdingJump() {
  return app.keys.has('Space') || app.keys.has('KeyW') || app.keys.has('ArrowUp') || app.touch.jump;
}

function handleKeyDown(e) {
  const code = e.code;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) e.preventDefault();
  if (e.repeat) return;

  if (code === 'Enter') {
    e.preventDefault();
    if (app.scene === 'title') { sound.ensure(); doAction('play'); }
    else if (app.scene === 'complete') doAction('next');
    else if (app.scene === 'levels' || app.scene === 'adspace' || app.scene === 'howto') doAction('back');
    return;
  }
  if (code === 'Escape' || code === 'KeyP') {
    if (app.scene === 'play') togglePause();
    else if (app.scene === 'pause') togglePause();
    else if (['levels', 'adspace', 'howto'].includes(app.scene)) doAction('back');
    return;
  }
  if (code === 'KeyM') { toggleMute(); return; }
  if (app.scene !== 'play') return;

  if (code === 'Space' || code === 'KeyW' || code === 'ArrowUp') {
    app.input.jumpPressed = true;
  }
  if (code === 'KeyF' || code === 'ShiftLeft' || code === 'ShiftRight') {
    app.input.phasePressed = true;
  }
  if (code === 'KeyV' || code === 'KeyR') {
    app.input.flipPressed = true;
  }
  app.keys.add(code);
}

function handleKeyUp(e) {
  app.keys.delete(e.code);
}

function togglePause() {
  if (app.scene === 'play') {
    app.paused = true;
    app.scene = 'pause';
    $('#screen-pause').classList.add('show');
    $('#touch-controls').classList.add('hidden');
    $('#pause-time').textContent = fmtClock(app.elapsed);
    $('#pause-deaths').textContent = app.deathsRun;
    const best = app.save.best[app.def.id];
    $('#pause-best').textContent = best ? fmtClock(best) : '—';
    $('#assist-btn').textContent = `ASSIST: ${app.save.assist ? 'ON' : 'OFF'}`;
    sound.ui();
  } else if (app.scene === 'pause') {
    app.paused = false;
    app.scene = 'play';
    $('#screen-pause').classList.remove('show');
    $('#touch-controls').classList.toggle('hidden', !isCoarse());
    app.lastFrame = performance.now();
  }
}

function toggleMute() {
  app.save.muted = !app.save.muted;
  sound.setMuted(app.save.muted);
  saveGame(app.save);
  updateWallets();
  sound.ui();
}

// ---------------------------------------------------------------------------
// game update
// ---------------------------------------------------------------------------
function update(dt) {
  app.clock += dt;
  sound.tick(app.clock, ['play', 'pause'].includes(app.scene));

  if (app.shock > 0) app.shock = Math.max(0, app.shock - dt);
  if (app.flash > 0) app.flash = Math.max(0, app.flash - dt * 3);
  if (app.deathFlash > 0) app.deathFlash = Math.max(0, app.deathFlash - dt * 2.2);
  if (app.invuln > 0 && !app.dead) app.invuln = Math.max(0, app.invuln - dt);
  app.cam.shake = Math.max(0, app.cam.shake - dt * 55);
  app.hazardTime = (app.hazardTime || 0) + dt * (app.save.assist ? 0.62 : 1);

  if (app.scene === 'pause') return;
  if (app.scene !== 'play') return;

  if (!app.dead && !app.finished) app.elapsed += dt;

  if (app.dead) {
    if (app.adPaused) return;
    app.deathTimer += dt;
    if (app.deathTimer > 2.2) respawn();
    return;
  }

  // chrono slow-mo
  let sim = dt;
  const chronoHeld = app.keys.has('KeyC') && app.chrono > 0;
  if (chronoHeld) {
    app.chrono = Math.max(0, app.chrono - dt);
    app.slowToggle = !app.slowToggle;
    if (app.slowToggle) sim = dt; else sim = 0;
    if (app.chrono <= 0) pushToast('FOCUS DEPLETED');
  } else {
    app.slowToggle = false;
  }

  if (sim > 0) {
    app.acc += Math.min(sim, 1 / 30);
    const step = 1 / 60;
    let guard = 0;
    while (app.acc >= step && guard++ < 4) {
      app.acc -= step;
      physicsStep(step);
      if (app.finished || app.dead) break;
    }
  }

  if (!app.dead && !app.finished) {
    updateAds(dt);
    updateFrog(dt);
    updateCrumble(dt);
    updateCamera(dt);
  }
}

function dynamicSolid(tx, ty, ch) {
  if (ch === 'c') {
    const st = app.crumble.get(tx + ',' + ty);
    return !(st && st.broken);
  }
  if (ch === '~') {
    return Math.sin(app.clock * 3.2 + (tx + ty) * 0.55) > -0.15;
  }
  return undefined;
}

function physicsStep(step) {
  const p = app.player;
  const level = app.level;
  if (!p || !level) return;

  const input = {
    left: isLeft(), right: isRight(),
    jump: holdingJump(),
    jumpPressed: app.input.jumpPressed,
    phasePressed: app.input.phasePressed,
    flipPressed: app.input.flipPressed,
  };
  app.input.jumpPressed = false;
  app.input.phasePressed = false;
  app.input.flipPressed = false;

  const prevPhase = p.phase;
  const ev = stepPlayer(level, p, input, { dynamic: dynamicSolid, time: app.clock });
  if (ev.jumped) sound.jump();
  if (ev.landed) { sound.land(); }
  if (ev.phaseSwapped) {
    sound.phase();
    app.flash = Math.max(app.flash, 0.18);
    renderer.burst(p.x + p.w / 2, p.y + p.h / 2, p.phase ? '#6df7ff' : '#ffc857', 12, 3, 0.5, 0);
  } else if (ev.phaseBlocked) {
    sound.blocked();
  }
  if (ev.flipped) {
    sound.flip();
    app.shake = 6;
  }
  void prevPhase;

  app.trailTick++;
  if (app.trailTick % 3 === 0) {
    app.trail.push({ x: p.x + p.w / 2, y: p.y + p.h / 2, rot: Math.sin(app.clock * 3) * 0.2 });
    if (app.trail.length > 8) app.trail.shift();
  }

  // hazards
  if (app.invuln <= 0 && !app.dead) {
    if (hitsHazard()) hurt();
  }

  // checkpoints
  for (const [tx, ty] of level.checks) {
    if (app.activeChecks.has(tx + ',' + ty)) continue;
    const cx = (tx + 0.5) * TILE, cy = (ty + 0.5) * TILE;
    if (Math.hypot(p.x + p.w / 2 - cx, p.y + p.h / 2 - cy) < 22) {
      app.activeChecks.add(tx + ',' + ty);
      app.respawnAt = [tx, ty];
      app.flash = 0.12;
      sound.gem();
      pushToast('CHECKPOINT');
    }
  }

  // gems
  for (let i = 0; i < level.gems.length; i++) {
    if (app.gemTaken[i]) continue;
    const g = level.gems[i];
    if (Math.hypot(p.x + p.w / 2 - g.x, p.y + p.h / 2 - g.y) < 18) {
      app.gemTaken[i] = true;
      app.gemsRun++;
      const arr = app.save.gems[level.id] || [false, false, false];
      arr[i] = true;
      app.save.gems[level.id] = arr;
      addDiamonds(1);
      sound.gem();
      renderer.burst(g.x, g.y, '#9ef9ff', 16, 4, 0.8, 0.05);
      app.flash = 0.08;
    }
  }

  // goal
  const gx = (level.goal[0] + 0.5) * TILE;
  const gy = (level.goal[1] + 0.5) * TILE;
  if (Math.hypot(p.x + p.w / 2 - gx, p.y + p.h / 2 - gy) < TILE * 0.62) {
    finishLevel();
  }
}

function hitsHazard() {
  const p = app.player;
  const level = app.level;
  const t = app.hazardTime || app.clock;

  for (const s of level.saws) {
    const ph = s.phase || 0;
    const k = Math.sin(t * (s.speed || 0.8) + ph * 1.9) * 0.5 + 0.5;
    const cx = ((s.ax ?? s.x) + ((s.bx ?? s.x) - (s.ax ?? s.x)) * k) * TILE + TILE / 2;
    const cy = ((s.ay ?? s.y) + ((s.by ?? s.y) - (s.ay ?? s.y)) * k) * TILE + TILE / 2;
    const r = (s.r || 12) * 0.78;
    const nx = clamp(cx, p.x, p.x + p.w);
    const ny = clamp(cy, p.y, p.y + p.h);
    if (Math.hypot(cx - nx, cy - ny) < r) return true;
  }

  for (const l of level.lasers) {
    const period = l.period || 3;
    const on = ((t + (l.offset || 0)) % period) < period * (l.duty || 0.4);
    if (!on) continue;
    const cx = (l.x + 0.5) * TILE, cy = (l.y + 0.5) * TILE;
    let x = cx, y = cy, w = 0, h = 0;
    const len = l.len * TILE;
    if (l.dir === 'up') { x = cx - 3; y = cy - len; w = 6; h = len; }
    if (l.dir === 'down') { x = cx - 3; y = cy; w = 6; h = len; }
    if (l.dir === 'left') { x = cx - len; y = cy - 3; w = len; h = 6; }
    if (l.dir === 'right') { x = cx; y = cy - 3; w = len; h = 6; }
    if (aabb(p, { x: x - 2, y: y - 2, w: w + 4, h: h + 4 })) return true;
  }
  return false;
}

function hurt() {
  if (app.ward > 0) {
    app.ward--;
    app.invuln = 1.4;
    app.flash = 0.4;
    app.shake = 10;
    sound.deny();
    renderer.burst(app.player.x + app.player.w / 2, app.player.y + app.player.h / 2, '#ffffff', 24, 5, 0.7, 0);
    pushToast('WARD ABSORBED');
    updateHud();
    return;
  }
  die();
}

function die() {
  if (app.dead) return;
  const p = app.player;
  app.dead = true;
  app.deathTimer = 0;
  app.deathsRun++;
  app.save.deaths[app.def.id] = (app.save.deaths[app.def.id] || 0) + 1;
  app.deathFlash = 1;
  app.shake = 14;
  app.deathAt = { x: p.x, y: p.y };
  sound.die();
  renderer.burst(p.x + p.w / 2, p.y + p.h / 2, '#ff4fd8', 26, 6, 0.8, 0.2);
  renderer.burst(p.x + p.w / 2, p.y + p.h / 2, '#ffffff', 12, 3, 0.5, 0.1);
  $('#hud-flash').classList.remove('hit');
  void $('#hud-flash').offsetWidth;
  $('#hud-flash').classList.add('hit');
  if (p.phase !== undefined) app.phase = p.phase;

  const campaignLive = Ad.campaignLive(app.save.campaign);
  if (campaignLive && !app.sponsoredUsed) {
    $('#death-prompt').classList.remove('hidden');
    $('#death-sub').textContent = 'auto-respawn in ' + Math.max(0, (1.5 - app.deathTimer)).toFixed(1) + 's';
  }
  updateHud();
  saveGame(app.save);
}

function respawn(reviveHere = false) {
  const at = reviveHere && app.deathAt
    ? { x: app.deathAt.x, y: app.deathAt.y }
    : (app.respawnAt ? { x: app.respawnAt[0], y: app.respawnAt[1] } : null);
  const px = at ? at.x / TILE : app.def.spawn[0];
  const py = at ? at.y / TILE : app.def.spawn[1];
  const np = makePlayer({ x: px, y: py });
  if (reviveHere) {
    np.x = app.deathAt.x; np.y = app.deathAt.y;
    for (let i = 0; i < 8 && !canStand(np); i++) np.y -= 6;
  }
  app.player = np;
  app.dead = false;
  app.deathTimer = 0;
  app.deathAt = null;
  app.sponsoredPending = false;
  app.trail = [];
  app.acc = 0;
  app.invuln = reviveHere ? 2.2 : 1.0;
  app.crumble.clear();
  app.deathFlash = 0;
  $('#death-prompt').classList.add('hidden');
  // restore air at spawn
  if (reviveHere) app.player.gravDir = 1;
  renderer.burst(np.x + np.w / 2, np.y + np.h / 2, '#6df7ff', 18, 4, 0.6, 0);
  updateHud();
}

function canStand(p) {
  const g = app.level;
  const cx = p.x + p.w / 2;
  const ty = Math.floor((p.y + p.h + 2) / TILE);
  const tx = Math.floor(cx / TILE);
  return g.grid[ty] && ['#', 'A', 'B', 'c', '~'].includes(g.grid[ty][tx]);
}

function updateCrumble(dt) {
  const p = app.player;
  const level = app.level;
  for (const [key, st] of app.crumble) {
    st.t += dt;
    if (st.touched && !st.broken && st.t > 0.32) {
      st.broken = true;
      st.t = 0;
      sound.deny();
    }
    if (st.broken && st.t > 3) {
      app.crumble.delete(key);
    }
  }
  // standing on crumble starts its countdown
  const feetY = Math.floor((p.y + p.h + 2) / TILE);
  const fx0 = Math.floor((p.x + 2) / TILE);
  const fx1 = Math.floor((p.x + p.w - 2) / TILE);
  for (let tx = fx0; tx <= fx1; tx++) {
    const ch = level.grid[feetY] && level.grid[feetY][tx];
    if (ch === 'c') {
      const key = tx + ',' + feetY;
      if (!app.crumble.has(key)) app.crumble.set(key, { touched: true, t: 0, broken: false });
    }
  }
}

function updateAds(dt) {
  if (!app.level) return;
  const p = app.player;
  const c = app.save.campaign;
  app.nearAd = null;
  const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;

  for (const [tx, ty] of app.level.ads) {
    const rect = adRect(tx, ty);
    const acx = rect.x + rect.w / 2, acy = rect.y + rect.h / 2;
    const dist = Math.hypot(pcx - acx, pcy - acy);
    if (dist < 210 && !app.adsSeen.has(tx + ',' + ty)) {
      app.adsSeen.add(tx + ',' + ty);
      if (Ad.recordImpression(c)) {
        app.runAd.impressions++;
        updateHud();
      }
    }
    const magnet = [0, 10, 22, 38][app.save.upgrades.magnet || 0];
    const hitbox = { x: rect.x - magnet, y: rect.y - magnet, w: rect.w + magnet * 2, h: rect.h + magnet * 2 };
    if (!app.adsClicked.has(tx + ',' + ty) && aabb(p, hitbox)) {
      app.adsClicked.add(tx + ',' + ty);
      const pay = Ad.recordClick(c);
      if (pay) {
        app.runAd.clicks++;
        app.runAd.revenue += pay;
        addCredits(pay);
        sound.adClick();
        app.flash = 0.1;
        renderer.burst(acx, acy, '#ffc857', 18, 4, 0.9, 0.05);
        renderer.burst(acx, acy, '#6df7ff', 10, 3, 0.7, 0);
        pushToast(`AD CLICK · +₡${pay}`, 'gold');
        checkObjectives();
        updateHud();
      }
    }
    if (dist < 120) app.nearAd = { tx, ty };
  }
}

function updateFrog(dt) {
  const level = app.level;
  if (!level || !app.def.frog) return;
  const p = app.player;
  if (!app.frogSpawned && app.frogWill && p.y < app.def.frog.triggerY * TILE) {
    app.frogSpawned = true;
    app.frog = {
      tx: app.def.frog.x, ty: app.def.frog.y,
      t: 0, croakT: 0, croaking: true,
      span: app.def.frog.span || 2.4, baseX: (app.def.frog.x + 0.5) * TILE,
      baseY: (app.def.frog.y + 0.5) * TILE,
      scale: 0.2,
    };
    app.shake = 16;
    sound.croak();
    pushToast('RIBBIT.', 'gold');
  }
  const f = app.frog;
  if (!f) return;
  f.t += dt;
  f.scale = Math.min(app.def.frog.scale || 2.8, f.scale + dt * 10);
  f.croakT -= dt;
  if (f.croakT <= 0) {
    f.croakT = 0.9 + Math.random() * 0.6;
    f.croaking = true;
    sound.croak();
    app.shake = Math.max(app.shake, 5);
  }
  if (f.croakT < 0.35) f.croaking = false;
  const hop = Math.abs(Math.sin(f.t * 3.2));
  f.x = f.baseX + Math.sin(f.t * 1.55) * f.span * TILE;
  f.y = f.baseY - hop * 26;
  f.angle = Math.sin(f.t * 1.55) * 0.08;
  f.flip = Math.cos(f.t * 1.55) > 0 ? 1 : -1;

  const fw = TILE * f.scale * 0.78;
  const fh = TILE * f.scale * 0.62;
  if (Math.abs(f.x - (p.x + p.w / 2)) < fw * 0.4 + p.w / 2 &&
      Math.abs(f.y - (p.y + p.h / 2)) < fh * 0.4 + p.h / 2) {
    frogReset();
  }
  if (f.t > 12) app.frog = null;
}

function frogReset() {
  app.deathsRun++;
  app.save.deaths[app.def.id] = (app.save.deaths[app.def.id] || 0) + 1;
  app.player = makePlayer({ x: app.def.spawn[0], y: app.def.spawn[1] });
  app.trail = [];
  app.elapsed = 0;
  app.activeChecks.clear();
  app.crumble.clear();
  app.dead = false;
  app.invuln = 1.2;
  app.frog = null;
  app.shake = 22;
  app.flash = 0.3;
  app.cam.shake = 20;
  sound.croak();
  sound.implode();
  pushToast('RIBBIT. FRAME RESET.', 'gold');
  updateHud();
  saveGame(app.save);
}

function updateCamera(dt) {
  const level = app.level;
  if (!level) return;
  const w = renderer.w, h = renderer.h;
  const tall = level.pxH > h * 1.15 || level.pxW > w * 1.1;
  const cam = app.cam;
  let targetScale;
  let tx, ty;
  if (tall) {
    targetScale = Math.min((w * 0.9) / level.pxW, (h * 0.62) / (10 * TILE), 1.25);
    targetScale = Math.max(targetScale, 0.6);
    const p = app.player;
    const halfW = w / 2 / targetScale;
    const halfH = h / 2 / targetScale;
    tx = clamp(p.x + p.w / 2, halfW, Math.max(halfW, level.pxW - halfW));
    ty = clamp(p.y + p.h / 2, halfH, Math.max(halfH, level.pxH - halfH));
  } else {
    targetScale = Math.min((w - 60) / level.pxW, (h - 60) / level.pxH);
    targetScale = Math.min(targetScale, 1.55);
    tx = level.pxW / 2;
    ty = level.pxH / 2;
  }
  const k = 1 - Math.pow(0.001, dt);
  cam.scale += (targetScale - cam.scale) * k;
  cam.x += (tx - cam.x) * k;
  cam.y += (ty - cam.y) * k;
}

// ---------------------------------------------------------------------------
// finish / progression / finale
// ---------------------------------------------------------------------------
function finishLevel() {
  if (app.finished) return;
  app.finished = true;
  sound.goal();
  renderer.burst(
    (app.level.goal[0] + 0.5) * TILE,
    (app.level.goal[1] + 0.5) * TILE,
    '#ffffff', 40, 7, 1.1, 0,
  );

  if (app.def.id === 35) {
    startFinale();
    return;
  }

  const def = app.def;
  const id = def.id;
  const time = app.elapsed;
  const first = !app.save.cleared[id];
  const prevBest = app.save.best[id];
  const newBest = prevBest == null || time < prevBest;
  if (newBest) app.save.best[id] = time;
  app.save.cleared[id] = true;
  if (first) app.save.totalClears++;
  app.save.unlocked = Math.max(app.save.unlocked, Math.min(35, id + 1));

  const medal = time <= def.par ? 'gold' : time <= def.par * 1.4 ? 'silver' : 'bronze';
  let credits = 60 + id * 4;
  if (first) credits += 100;

  let diamonds = 0;
  if (first) diamonds += 3;
  if (medal === 'gold' && !app.save.gold?.[id]) {
    app.save.gold = app.save.gold || {};
    app.save.gold[id] = true;
    diamonds += 2;
  }
  addCredits(credits);
  addDiamonds(diamonds);
  Ad.recordClear(app.save.campaign);
  if (Ad.campaignLive(app.save.campaign)) {
    app.save.campaign.budget = Math.max(0, app.save.campaign.budget - 12);
  }
  checkObjectives();
  saveGame(app.save);

  // populate overlay
  $('#complete-kicker').textContent = first ? 'FRAME CLEARED' : 'FRAME RECLEARED';
  $('#complete-title').textContent = def.name;
  const medalEl = $('#complete-medal');
  medalEl.textContent = app.save.assist ? 'ASSIST' : medal.toUpperCase();
  medalEl.className = `medal ${medal}`;
  $('#complete-time').textContent = fmtClock(time);
  $('#complete-best').textContent = fmtClock(app.save.best[id]);
  $('#complete-deaths').textContent = app.deathsRun;
  $('#complete-reward').textContent = `₡${credits}`;
  $('#complete-gems').textContent = `◆ +${diamonds}`;
  const gemCount = app.gemTaken.filter(Boolean).length;
  $('#complete-gemcount').textContent = `${gemCount} / 3`;

  const c = app.save.campaign;
  $('#recap-brand').textContent = Ad.brandById(c.brand).name;
  $('#recap-impr').textContent = app.runAd.impressions;
  $('#recap-clicks').textContent = app.runAd.clicks;
  $('#recap-rev').textContent = `₡${app.runAd.revenue}`;
  $('#recap-quip').textContent = app.runAd.clicks === 0
    ? 'Nobody clicked. Beautiful numbers, no money.'
    : `${app.runAd.clicks} click${app.runAd.clicks > 1 ? 's' : ''}. The algorithm is proud of you.`;

  $('#btn-next').classList.toggle('hidden', id >= 34);
  app.scene = 'complete';
  showScene('complete');
  $('#hud').classList.add('hidden');
  sound.stopAmbient();
  app.cam.shake = 10;
}

function startFinale() {
  app.scene = 'finale';
  app.finale = { t: 0, phase: 'strobe' };
  app.paused = true;
  $('#hud').classList.add('hidden');
  $('#touch-controls').classList.add('hidden');
  for (const sel of Object.values(SCREENS)) $(sel).classList.remove('show');
  $('#death-prompt').classList.add('hidden');
  sound.stopAmbient();
  sound.shock();
  sound.airhorn();
  setTimeout(() => sound.airhorn(), 500);
}

function updateFinale(dt) {
  const f = app.finale;
  if (!f) return;
  f.t += dt;
  if (f.phase === 'strobe' && f.t > 2.1) {
    f.phase = 'implode';
    f.t = 0;
    sound.implode();
    $('#app').classList.add('imploding');
  }
  if (f.phase === 'implode' && f.t > 0.75) {
    f.phase = 'reset';
    f.t = 0;
    // The save is deleted. The cycle counter survives, because something has to.
    app.save = wipeProgress(app.save);
    saveGame(app.save);
    showResetOverlay();
  }
}

let resetShown = false;
function showResetOverlay() {
  if (resetShown) return;
  resetShown = true;
  const div = document.createElement('div');
  div.id = 'reset-screen';
  div.innerHTML = `
    <div class="reset-inner">
      <div class="reset-line">ADSPACE OS v35.0 — FRAME RECOVERY</div>
      <pre id="reset-log"></pre>
      <div class="reset-cursor">█</div>
    </div>`;
  document.body.appendChild(div);
  const lines = [
    '> HANDSHAKE .................. OK',
    '> FRAME 35 / 35 .............. REACHED',
    '> GEOMETRY INTEGRITY ......... 0%',
    '> PLAYER PROGRESS ............ PURGED',
    '> AD INVENTORY ............... LIQUIDATED',
    '> SAVE FILE .................. DELETED',
    '> THERE IS NOTHING TO CLICK.',
    '> REBOOTING IN 5...',
  ];
  const log = $('#reset-log');
  let i = 0;
  const timer = setInterval(() => {
    if (i < lines.length) {
      log.textContent += (log.textContent ? '\n' : '') + lines[i];
      i++;
    } else {
      clearInterval(timer);
      log.textContent += '\n> REBOOTING.';
      setTimeout(() => location.reload(), 1600);
    }
  }, 420);
}

// ---------------------------------------------------------------------------
// render
// ---------------------------------------------------------------------------
function draw(now) {
  const t = app.clock;
  const cleared = Object.keys(app.save.cleared).length;
  const progress = clamp(cleared / 35, 0, 1);

  if (app.scene === 'play' || app.scene === 'pause') {
    if (!app.level) return;
    const tall = app.level.pxH > renderer.h * 1.15 || app.level.pxW > renderer.w * 1.1;
    if (tall) updateCameraShallow(now);
    const view = {
      level: app.level,
      player: app.player,
      cam: app.cam,
      time: t,
      dt: Math.min(0.05, (now - (app.lastDraw || now)) / 1000),
      phase: app.player ? app.player.phase : 0,
      trail: app.trail,
      progress,
      campaign: app.save.campaign,
      activeChecks: app.activeChecks,
      crumble: app.crumble,
      nearAd: app.nearAd,
      hazardTime: app.hazardTime || t,
      gemTaken: app.gemTaken,
      adClickedKey: null,
      frog: app.frog,
      shock: app.shock,
      flash: app.flash,
      deathFlash: app.deathFlash,
    };
    renderer.drawLevel(view);
    app.lastDraw = now;
  } else if (app.scene === 'finale') {
    renderer.drawFinale(app.finale ? app.finale.t : 0, app.finale ? app.finale.phase : 'strobe');
  } else {
    renderer.drawAmbient(t, app.scene === 'title' ? Math.max(progress, app.save.cycle ? 1 : progress) : progress,
      app.scene === 'levels' ? 'collapse' : app.scene === 'adspace' ? 'gravitas' : 'parallax',
      { ending: app.scene === 'ending' });
  }
}

function updateCameraShallow(now) {
  void now;
}

// ---------------------------------------------------------------------------
// loop
// ---------------------------------------------------------------------------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  update(dt);
  if (app.scene === 'finale') updateFinale(dt);
  draw(now);

  if (app.scene === 'play' && now - (app.lastHud || 0) > 80) {
    app.lastHud = now;
    updateHud();
    if (app.dead && !$('#death-prompt').classList.contains('hidden')) {
      $('#death-sub').textContent = 'auto-respawn in ' + Math.max(0, (2.2 - app.deathTimer)).toFixed(1) + 's';
    }
  }
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------------------
// actions
// ---------------------------------------------------------------------------
function doAction(action, el) {
  sound.ensure();
  switch (action) {
    case 'play': {
      const id = currentLevelNumber();
      startLevel(id - 1);
      break;
    }
    case 'levels':
      if (app.scene === 'play') app.paused = true;
      renderLevelSelect();
      showScene('levels');
      sound.ui();
      break;
    case 'adspace':
      app.adspaceReturn = (app.scene === 'pause' || app.scene === 'play') ? 'pause' : app.scene;
      if (app.scene === 'play') { app.paused = true; app.scene = 'pause'; }
      renderCampaignPanel();
      showScene('adspace');
      sound.ui();
      break;
    case 'howto':
      showScene('howto');
      sound.ui();
      break;
    case 'title':
      showScene('title');
      sound.ui();
      break;
    case 'back':
      if (app.adspaceReturn === 'pause' && app.scene === 'adspace') {
        app.adspaceReturn = 'title';
        app.scene = 'pause';
        $('#screen-adspace').classList.remove('show');
        $('#screen-pause').classList.add('show');
        break;
      }
      if (['levels', 'adspace', 'howto'].includes(app.scene)) {
        showScene('title');
      } else {
        showScene('title');
      }
      sound.ui();
      break;
    case 'level':
      startLevel(Number(el.dataset.id) - 1);
      break;
    case 'locked':
      sound.deny();
      pushToast('FRAME LOCKED — CLEAR THE PREVIOUS ONE');
      break;
    case 'resume':
      togglePause();
      break;
    case 'restart':
      startLevel(app.levelIndex);
      break;
    case 'next': {
      const nextId = app.def.id + 1;
      if (nextId <= 35 && isUnlocked(nextId)) startLevel(nextId - 1);
      else { renderLevelSelect(); showScene('levels'); }
      break;
    }
    case 'mute':
      toggleMute();
      break;
    case 'pause':
      if (app.scene === 'play') togglePause();
      break;
    case 'phase':
      if (app.scene === 'play' && !app.dead) app.input.phasePressed = true;
      break;
    case 'assist-toggle':
      app.save.assist = !app.save.assist;
      saveGame(app.save);
      $('#assist-btn').textContent = `ASSIST: ${app.save.assist ? 'ON' : 'OFF'}`;
      pushToast(`ASSIST ${app.save.assist ? 'ENABLED — hazards slowed' : 'DISABLED'}`);
      break;
    case 'brand':
      app.save.campaign.brand = el.dataset.brand;
      saveGame(app.save);
      renderCampaignPanel();
      sound.ui();
      break;
    case 'toggle-campaign': {
      const c = app.save.campaign;
      if (c.active) {
        c.active = false;
        pushToast('CAMPAIGN PAUSED — BILLBOARDS GO DARK');
      } else {
        if (c.budget <= 0) { pushToast('NO BUDGET. REFUEL FIRST.'); sound.deny(); break; }
        c.active = true;
        pushToast('CAMPAIGN LIVE — IMPRESSIONS INCOMING');
      }
      saveGame(app.save);
      renderCampaignPanel();
      sound.ui();
      break;
    }
    case 'refuel': {
      const c = app.save.campaign;
      if (app.save.credits < 60) { sound.deny(); pushToast('NOT ENOUGH CREDITS'); break; }
      app.save.credits -= 60;
      c.budget = Math.min(c.maxBudget, c.budget + 150);
      c.active = true;
      saveGame(app.save);
      renderCampaignPanel();
      pushToast('MEDIA BUDGET REFUELLED +₡150');
      sound.ui();
      break;
    }
    case 'upgrade': {
      const id = el.dataset.up;
      const u = Ad.UPGRADES.find((x) => x.id === id);
      const tier = app.save.upgrades[id] || 0;
      if (!u || tier >= 3) break;
      const cost = u.tiers[tier];
      if (app.save.credits < cost) { sound.deny(); pushToast('NOT ENOUGH CREDITS'); break; }
      app.save.credits -= cost;
      app.save.upgrades[id] = tier + 1;
      saveGame(app.save);
      renderCampaignPanel();
      pushToast(`${u.name} · TIER ${tier + 1} INSTALLED`, 'gold');
      sound.gem();
      break;
    }
    case 'buy-skin': {
      const skin = SKINS.find((s) => s.id === el.dataset.skin);
      if (!skin) break;
      if (app.save.diamonds < skin.cost) { sound.deny(); pushToast('NOT ENOUGH DIAMONDS'); break; }
      app.save.diamonds -= skin.cost;
      app.save.skins.push(skin.id);
      app.save.skin = skin.id;
      saveGame(app.save);
      renderCampaignPanel();
      pushToast(`${skin.name} EQUIPPED`, 'gold');
      sound.gem();
      break;
    }
    case 'equip': {
      const skin = SKINS.find((s) => s.id === el.dataset.skin);
      if (!skin || !app.save.skins.includes(skin.id)) break;
      app.save.skin = skin.id;
      saveGame(app.save);
      renderCampaignPanel();
      sound.ui();
      break;
    }
    case 'watch-ad':
      startSponsoredAd();
      break;
    case 'ad-skip':
      skipSponsoredAd();
      break;
    default:
      break;
  }
}

// ---------------------------------------------------------------------------
// sponsored continue
// ---------------------------------------------------------------------------
let adTimer = null;
let adState = null;

function startSponsoredAd() {
  if (!app.dead || app.sponsoredUsed) return;
  const c = app.save.campaign;
  const brand = Ad.brandById(c.brand);
  $('#death-prompt').classList.add('hidden');
  const overlay = $('#sponsor-ad');
  overlay.classList.remove('hidden');
  const box = $('#sponsor-creative');
  box.innerHTML = '';
  const cv = document.createElement('canvas');
  cv.width = 620; cv.height = 320;
  box.appendChild(cv);
  Ad.drawCreative(cv.getContext('2d'), 620, 320, brand, app.clock, false);
  $('#ad-countdown').textContent = '4';
  $('#ad-progress-bar').style.width = '0%';
  const skip = $('#ad-skip');
  skip.disabled = true;
  skip.textContent = 'SKIP IN 3';
  adState = { t: 0, total: 4, done: false };
  app.adPaused = true;
  sound.airhorn();
  clearInterval(adTimer);
  adTimer = setInterval(() => {
    if (!adState) return;
    adState.t += 0.1;
    const left = Math.max(0, 4 - adState.t);
    $('#ad-countdown').textContent = left.toFixed(1);
    $('#ad-progress-bar').style.width = `${(adState.t / 4) * 100}%`;
    if (adState.t < 3) {
      skip.textContent = `SKIP IN ${Math.ceil(3 - adState.t)}`;
    } else {
      skip.disabled = false;
      skip.textContent = 'SKIP AD';
    }
    if (adState.t >= 4) finishSponsoredAd();
  }, 100);
}

function skipSponsoredAd() {
  if (!adState || adState.t < 3) return;
  finishSponsoredAd();
}

function finishSponsoredAd() {
  if (!adState || adState.done) return;
  adState.done = true;
  clearInterval(adTimer);
  $('#sponsor-ad').classList.add('hidden');
  app.sponsoredUsed = true;
  app.adPaused = false;
  Ad.recordImpression(app.save.campaign);
  Ad.recordClick(app.save.campaign);
  addCredits(8);
  app.dead = false;
  respawn(true);
  pushToast('SPONSORED REVIVAL · THE BRAND BELIEVES IN YOU');
  app.sponsoredPending = false;
}

// ---------------------------------------------------------------------------
// wiring
// ---------------------------------------------------------------------------
document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);
window.addEventListener('resize', () => {
  renderer.resize();
  app.cam.scale = 1;
});
window.addEventListener('blur', () => app.keys.clear());

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  e.preventDefault();
  doAction(el.dataset.act, el);
});

// touch controls
$$('#touch-controls [data-hold]').forEach((btn) => {
  const key = btn.dataset.hold;
  const on = (e) => {
    e.preventDefault();
    sound.ensure();
    btn.classList.add('down');
    if (key === 'left') app.touch.left = true;
    else if (key === 'right') app.touch.right = true;
    else if (key === 'jump') { app.touch.jump = true; app.input.jumpPressed = true; }
    else if (key === 'phase') app.input.phasePressed = true;
    else if (key === 'flip') app.input.flipPressed = true;
  };
  const off = (e) => {
    e.preventDefault();
    btn.classList.remove('down');
    if (key === 'left') app.touch.left = false;
    else if (key === 'right') app.touch.right = false;
    else if (key === 'jump') app.touch.jump = false;
  };
  btn.addEventListener('pointerdown', on);
  btn.addEventListener('pointerup', off);
  btn.addEventListener('pointercancel', off);
  btn.addEventListener('pointerleave', off);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && app.scene === 'play') togglePause();
});

// initial
updateWallets();
showScene('title');
requestAnimationFrame(frame);

// expose a tiny API for automated checks
window.__illusion = {
  startLevel: (n) => startLevel(n - 1),
  app,
  save: () => app.save,
};
