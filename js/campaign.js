// ADSPACE — the in-game ad network. Purely local, no network, no real ads.
// The joke is load-bearing: impressions are worthless, clicks pay.

export const BRANDS = [
  {
    id: 'void', name: 'VOID COLA', tag: 'TASTE NOTHING', mark: 'VC',
    blurb: 'Zero sugar. Zero flavour. Zero refunds.',
    c1: '#ff2d6f', c2: '#6a00ff', ink: '#ffffff',
    payout: 14, cpc: 3, style: 'rings',
  },
  {
    id: 'lumen', name: 'LUMEN', tag: 'SEE BELOW', mark: 'L',
    blurb: 'A flashlight for people who are afraid of the dark and the light.',
    c1: '#00e5ff', c2: '#0042ff', ink: '#eaffff',
    payout: 11, cpc: 2, style: 'beams',
  },
  {
    id: 'abyss', name: 'ABYSS BANK', tag: 'TRUST THE DARK', mark: 'AB',
    blurb: 'Your money is safe. Your money is also somewhere else.',
    c1: '#ffb703', c2: '#ef476f', ink: '#1a0d00',
    payout: 19, cpc: 4, style: 'grid',
  },
  {
    id: 'moonrun', name: 'MOONRUN', tag: 'GET THERE FASTER', mark: 'MR',
    blurb: 'Performance footwear for vertical real estate.',
    c1: '#c77dff', c2: '#ff006e', ink: '#fff4ff',
    payout: 16, cpc: 3, style: 'speed',
  },
];

export const UPGRADES = [
  {
    id: 'ward', name: 'WARD', desc: 'Absorbs one lethal hit per attempt. Tiers add charges.',
    tiers: [240, 620, 1400],
  },
  {
    id: 'chrono', name: 'CHRONO', desc: 'Hold C to slow time. A finite budget of bad decisions per attempt.',
    tiers: [280, 700, 1500],
  },
  {
    id: 'magnet', name: 'MAGNET', desc: 'Billboard click zones get bigger. Advertising appreciates your enthusiasm.',
    tiers: [180, 460, 1000],
  },
];

export const OBJECTIVES = [
  { id: 'impr50', label: 'Serve 50 impressions', reward: 120, goal: 50, kind: 'impressions' },
  { id: 'click10', label: 'Land 10 ad clicks', reward: 200, goal: 10, kind: 'clicks' },
  { id: 'clear3', label: 'Clear 3 frames with a live campaign', reward: 150, goal: 3, kind: 'clears' },
  { id: 'clear10', label: 'Clear 10 frames', reward: 300, goal: 10, kind: 'totalClears' },
  { id: 'moon', label: 'Reach the end of the building', reward: 1000, goal: 1, kind: 'ending', secret: true },
];

export function defaultCampaign() {
  return {
    brand: 'void',
    active: true,
    impressions: 0,
    clicks: 0,
    revenue: 0,
    spend: 0,
    budget: 400,
    maxBudget: 400,
    clears: 0,
    run: { impressions: 0, clicks: 0, revenue: 0 },
    objectives: {},
  };
}

export function brandById(id) {
  return BRANDS.find((b) => b.id === id) || BRANDS[0];
}

export function ctr(c) {
  return c.impressions ? (c.clicks / c.impressions) * 100 : 0;
}

// Poster-style creative, drawn at any size. Used by billboards and the dashboard.
export function drawCreative(ctx, w, h, brand, t = 0, compact = false) {
  const b = brand;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();

  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, b.c1);
  g.addColorStop(1, b.c2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // brand-specific background geometry
  ctx.save();
  ctx.globalAlpha = 0.5;
  if (b.style === 'rings') {
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    for (let i = 0; i < 5; i++) {
      const rr = Math.min(w, h) * (0.14 + i * 0.09) + Math.sin(t * 1.4 + i) * 4;
      ctx.lineWidth = Math.max(1, w * 0.006);
      ctx.beginPath();
      ctx.ellipse(w * 0.5, h * 0.52, rr * 1.5, rr, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.52, Math.min(w, h) * 0.21, Math.min(w, h) * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (b.style === 'beams') {
    ctx.translate(w * 0.68, h * 0.34);
    ctx.rotate(-0.4);
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.06 + i * 0.03})`;
      ctx.fillRect(-w * 0.05, i * h * 0.075, w * 0.75, h * 0.032);
    }
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(w * 0.18, h * 0.3, Math.min(w, h) * 0.13, 0, Math.PI * 2);
    ctx.fill();
  } else if (b.style === 'grid') {
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.lineWidth = Math.max(1, w * 0.005);
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.moveTo((w / 8) * i, 0);
      ctx.lineTo((w / 8) * i + w * 0.1, h);
      ctx.stroke();
    }
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(0, (h / 4) * i);
      ctx.lineTo(w, (h / 4) * i + h * 0.08);
      ctx.stroke();
    }
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath();
    ctx.moveTo(w * 0.6, 0); ctx.lineTo(w, 0); ctx.lineTo(w, h); ctx.lineTo(w * 0.78, h);
    ctx.closePath(); ctx.fill();
  } else if (b.style === 'speed') {
    ctx.strokeStyle = 'rgba(255,255,255,.45)';
    ctx.lineWidth = Math.max(1, w * 0.007);
    for (let i = 0; i < 9; i++) {
      const y = (h / 9) * i + ((t * 90) % (h / 9));
      ctx.beginPath();
      ctx.moveTo(-w * 0.1, y);
      ctx.quadraticCurveTo(w * 0.4, y - h * 0.1, w * 1.1, y + h * 0.02);
      ctx.stroke();
    }
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.18, w * 0.45, h * 0.1, -0.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // moving sheen
  const sg = ctx.createLinearGradient(w * ((t * 0.15) % 2 - 1), 0, w * ((t * 0.15) % 2), h * 0.6);
  sg.addColorStop(0, 'rgba(255,255,255,0)');
  sg.addColorStop(0.5, 'rgba(255,255,255,.10)');
  sg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(0, 0, w, h);

  // typography
  const pad = w * 0.06;
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.font = `900 ${Math.round(h * 0.34)}px "Arial Black", Impact, sans-serif`;
  ctx.fillText(b.name, pad * 1.4, h * 0.1 + h * 0.03);
  ctx.fillStyle = b.ink;
  ctx.fillText(b.name, pad, h * 0.1);
  ctx.font = `700 ${Math.round(h * 0.085)}px ui-monospace, monospace`;
  ctx.letterSpacing = '2px';
  ctx.fillText(b.tag, pad * 1.06, h * 0.1 + h * 0.36);
  ctx.letterSpacing = '0px';

  // AD badge
  const bw = Math.max(26, w * 0.085), bh = Math.max(13, h * 0.085);
  ctx.fillStyle = 'rgba(0,0,0,.62)';
  ctx.beginPath();
  ctx.roundRect(w - pad - bw, pad * 0.75, bw, bh, 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `700 ${Math.max(6, Math.round(h * 0.05))}px ui-monospace, monospace`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText('AD', w - pad - bw / 2, pad * 0.75 + bh / 2 + 1);

  if (!compact) {
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.fillRect(0, h * 0.78, w, h * 0.22);
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = `500 ${Math.max(6, Math.round(h * 0.05))}px ui-monospace, monospace`;
    ctx.fillText(b.blurb, pad, h * 0.9);
    ctx.fillStyle = b.ink;
    ctx.textAlign = 'right';
    ctx.font = `700 ${Math.max(6, Math.round(h * 0.055))}px ui-monospace, monospace`;
    ctx.fillText('CLICK TO AGREE', w - pad, h * 0.9);
  }
  ctx.restore();
}

// campaign math helpers -------------------------------------------------------
export function recordImpression(c) {
  if (!c.active) return false;
  c.impressions++;
  c.run.impressions++;
  return true;
}

export function recordClick(c) {
  if (!c.active) return false;
  const b = brandById(c.brand);
  const pay = Math.round(b.payout * (0.9 + Math.random() * 0.25));
  c.clicks++;
  c.run.clicks++;
  c.revenue += pay;
  c.run.revenue += pay;
  c.spend = Math.min(c.budget, c.spend + b.cpc);
  return pay;
}

export function recordClear(c) {
  c.clears++;
  if (c.active) c.budget = Math.max(0, c.budget - 12);
}

export function campaignLive(c) {
  return c.active && c.budget > 0;
}
