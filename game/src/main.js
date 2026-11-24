// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps, the 3D scene and the HUD paint what is there. The game moves
// between four screens: title, play, paused (full map) and busted.
//
// ?shot=cover|chase|mission|map (with &seed=N) stages that scene instead of
// running the loop, paints it a few times and sets window.__shotReady.
import { STEP, MISSIONS } from './config.js';
import { createSeededRandom } from './random.js';
import { createWorld, readSaves, writeSave, EVENT_MISSION_DONE, EVENT_STAGE_DONE, EVENT_SHOT, EVENT_EXPLOSION, EVENT_WANTED_UP, EVENT_BUSTED } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { createScene3D } from './scene3d.js';
import { createHud } from './hud.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261124;

const canvas = document.getElementById('scene');
const srstatus = document.getElementById('srstatus');
const world = createWorld(seed);
const view = createScene3D(canvas, world);
const hud = createHud(world);
const audio = createAudio();
const input = createInput(canvas);

let screen = 'title';
let selectedSlot = 0;
let lastTime = performance.now();

function announce(message) {
  srstatus.textContent = message;
}

function snapshot() {
  const s = world.state;
  return {
    missionIndex: s.missionIndex,
    missionName: MISSIONS[s.missionIndex].name,
    cash: s.cash,
    rp: s.rp,
    completed: s.completedCount,
    wanted: s.wanted,
  };
}

function applySave(save) {
  if (!save) return;
  const s = world.state;
  s.missionIndex = save.missionIndex ?? 2;
  s.missionStage = 0;
  s.missionTimer = 0;
  s.cash = save.cash ?? s.cash;
  s.rp = save.rp ?? s.rp;
  s.completedCount = save.completed ?? s.completedCount;
  s.wanted = save.wanted ?? 1;
}

function showTitle() {
  screen = 'title';
  document.getElementById('title').style.display = 'flex';
  document.getElementById('pause').style.display = 'none';
  hud.renderSlots('slots', selectedSlot);
  announce('Solmar Bay Sunset Run. Press Enter to play.');
}

function startGame() {
  const saves = readSaves();
  if (saves[selectedSlot]) applySave(saves[selectedSlot]);
  world.state.busted = false;
  screen = 'play';
  document.getElementById('title').style.display = 'none';
  document.getElementById('pause').style.display = 'none';
  audio.start();
  announce(`Playing. Job ${world.state.missionIndex + 1} of 9: ${MISSIONS[world.state.missionIndex].name}.`);
}

function showPause() {
  screen = 'paused';
  document.getElementById('pause').style.display = 'flex';
  hud.renderPause();
  announce('Paused. Map open.');
}

function hidePause() {
  screen = 'play';
  document.getElementById('pause').style.display = 'none';
  announce('Playing.');
}

function runShot(name) {
  const staged = stageShot(name, world);
  screen = staged.screen;
  document.getElementById('title').style.display = 'none';
  if (screen === 'paused') {
    document.getElementById('pause').style.display = 'flex';
    hud.renderPause();
  }
  let painted = 0;
  function paint() {
    const now = performance.now();
    // First paint snaps the chase camera onto the player; later paints use
    // the real frame time.
    const dt = painted === 0 ? 1 : Math.min((now - lastTime) / 1000, MAX_FRAME);
    lastTime = now;
    hud.update(screen, world.state.time);
    view.render(world.state, staged.mode, world.state.time, dt);
    painted += 1;
    if (painted < 4) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let accumulator = 0;

  function handleEvents(events) {
    const s = world.state;
    if (events & EVENT_MISSION_DONE) {
      hud.toast(`JOB COMPLETE — ${MISSIONS[(s.missionIndex + 8) % 9].name}`);
      audio.blip(880, 0.3, 0.12);
      announce('Mission passed.');
    } else if (events & EVENT_STAGE_DONE) {
      hud.toast('OBJECTIVE COMPLETE +$100');
      audio.blip(660, 0.15, 0.1);
    }
    if (events & EVENT_SHOT) audio.shot();
    if (events & EVENT_EXPLOSION) {
      hud.toast('VEHICLE DESTROYED +$150');
      audio.blip(120, 0.4, 0.18);
    }
    if (events & EVENT_WANTED_UP) {
      hud.toast(`WANTED LEVEL ${s.wanted} — SBPD ON YOU`);
    }
    if (events & EVENT_BUSTED) {
      screen = 'title';
      document.getElementById('title').style.display = 'flex';
      hud.renderSlots('slots', selectedSlot);
      announce('Busted. Press Enter to play again.');
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - lastTime) / 1000, MAX_FRAME);
    lastTime = now;
    const actions = input.takeActions();
    if (screen === 'title' && (actions & ACTION_CONFIRM)) startGame();
    else if (screen === 'play' && (actions & ACTION_PAUSE)) showPause();
    else if (screen === 'paused' && (actions & ACTION_PAUSE)) hidePause();

    if (screen === 'play') {
      accumulator += dt;
      while (accumulator >= STEP) {
        const events = world.step(STEP, input.frame(), false);
        handleEvents(events);
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
      // The title screen's backdrop stays alive: traffic cruises, the sun hangs.
      if (screen === 'title') {
        world.state.time += dt;
        view.render(world.state, 'title', world.state.time, dt);
        hud.update('title', world.state.time);
        return;
      }
    }
    const s = world.state;
    audio.setEngine(s.inCar ? s.car.speed : 0, s.inCar);
    audio.setSiren(s.wanted);
    hud.update(screen, s.time);
    view.render(world.state, screen === 'paused' ? 'map' : 'play', s.time, dt);
  }

  document.getElementById('titlecard').addEventListener('click', (event) => {
    const slotEl = event.target.closest('.slot');
    if (slotEl) {
      selectedSlot = Number(slotEl.dataset.slot);
      hud.renderSlots('slots', selectedSlot);
      return;
    }
    if (screen === 'title') startGame();
  });
  document.getElementById('pauseslots').addEventListener('click', (event) => {
    const slotEl = event.target.closest('.slot');
    if (!slotEl) return;
    const slot = Number(slotEl.dataset.slot);
    if (writeSave(slot, snapshot())) {
      hud.toast(`SAVED TO SLOT ${slot + 1}`);
      hud.renderPause();
    }
  });
  window.addEventListener('keydown', () => audio.start(), { once: true });
  window.addEventListener('pointerdown', () => audio.start(), { once: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === 'play') showPause();
  });

  showTitle();
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
