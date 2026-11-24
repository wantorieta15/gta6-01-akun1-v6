// The HUD: every DOM panel (mission, dispatch, wanted, speedometer, weapons,
// crew abilities, dialog, radio, district standing), the round minimap and the
// big pause map, all drawn from the world state each frame.
import { CITY, DIALOGS, DISPATCH_UNITS, DISTRICTS, MISSIONS, RADIO, WEAPONS } from './config.js';
import { readSaves } from './world.js';

const $ = (id) => document.getElementById(id);

function fmtTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function fmtMoney(n) {
  return `$${Math.floor(n).toLocaleString('en-US')}`;
}

export function createHud(world) {
  const minimap = $('minimap');
  const mctx = minimap.getContext('2d');
  const bigmap = $('bigmap');
  const bctx = bigmap.getContext('2d');
  let lastDialog = -1;
  let lastDispatchTick = -1;
  let weaponHtml = '';

  function drawMap(ctx, size, showLabels) {
    const scale = size / (CITY.half * 2 + 60);
    const toPx = (x, z) => [(x + CITY.half + 30) * scale, (z + CITY.half + 30) * scale];
    ctx.clearRect(0, 0, size, size);
    // Ocean + sand on the west edge.
    ctx.fillStyle = '#123a52';
    ctx.fillRect(0, 0, size, size);
    const [sx] = toPx(-CITY.half - 30, 0);
    ctx.fillStyle = '#1e6f8e';
    ctx.fillRect(0, 0, Math.max(0, toPx(-386, 0)[0]), size);
    ctx.fillStyle = '#e8c98f';
    ctx.fillRect(toPx(-386, 0)[0], 0, toPx(-340, 0)[0] - toPx(-386, 0)[0], size);
    // Districts.
    for (const d of DISTRICTS) {
      const [x0, z0] = toPx(d.x0, d.z0);
      const [x1, z1] = toPx(d.x1, d.z1);
      ctx.fillStyle = d.color + '2e';
      ctx.fillRect(x0, z0, x1 - x0, z1 - z0);
      ctx.strokeStyle = d.color + '88';
      ctx.lineWidth = 1;
      ctx.strokeRect(x0, z0, x1 - x0, z1 - z0);
      if (showLabels) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `700 ${Math.round(size / 34)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(d.name.toUpperCase(), (x0 + x1) / 2, (z0 + z1) / 2);
      }
    }
    // Streets.
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = Math.max(1, size / 300);
    for (let g = -4; g <= 4; g += 1) {
      const c = g * (CITY.block + CITY.road);
      const [ax] = toPx(c, 0);
      const [, bz] = toPx(0, c);
      ctx.beginPath(); ctx.moveTo(ax, 0); ctx.lineTo(ax, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, bz); ctx.lineTo(size, bz); ctx.stroke();
    }
    // Mission target.
    const target = world.missionTarget();
    const [tx, tz] = toPx(target.x, target.z);
    ctx.fillStyle = '#ffd23d';
    ctx.beginPath();
    ctx.arc(tx, tz, size / 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd23d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tx, tz, size / 30, 0, Math.PI * 2);
    ctx.stroke();
    // Police.
    for (const p of world.police) {
      if (!p.active) continue;
      const [px, pz] = toPx(p.x, p.z);
      ctx.fillStyle = '#ff5d5d';
      ctx.beginPath();
      ctx.arc(px, pz, size / 60, 0, Math.PI * 2);
      ctx.fill();
    }
    // Player arrow, rotated by heading.
    const s = world.state;
    const [px, pz] = toPx(s.player.x, s.player.z);
    ctx.save();
    ctx.translate(px, pz);
    ctx.rotate(Math.atan2(Math.sin(s.player.heading), Math.cos(s.player.heading)) + Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -size / 34);
    ctx.lineTo(size / 52, size / 40);
    ctx.lineTo(-size / 52, size / 40);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    if (showLabels) {
      ctx.fillStyle = '#ffffff';
      ctx.font = `800 ${Math.round(size / 30)}px system-ui, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText('N ↑', size * 0.03, size * 0.06);
    }
    return toPx;
  }

  function renderWeapons() {
    const s = world.state;
    const html = s.weapons.map((w, i) => {
      const cls = `wslot${i === s.weaponIndex ? ' active' : ''}${w.locked ? ' locked' : ''}`;
      const ammo = w.locked ? 'LOCKED' : (w.ammo === Infinity ? '∞' : `${w.ammo}`);
      return `<div class="${cls}"><div class="wnum">${i + 1}</div><div class="wname">${w.name}</div><div class="wammo">${ammo}</div></div>`;
    }).join('');
    if (html !== weaponHtml) {
      weaponHtml = html;
      $('weapons').innerHTML = html;
    }
  }

  function renderDispatch() {
    const s = world.state;
    const rows = DISPATCH_UNITS.map((u, i) => {
      // Distance is live: each unit sits a different offset from the player.
      const base = 40 + i * 55;
      const dist = Math.round(base + Math.abs(Math.sin(s.time * 0.3 + i * 1.7)) * 260 + (s.wanted >= 3 && i === 1 ? 120 : 0));
      return `<div class="unit"><span><span class="uname">${u.name}</span><span class="urole">${u.role}</span></span><span class="dist">${dist} m</span><span class="tag ${u.tagClass}">${u.tag}</span></div>`;
    }).join('');
    $('units').innerHTML = rows;
  }

  function renderSlots(into, selected) {
    const saves = readSaves();
    const html = [0, 1, 2].map((i) => {
      const sv = saves[i];
      const info = sv
        ? `${sv.missionName}<br>Cash ${fmtMoney(sv.cash)} • ${sv.completed} jobs • ${new Date(sv.savedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`
        : 'Empty slot<br>Start a new run';
      return `<div class="slot${i === selected ? ' sel' : ''}" data-slot="${i}"><div class="sname">SAVE ${i + 1}</div><div class="sinfo">${info}</div></div>`;
    }).join('');
    $(into).innerHTML = html;
  }

  function renderPause() {
    const s = world.state;
    const m = MISSIONS[s.missionIndex];
    $('career').innerHTML = [
      ['Cash', fmtMoney(s.cash)],
      ['Rank', `${s.rank} • ${s.rp.toLocaleString('en-US')} RP`],
      ['Jobs done', `${s.completedCount} / 9`],
      ['Wanted', '★'.repeat(s.wanted) + '☆'.repeat(5 - s.wanted)],
      ['Cars stolen', `${s.carsStolen}`],
      ['Shots fired', `${s.shotsFired}`],
      ['Distance driven', `${(s.distanceDriven / 1000).toFixed(1)} km`],
      ['Play time', fmtTime(s.time)],
    ].map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('');
    $('missionlist').innerHTML = MISSIONS.map((job, i) => {
      const done = s.missionDone[i];
      const active = i === s.missionIndex;
      const mark = done ? `<span class="done">✓ ${s.missionRating[i] || 'DONE'}</span>`
        : active ? '<span class="active">▶ IN PROGRESS</span>' : '<span class="todo">—</span>';
      return `<div class="mrow"><span>${i + 1}. ${job.name}</span>${mark}</div>`;
    }).join('');
    $('standlist').innerHTML = DISTRICTS.map((d) => {
      const standing = d.name === 'Palm Row' ? Math.min(100, s.respect) : d.standing;
      return `<div class="standrow"><span>${d.name}</span><span class="bar"><i style="width:${standing}%"></i></span><b>${standing}</b></div>`;
    }).join('');
    renderSlots('pauseslots', -1);
    drawMap(bctx, 1040, true);
  }

  function update(screen, time) {
    const s = world.state;
    const m = MISSIONS[s.missionIndex];
    $('joblabel').textContent = `JOB ${s.missionIndex + 1} / 9`;
    $('missionname').textContent = m.name;
    $('stagefill').style.width = `${Math.round((s.missionStage / m.stages) * 100)}%`;
    $('nextobj').textContent = `NEXT: ${m.objective}`;
    $('missiontimer').textContent = `⏱ ${fmtTime(s.missionTimer)}  •  STAGE ${Math.min(s.missionStage + 1, m.stages)} / ${m.stages}`;
    $('cash').textContent = fmtMoney(s.cash);
    $('stars').innerHTML = '★'.repeat(s.wanted) + `<span class="off">${'☆'.repeat(5 - s.wanted)}</span>`;
    $('rankline').textContent = `RANK: ${s.rank} • RP ${s.rp.toLocaleString('en-US')}`;
    $('rpfill').style.width = `${Math.min(100, (s.rp % 5000) / 50)}%`;
    const d = world.districtAt();
    $('dname').textContent = d.name;
    $('dstand').textContent = `STANDING: ${d.standing >= 50 ? 'RESPECTED' : d.standing >= 30 ? 'KNOWN' : 'UNKNOWN'} • +${d.name === 'Palm Row' ? s.respect : d.standing}`;
    $('standfill').style.width = `${d.name === 'Palm Row' ? s.respect : d.standing}%`;
    const radio = RADIO[s.radioIndex % RADIO.length];
    $('track').textContent = radio.track;
    $('radioclock').textContent = `18:${String(42 + Math.floor(time / 60) % 18).padStart(2, '0')}`;
    const dlg = DIALOGS[s.dialogIndex % DIALOGS.length];
    if (s.dialogIndex !== lastDialog) {
      lastDialog = s.dialogIndex;
      $('portrait').textContent = dlg.face;
      $('dlgwho').innerHTML = `${dlg.who} — <span>${dlg.role}</span>`;
      $('dlgline').textContent = dlg.line;
    }
    for (let i = 0; i < 3; i += 1) {
      const el = $(['abilz', 'abilx', 'abilc'][i]);
      const cd = s.abilityCooldown[i];
      el.textContent = cd > 0 ? `${Math.ceil(cd)}s` : 'READY';
      el.style.color = cd > 0 ? '#ff8f8f' : '#7dff9b';
    }
    renderWeapons();
    const dispatchTick = Math.floor(time * 2);
    if (dispatchTick !== lastDispatchTick) {
      lastDispatchTick = dispatchTick;
      renderDispatch();
    }
    const speedMph = s.inCar ? Math.round(Math.abs(s.car.speed) * 2.2) : Math.round(0);
    $('carname').textContent = s.inCar ? `${s.car.name.toUpperCase()} — DRIVING` : 'ON FOOT';
    $('speed').innerHTML = `${s.inCar ? speedMph : '—'}<small> MPH</small>`;
    $('cond').textContent = s.inCar
      ? `CONDITION ${Math.round(s.car.health)}% • GEAR ${speedMph > 60 ? '4' : speedMph > 30 ? '3' : speedMph > 8 ? '2' : 'D'}`
      : `HEALTH ${Math.round(s.health)}% • ON FOOT`;
    drawMap(mctx, 352, false);
    if (s.banner) {
      $('banner').style.display = 'block';
      $('bannerbig').textContent = s.banner.big;
      $('bannersmall').textContent = s.banner.small;
    } else {
      $('banner').style.display = 'none';
    }
  }

  function toast(message) {
    const el = $('toast');
    el.textContent = message;
    el.style.display = 'block';
    window.setTimeout(() => { el.style.display = 'none'; }, 2600);
  }

  return { update, renderSlots, renderPause, toast };
}
