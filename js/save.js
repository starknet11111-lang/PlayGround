import { defaultCampaign } from './campaign.js';

const KEY = 'illusion-complex.save.v1';

export function freshSave() {
  return {
    version: 1,
    unlocked: 1,
    best: {},           // levelId -> best seconds
    cleared: {},        // levelId -> true
    deaths: {},         // levelId -> lifetime deaths
    gems: {},           // levelId -> [bool, bool, bool]
    diamonds: 0,
    credits: 250,
    campaign: defaultCampaign(),
    upgrades: { ward: 0, chrono: 0, magnet: 0 },
    skins: ['classic'],
    skin: 'classic',
    cycle: 0,
    muted: false,
    assist: false,
    totalClears: 0,
    endings: 0,
    seen: { shock34: false, intro: false },
  };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshSave();
    const data = JSON.parse(raw);
    const base = freshSave();
    return {
      ...base,
      ...data,
      campaign: { ...base.campaign, ...(data.campaign || {}) },
      upgrades: { ...base.upgrades, ...(data.upgrades || {}) },
      seen: { ...base.seen, ...(data.seen || {}) },
    };
  } catch {
    return freshSave();
  }
}

export function saveGame(save) {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    /* storage may be unavailable; game still runs */
  }
}

export function wipeProgress(save) {
  const cycle = (save.cycle || 0) + 1;
  const muted = save.muted;
  const fresh = freshSave();
  fresh.cycle = cycle;
  fresh.muted = muted;
  return fresh;
}

// skins are cosmetic: [id, name, cost diamonds, trail colors]
export const SKINS = [
  { id: 'classic', name: 'CLASSIC', cost: 0, colors: ['#6df7ff', '#ff4fd8'] },
  { id: 'aurora', name: 'AURORA', cost: 5, colors: ['#c6ff5e', '#37f0c2'] },
  { id: 'ember', name: 'EMBER', cost: 8, colors: ['#ffb703', '#ff3b5c'] },
  { id: 'void', name: 'VOID', cost: 14, colors: ['#b28dff', '#ffffff'] },
  { id: 'monarch', name: 'MONARCH', cost: 22, colors: ['#ffd166', '#ff006e'] },
];
