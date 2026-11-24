// The game's rules and state, with no drawing and no browser in it: the city
// layout, the player on foot and in a car, traffic, pedestrians, police, the
// wanted level, nine missions, combat and the career numbers. step() advances
// one fixed step and returns what happened as bit flags.
import { CITY, DISTRICTS, MISSIONS, PLAYER, POLICE, WEAPONS } from './config.js';
import { createSeededRandom, rangeRandom } from './random.js';

export const EVENT_MISSION_DONE = 1;
export const EVENT_STAGE_DONE = 2;
export const EVENT_SHOT = 4;
export const EVENT_EXPLOSION = 8;
export const EVENT_WANTED_UP = 16;
export const EVENT_BUSTED = 32;

const CAR_COLORS = [0xd94f3d, 0x3d7dd9, 0xe8c33d, 0x7dd93d, 0xd9d9d9, 0x8a5fd9, 0x222831, 0xff8c42];
const CAR_NAMES = ['Comet GT', 'Vortex S', 'Palmaire', 'Sunrunner', 'Harbor Van', 'Neon Coupe', 'Bay Cruiser', 'Dune Buggy'];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function distance2D(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

export function districtAt(x, z) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x <= d.x1 && z >= d.z0 && z <= d.z1) return d;
  }
  return DISTRICTS[0];
}

export function createWorld(seed) {
  const random = createSeededRandom(seed);

  // --- static city layout: buildings on the grid, palms along the beach road ---
  const buildings = [];
  const palms = [];
  const grid = [];
  for (let gx = -4; gx <= 4; gx += 1) {
    for (let gz = -4; gz <= 4; gz += 1) {
      const cx = gx * (CITY.block + CITY.road);
      const cz = gz * (CITY.block + CITY.road);
      if (cx < -300) continue; // the beach strip stays open to the sea
      const h = 14 + random() * 46 + (Math.abs(gx) <= 1 && Math.abs(gz) <= 1 ? 34 : 0);
      const w = 26 + random() * 22;
      const d = 26 + random() * 22;
      buildings.push({ x: cx + rangeRandom(random, -6, 6), z: cz + rangeRandom(random, -6, 6), w, d, h, hue: random() });
      grid.push({ gx, gz, cx, cz });
    }
  }
  for (let i = 0; i < 46; i += 1) {
    palms.push({ x: -312 + rangeRandom(random, -8, 10), z: -320 + i * 14 + rangeRandom(random, -4, 4), s: 0.8 + random() * 0.5 });
  }
  for (let i = 0; i < 18; i += 1) {
    palms.push({ x: -286 + rangeRandom(random, -6, 6), z: -300 + i * 34 + rangeRandom(random, -4, 4), s: 0.7 + random() * 0.5 });
  }

  // --- traffic: cars looping the street grid ---
  const traffic = [];
  for (let i = 0; i < 16; i += 1) {
    const lane = Math.floor(random() * 9) - 4;
    const along = rangeRandom(random, -320, 320);
    const horizontal = random() < 0.5;
    traffic.push({
      x: horizontal ? along : lane * (CITY.block + CITY.road),
      z: horizontal ? lane * (CITY.block + CITY.road) : along,
      heading: horizontal ? (random() < 0.5 ? 0 : Math.PI) : (random() < 0.5 ? Math.PI / 2 : -Math.PI / 2),
      speed: 9 + random() * 7,
      color: CAR_COLORS[i % CAR_COLORS.length],
      name: CAR_NAMES[i % CAR_NAMES.length],
      turnAt: rangeRandom(random, 4, 12),
    });
  }

  // --- pedestrians strolling the sidewalks and the beach ---
  const pedestrians = [];
  for (let i = 0; i < 26; i += 1) {
    const beach = i < 10;
    pedestrians.push({
      x: beach ? rangeRandom(random, -330, -290) : rangeRandom(random, -300, 300),
      z: beach ? rangeRandom(random, -300, 300) : rangeRandom(random, -300, 300),
      heading: random() * Math.PI * 2,
      speed: 1.2 + random() * 1.6,
      shirt: [0xff5d8f, 0x4fd2ff, 0xffd23d, 0x7dff9b, 0xc86bff][i % 5],
      wander: rangeRandom(random, 2, 8),
    });
  }

  // --- the player's own car, parked on the beachfront road ---
  const playerCar = {
    x: -272, z: 30, heading: Math.PI / 2, speed: 0,
    color: 0xff6a2a, name: 'Comet GT', health: 96, isPlayer: true,
  };

  // --- parked cars the player can steal ---
  const parked = [];
  const parkedSpots = [
    { x: -188, z: -40, heading: 0, color: 0x3d7dd9, name: 'Vortex S' },
    { x: -104, z: 96, heading: Math.PI / 2, color: 0xe8c33d, name: 'Sunrunner' },
    { x: -20, z: -180, heading: Math.PI, color: 0x8a5fd9, name: 'Neon Coupe' },
    { x: 120, z: 60, heading: -Math.PI / 2, color: 0x7dd93d, name: 'Bay Cruiser' },
    { x: -272, z: -120, heading: Math.PI / 2, color: 0xd9d9d9, name: 'Palmaire' },
  ];
  for (const spot of parkedSpots) {
    parked.push({ ...spot, speed: 0, health: 100, isPlayer: false, stolen: false });
  }

  const police = [];
  const explosions = [];
  const pickups = [];

  const state = {
    time: 0,
    cash: 18700,
    rp: 12480,
    rank: 'STREET BOSS',
    wanted: 3,
    health: 100,
    missionIndex: 2,
    missionStage: 1,
    missionTimer: 161,
    missionDone: [true, true, false, false, false, false, false, false, false],
    missionRating: ['GOLD', 'SILVER', '', '', '', '', '', '', ''],
    completedCount: 2,
    respect: 58,
    inCar: true,
    car: playerCar,
    player: { x: -272, z: 30, heading: Math.PI / 2, onFoot: false },
    weaponIndex: 1,
    weapons: WEAPONS.map((w) => ({ ...w })),
    abilityCooldown: [0, 0, 0],
    ghostUntil: 0,
    slipUntil: 0,
    deadeyeUntil: 0,
    shotsFired: 0,
    carsStolen: 1,
    distanceDriven: 0,
    radioIndex: 0,
    dialogIndex: 0,
    busted: false,
    banner: null,
    bannerUntil: 0,
    cameraMode: 'chase',
  };

  function reset() {
    state.time = 0;
    state.cash = 18700;
    state.rp = 12480;
    state.wanted = 3;
    state.health = 100;
    state.missionIndex = 2;
    state.missionStage = 1;
    state.missionTimer = 161;
    state.inCar = true;
    state.car = playerCar;
    state.player.x = playerCar.x;
    state.player.z = playerCar.z;
    state.player.heading = playerCar.heading;
    state.player.onFoot = false;
    state.busted = false;
    state.banner = null;
    playerCar.x = -272;
    playerCar.z = 30;
    playerCar.heading = Math.PI / 2;
    playerCar.speed = 0;
    playerCar.health = 96;
    for (const p of police) p.active = false;
    for (const e of explosions) e.life = 0;
    for (const k of pickups) k.taken = false;
  }

  function currentMission() {
    return MISSIONS[state.missionIndex];
  }

  function missionTarget() {
    const m = currentMission();
    // Later stages push the target a little further along the same district.
    const push = (state.missionStage - 1) * 26;
    return { x: m.target.x + push * 0.4, z: m.target.z - push };
  }

  function nearestCar() {
    let best = null;
    let bestDist = PLAYER.enterRange;
    const all = [playerCar, ...parked, ...traffic];
    for (const car of all) {
      const d = distance2D(state.player, car);
      if (d < bestDist) {
        bestDist = d;
        best = car;
      }
    }
    return best;
  }

  function spawnPolice() {
    const want = state.wanted >= 3 ? 3 : state.wanted;
    let active = 0;
    for (const p of police) if (p.active) active += 1;
    while (active < want) {
      let slot = police.find((p) => !p.active);
      if (!slot) {
        slot = { active: false, x: 0, z: 0, heading: 0, speed: 0, health: 100, kind: 'cruiser' };
        police.push(slot);
      }
      const a = random() * Math.PI * 2;
      slot.active = true;
      slot.x = state.player.x + Math.cos(a) * POLICE.spawnRange;
      slot.z = state.player.z + Math.sin(a) * POLICE.spawnRange;
      slot.heading = a;
      slot.speed = 0;
      slot.health = 100;
      active += 1;
    }
    for (const p of police) {
      if (p.active && p.health <= 0) p.active = false;
    }
  }

  function explodeAt(x, z) {
    explosions.push({ x, z, life: 1.4, max: 1.4 });
    if (explosions.length > 6) explosions.shift();
  }

  function useAbility(index) {
    if (state.abilityCooldown[index] > 0) return false;
    state.abilityCooldown[index] = 30;
    if (index === 0) {
      state.wanted = Math.max(0, state.wanted - 1);
      state.ghostUntil = state.time + 20;
    } else if (index === 1) {
      state.slipUntil = state.time + 12;
    } else {
      state.deadeyeUntil = state.time + 10;
    }
    return true;
  }

  function shoot() {
    const weapon = state.weapons[state.weaponIndex];
    if (weapon.ammo !== Infinity) {
      if (weapon.ammo <= 0) return 0;
      weapon.ammo -= 1;
    }
    state.shotsFired += 1;
    const damage = weapon.damage * (state.time < state.deadeyeUntil ? 2 : 1);
    // Hitscan forward from the player: nearest police car in a cone takes the hit.
    let best = null;
    let bestDist = 90;
    for (const p of police) {
      if (!p.active) continue;
      const dx = p.x - state.player.x;
      const dz = p.z - state.player.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d > bestDist) continue;
      const ang = Math.atan2(dz, dx) - state.player.heading;
      const wrapped = Math.atan2(Math.sin(ang), Math.cos(ang));
      if (Math.abs(wrapped) < 0.45) {
        bestDist = d;
        best = p;
      }
    }
    if (best) {
      best.health -= damage;
      if (best.health <= 0) {
        best.active = false;
        explodeAt(best.x, best.z);
        state.cash += 150;
        return EVENT_SHOT | EVENT_EXPLOSION;
      }
    }
    if (state.wanted < 5) {
      state.wanted += 1;
      return EVENT_SHOT | EVENT_WANTED_UP;
    }
    return EVENT_SHOT;
  }

  function completeMission() {
    const m = currentMission();
    const rating = state.missionTimer < 200 ? 'GOLD' : state.missionTimer < 320 ? 'SILVER' : 'BRONZE';
    state.missionRating[state.missionIndex] = rating;
    state.missionDone[state.missionIndex] = true;
    state.completedCount += 1;
    state.cash += m.reward;
    state.rp += m.rp;
    state.wanted = Math.max(0, state.wanted - 1);
    state.banner = { big: 'MISSION PASSED', small: `RATING: ${rating}  •  +$${m.reward.toLocaleString('en-US')}  •  +${m.rp} RP` };
    state.bannerUntil = state.time + 4;
    const next = (state.missionIndex + 1) % MISSIONS.length;
    state.missionIndex = next;
    state.missionStage = 0;
    state.missionTimer = 0;
    state.dialogIndex = (state.dialogIndex + 1) % 4;
    return EVENT_MISSION_DONE;
  }

  function step(dt, input, harmless) {
    let events = 0;
    state.time += dt;
    if (state.missionTimer < 9999) state.missionTimer += dt;
    for (let i = 0; i < 3; i += 1) {
      if (state.abilityCooldown[i] > 0) state.abilityCooldown[i] = Math.max(0, state.abilityCooldown[i] - dt);
    }
    if (state.banner && state.time > state.bannerUntil) state.banner = null;

    // --- player movement ---
    const car = state.inCar ? state.car : null;
    if (car) {
      const boost = state.time < state.slipUntil ? 1.4 : 1;
      const maxSpeed = PLAYER.carMaxSpeed * boost;
      if (input.forward) car.speed += PLAYER.carAccel * dt;
      if (input.back) car.speed -= PLAYER.carBrake * dt;
      car.speed -= car.speed * 0.6 * dt;
      car.speed = clamp(car.speed, -14, maxSpeed);
      const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
      car.heading += steer * PLAYER.carTurn * dt * clamp(Math.abs(car.speed) / 14, 0, 1) * (car.speed >= 0 ? 1 : -1);
      const nx = car.x + Math.sin(car.heading) * car.speed * dt;
      const nz = car.z + Math.cos(car.heading) * car.speed * dt;
      car.x = clamp(nx, -336, 336);
      car.z = clamp(nz, -336, 336);
      state.distanceDriven += Math.abs(car.speed) * dt;
      state.player.x = car.x;
      state.player.z = car.z;
      state.player.heading = car.heading;
      if (Math.abs(car.speed) > 30 && state.wanted < 2) {
        state.wanted = 2;
        events |= EVENT_WANTED_UP;
      }
    } else {
      const speed = input.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
      const fwd = (input.forward ? 1 : 0) - (input.back ? 1 : 0);
      const strafe = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      const hx = Math.sin(state.player.heading);
      const hz = Math.cos(state.player.heading);
      state.player.x = clamp(state.player.x + (hx * fwd + hz * strafe) * speed * dt, -336, 336);
      state.player.z = clamp(state.player.z + (hz * fwd - hx * strafe) * speed * dt, -336, 336);
      if (input.turn !== 0) state.player.heading += input.turn * 2.4 * dt;
    }

    // --- enter / exit car ---
    if (input.enter) {
      if (state.inCar) {
        state.inCar = false;
        state.player.onFoot = true;
        state.player.x = state.car.x - Math.sin(state.car.heading + Math.PI / 2) * 3;
        state.player.z = state.car.z - Math.cos(state.car.heading + Math.PI / 2) * 3;
      } else {
        const near = nearestCar();
        if (near) {
          state.inCar = true;
          state.car = near;
          state.player.onFoot = false;
          if (near.isPlayer !== true && !near.stolen) {
            near.stolen = true;
            state.carsStolen += 1;
            state.cash += 50;
          }
        }
      }
    }

    // --- abilities & weapons ---
    if (input.ability >= 0) useAbility(input.ability);
    if (input.weapon >= 0 && input.weapon < state.weapons.length) {
      const w = state.weapons[input.weapon];
      if (!w.locked) state.weaponIndex = input.weapon;
    }
    if (input.shoot && !state.inCar && !harmless) events |= shoot();
    if (input.shoot && state.inCar) {
      // Drive-by honk: harmless, but the crowd notices.
      if (state.wanted < 1) state.wanted = 1;
    }

    // --- mission progress: reach the waypoint ---
    const target = missionTarget();
    if (distance2D(state.player, target) < 14) {
      state.missionStage += 1;
      if (state.missionStage >= currentMission().stages) {
        events |= completeMission();
      } else {
        events |= EVENT_STAGE_DONE;
        state.cash += 100;
      }
    }

    // --- traffic: loop the grid, turn at intersections ---
    for (const t of traffic) {
      t.turnAt -= dt;
      if (t.turnAt <= 0) {
        t.heading += (random() < 0.5 ? 1 : -1) * Math.PI / 2;
        t.turnAt = rangeRandom(random, 5, 14);
      }
      t.x += Math.sin(t.heading) * t.speed * dt;
      t.z += Math.cos(t.heading) * t.speed * dt;
      if (t.x > 336) { t.x = -336; }
      if (t.x < -336) { t.x = 336; }
      if (t.z > 336) { t.z = -336; }
      if (t.z < -336) { t.z = 336; }
    }

    // --- pedestrians wander ---
    for (const p of pedestrians) {
      p.wander -= dt;
      if (p.wander <= 0) {
        p.heading = random() * Math.PI * 2;
        p.wander = rangeRandom(random, 2, 9);
      }
      p.x = clamp(p.x + Math.sin(p.heading) * p.speed * dt, -336, 336);
      p.z = clamp(p.z + Math.cos(p.heading) * p.speed * dt, -336, 336);
    }

    // --- police chase ---
    if (state.wanted > 0 && !harmless) spawnPolice();
    for (const p of police) {
      if (!p.active) continue;
      const dx = state.player.x - p.x;
      const dz = state.player.z - p.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      const wantHeading = Math.atan2(dx, dz);
      let diff = wantHeading - p.heading;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      p.heading += clamp(diff, -2.2 * dt, 2.2 * dt);
      p.speed = Math.min(POLICE.chaseSpeed, p.speed + 12 * dt);
      p.x += Math.sin(p.heading) * p.speed * dt;
      p.z += Math.cos(p.heading) * p.speed * dt;
      if (d < 4.5) {
        // A ram: the player car takes damage, the cruiser bounces off.
        if (state.inCar) state.car.health = Math.max(0, state.car.health - POLICE.ramDamage * dt * 10);
        p.speed *= 0.4;
        p.x -= Math.sin(p.heading) * 3;
        p.z -= Math.cos(p.heading) * 3;
      }
      if (state.inCar && state.car.health <= 0) {
        explodeAt(state.car.x, state.car.z);
        state.inCar = false;
        state.player.onFoot = true;
        state.car = playerCar;
        state.wanted = Math.min(5, state.wanted + 1);
        events |= EVENT_EXPLOSION | EVENT_WANTED_UP;
      }
    }

    // --- explosions fade ---
    for (const e of explosions) e.life -= dt;
    for (let i = explosions.length - 1; i >= 0; i -= 1) {
      if (explosions[i].life <= 0) explosions.splice(i, 1);
    }

    // --- wanted decays when the player stays calm and out of sight ---
    if (state.wanted > 0 && state.time > state.ghostUntil && Math.abs(car ? car.speed : 0) < 2 && !input.shoot) {
      // Very slow decay: only after 25 quiet seconds.
      state._quiet = (state._quiet || 0) + dt;
      if (state._quiet > 25) {
        state.wanted -= 1;
        state._quiet = 0;
      }
    } else {
      state._quiet = 0;
    }

    // --- busted: health hits zero on foot ---
    if (state.health <= 0 && !state.busted) {
      state.busted = true;
      events |= EVENT_BUSTED;
    }
    return events;
  }

  reset();
  return {
    state, buildings, palms, traffic, pedestrians, parked, police, explosions,
    playerCar, reset, step, currentMission, missionTarget, districtAt: () => districtAt(state.player.x, state.player.z),
  };
}

// --- save slots (localStorage) ---
export function readSaves() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return [null, null, null];
    const parsed = JSON.parse(raw);
    return [parsed[0] ?? null, parsed[1] ?? null, parsed[2] ?? null];
  } catch {
    return [null, null, null];
  }
}

export function writeSave(slot, snapshot) {
  try {
    const saves = readSaves();
    saves[slot] = { ...snapshot, savedAt: new Date().toISOString() };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(saves));
    return true;
  } catch {
    return false;
  }
}
