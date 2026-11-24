// The screenshot scenes behind ?shot=cover|chase|mission|map. Each one stages
// the real world — the same rules, the same HUD — at a fixed moment, then the
// page paints it a few times and sets window.__shotReady. The same seed always
// gives the same frame.
import { STEP } from './config.js';

function driveForward(world, seconds) {
  const input = { forward: true, back: false, left: false, right: false, run: false, turn: 0, enter: false, shoot: false, ability: -1, weapon: -1 };
  for (let i = 0; i < seconds / STEP; i += 1) world.step(STEP, input, false);
}

function parkPolice(world, offsets) {
  // Force the police pool into the exact spots the shot wants, then let one
  // chase step settle their headings.
  const s = world.state;
  for (let i = 0; i < offsets.length; i += 1) {
    const slot = world.police[i] ?? { active: false, x: 0, z: 0, heading: 0, speed: 0, health: 100 };
    if (!world.police[i]) world.police.push(slot);
    slot.active = true;
    slot.x = s.player.x + offsets[i][0];
    slot.z = s.player.z + offsets[i][1];
    slot.heading = offsets[i][2];
    slot.speed = 30;
    slot.health = 100;
  }
}

function stageCover(world) {
  world.reset();
  const s = world.state;
  s.missionIndex = 2;
  s.missionStage = 1;
  s.missionTimer = 161;
  s.wanted = 3;
  s.cash = 18700;
  s.rp = 12480;
  s.dialogIndex = 0;
  s.radioIndex = 0;
  s.inCar = true;
  s.car = world.playerCar;
  // Beachfront road west of the tower line, nose pointed west — straight at
  // the ocean and the sunset, no dark tower in the frame. z=51 sits between
  // the palm rows so no palm trunk stands on the camera axis.
  world.playerCar.x = -296;
  world.playerCar.z = 51;
  world.playerCar.heading = -Math.PI / 2;
  world.playerCar.speed = 38;
  world.playerCar.health = 96;
  s.player.x = -296;
  s.player.z = 51;
  s.player.heading = -Math.PI / 2;
  driveForward(world, 0.2);
  // A burning wreck ahead-left, police closing in ahead of the player, and
  // the heli swung around to the west so it hangs in the frame, not behind
  // the camera (time 9 puts its orbit angle near PI, ahead of the player).
  world.explosions.push({ x: -336, z: 40, life: 1.2, max: 1.4 });
  parkPolice(world, [[-34, 16, Math.PI / 2], [-46, -18, Math.PI / 2], [-28, 36, Math.PI / 2]]);
  s.time = 9;
  return { screen: 'play', mode: 'play' };
}

function stageChase(world) {
  world.reset();
  const s = world.state;
  s.missionIndex = 4;
  s.missionStage = 2;
  s.missionTimer = 204;
  s.wanted = 4;
  s.cash = 21400;
  s.rp = 13900;
  s.dialogIndex = 1;
  s.radioIndex = 2;
  s.inCar = true;
  s.car = world.playerCar;
  world.playerCar.x = -40;
  world.playerCar.z = -120;
  world.playerCar.heading = 0;
  world.playerCar.speed = 42;
  world.playerCar.health = 81;
  s.player.x = -40;
  s.player.z = -120;
  s.player.heading = 0;
  driveForward(world, 0.8);
  // Police ahead of the player (north, +z), facing back toward the chase,
  // heli swung to the west side of the frame.
  parkPolice(world, [[16, 36, Math.PI], [-18, 42, Math.PI], [34, 22, Math.PI / 2], [-40, 28, 0]]);
  s.time = 9;
  return { screen: 'play', mode: 'play' };
}

function stageMission(world) {
  world.reset();
  const s = world.state;
  s.missionIndex = 5;
  s.missionStage = 1;
  s.missionTimer = 96;
  s.wanted = 2;
  s.cash = 24100;
  s.rp = 15200;
  s.dialogIndex = 3;
  s.radioIndex = 1;
  s.inCar = false;
  s.car = world.playerCar;
  // On foot on the beach, facing the ocean: umbrellas, kiosks and sailboats
  // all around, the briefcase waypoint just ahead. The player stands well
  // clear of the waypoint (34 m) so staging never completes the mission.
  s.player.x = -334;
  s.player.z = 84;
  s.player.heading = -Math.PI / 2;
  s.player.onFoot = true;
  world.playerCar.x = -272;
  world.playerCar.z = 30;
  world.playerCar.heading = Math.PI / 2;
  world.playerCar.speed = 0;
  s.banner = { big: 'MISSION PASSED', small: 'RATING: GOLD  •  +$2,800  •  +1,000 RP' };
  s.bannerUntil = 99999;
  // Police ahead on the sand (west), facing back toward the player.
  parkPolice(world, [[-30, 24, Math.PI / 2], [-38, -20, Math.PI / 2]]);
  return { screen: 'play', mode: 'play' };
}

function stageMap(world) {
  world.reset();
  const s = world.state;
  s.missionIndex = 6;
  s.missionStage = 1;
  s.missionTimer = 240;
  s.wanted = 2;
  s.cash = 26900;
  s.rp = 16800;
  s.dialogIndex = 2;
  s.missionDone = [true, true, true, true, true, false, false, false, false];
  s.missionRating = ['GOLD', 'SILVER', 'GOLD', 'SILVER', 'BRONZE', '', '', '', ''];
  s.completedCount = 5;
  return { screen: 'paused', mode: 'map' };
}

/** Set `world` to the named scene and return the screen and camera mode to draw. */
export function stageShot(name, world) {
  if (name === 'chase') return stageChase(world);
  if (name === 'mission') return stageMission(world);
  if (name === 'map') return stageMap(world);
  return stageCover(world);
}
