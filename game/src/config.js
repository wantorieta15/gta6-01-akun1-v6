// Every tuning number, name and story beat in one place. Solmar Bay is a fictional
// beachfront city: six named districts around a grid of streets, a beach and an ocean
// on the west edge, and a sunset that never quite sets.

export const STEP = 1 / 60;
export const CITY = { half: 340, block: 68, road: 16 };
export const SAVE_KEY = 'solmar-bay-sunset-run-v6.saves';

// The world runs west (beach, negative x) to east (harbour, positive x),
// south (negative z) to north (positive z). The sun sets over the ocean, west.
export const DISTRICTS = [
  { name: 'Palm Row', x0: -340, z0: -120, x1: -200, z1: 140, standing: 58, color: '#ff9a3d', note: 'Beachfront strip, palms and piers' },
  { name: 'Marina', x0: -200, z0: 140, x1: -40, z1: 340, standing: 41, color: '#4fd2ff', note: 'Yachts, fish stalls, dawn deals' },
  { name: 'Downtown', x0: -200, z0: -120, x1: 60, z1: 140, standing: 33, color: '#ffd23d', note: 'Glass towers and the bank' },
  { name: 'Old Town', x0: -200, z0: -340, x1: 60, z1: -120, standing: 47, color: '#c86bff', note: 'Brick lanes, old money, old grudges' },
  { name: 'Sunset Strip', x0: -340, z0: -340, x1: -200, z1: -120, standing: 62, color: '#ff7ad9', note: 'Neon bars and late-night races' },
  { name: 'Harbor', x0: 60, z0: -340, x1: 340, z1: 340, standing: 22, color: '#7dff9b', note: 'Docks, crates and quiet cargo' },
];

export const MISSIONS = [
  { name: 'First Light', giver: 'Lucia', role: 'Fixer', brief: 'Pick up the Comet GT and bring it to the Marina.', objective: 'Drive the Comet GT to the Marina marker', target: { x: -120, z: 240 }, stages: 2, reward: 1200, rp: 400 },
  { name: 'Palms & Pistols', giver: 'Marco', role: 'Driver', brief: 'Three packages stashed along Palm Row. Grab them all.', objective: 'Collect 3 packages on Palm Row', target: { x: -260, z: 40 }, stages: 3, reward: 1800, rp: 600 },
  { name: 'Beachfront Getaway', giver: 'Lucia', role: 'Fixer', brief: 'The beach is crawling with SBPD. Lose the tail at the pier.', objective: 'Lose the SBPD tail — reach the hideout', target: { x: -300, z: -60 }, stages: 3, reward: 2600, rp: 900 },
  { name: 'Harbor Lights', giver: 'Dante', role: 'Gunman', brief: 'A boat is waiting at the docks. Get the cargo aboard.', objective: 'Deliver the cargo to the Harbor boat', target: { x: 240, z: 180 }, stages: 2, reward: 2200, rp: 800 },
  { name: 'Neon Run', giver: 'Marco', role: 'Driver', brief: 'Street race down the Strip. Beat the clock, beat the pack.', objective: 'Hit 4 race gates on Sunset Strip', target: { x: -270, z: -240 }, stages: 4, reward: 3200, rp: 1100 },
  { name: 'Sunsplash', giver: 'Lucia', role: 'Fixer', brief: 'Beach party, midday, loud. Lift the briefcase, vanish in the crowd.', objective: 'Grab the briefcase on the beach', target: { x: -310, z: 60 }, stages: 2, reward: 2800, rp: 1000 },
  { name: 'The Vault Job', giver: 'Dante', role: 'Gunman', brief: 'Downtown bank, one vault, five minutes. In and out.', objective: 'Reach the Downtown bank vault', target: { x: -60, z: 20 }, stages: 3, reward: 5000, rp: 1500 },
  { name: 'Air One Down', giver: 'Marco', role: 'Driver', brief: 'The heli has us lit up. Break its spotlight and run.', objective: 'Escape the AIR-1 spotlight', target: { x: 120, z: -200 }, stages: 3, reward: 4200, rp: 1400 },
  { name: 'King of Solmar', giver: 'Lucia', role: 'Fixer', brief: 'One last run across every district. Finish it and the city is yours.', objective: 'Finish the grand run — Harbor to Marina', target: { x: -120, z: 240 }, stages: 5, reward: 8000, rp: 2500 },
];

export const CREW = [
  { key: 'Z', name: 'MARCO', role: 'Driver', ability: 'GHOST RIDE', face: 'M', color: '#ff9a3d', desc: 'Wanted level drops one star for 20 s' },
  { key: 'X', name: 'LUCIA', role: 'Fixer', ability: 'SLIPSTREAM', face: 'L', color: '#ff7ad9', desc: 'Top speed +40% for 12 s' },
  { key: 'C', name: 'DANTE', role: 'Gunman', ability: 'DEADEYE', face: 'D', color: '#6ec1ff', desc: 'Perfect aim + double damage for 10 s' },
];

export const WEAPONS = [
  { name: 'FISTS', ammo: Infinity, damage: 8 },
  { name: 'PISTOL', ammo: 48, damage: 22 },
  { name: 'SMG', ammo: 120, damage: 12 },
  { name: 'SHOTGUN', ammo: 24, damage: 45 },
  { name: 'RIFLE', ammo: 90, damage: 34 },
  { name: 'LAUNCHER', ammo: 0, damage: 120, locked: true },
  { name: 'SNIPER', ammo: 0, damage: 90, locked: true },
];

export const DISPATCH_UNITS = [
  { name: 'TARPON 38', role: 'PURSUIT', tag: 'RAMMING', tagClass: 'red' },
  { name: 'AIR ONE', role: 'AIR UNIT', tag: 'SPOTLIGHT', tagClass: 'yellow' },
  { name: 'PELICAN-11', role: 'INTERCEPT', tag: 'ROADBLOCK', tagClass: 'orange' },
  { name: 'CONDOR-1', role: 'TACTICAL', tag: 'FLANKING', tagClass: 'blue' },
  { name: 'DOLPHIN 07', role: 'PURSUIT', tag: 'PIT', tagClass: 'purple' },
];

export const RADIO = [
  { station: 'SOLMAR FM 98.6', track: 'Sunset Drive — The Palms' },
  { station: 'SOLMAR FM 98.6', track: 'Golden Hour — Marina Nights' },
  { station: 'NEON 104.2', track: 'Strip Lights — Velvet Coast' },
  { station: 'SOLMAR FM 98.6', track: 'Palm Shadows — The Drifters' },
];

export const DIALOGS = [
  { who: 'LUCIA', role: 'Fixer', face: 'L', line: '“The beach is crawling with SBPD. Cut through Palm Row, lose them at the pier — and don’t scratch my Comet.”' },
  { who: 'MARCO', role: 'Driver', face: 'M', line: '“I can thread this car through a keyhole. Keep your foot down and trust the wheel.”' },
  { who: 'DANTE', role: 'Gunman', face: 'D', line: '“They brought a heli. Cute. Stay in the shadows and the spotlight can’t find you.”' },
  { who: 'LUCIA', role: 'Fixer', face: 'L', line: '“One more job and the whole bay knows our name. Don’t get sloppy now.”' },
];

export const PLAYER = {
  walkSpeed: 9,
  runSpeed: 15,
  carAccel: 26,
  carBrake: 40,
  carMaxSpeed: 46,
  carTurn: 2.1,
  enterRange: 7,
};

export const POLICE = { chaseSpeed: 34, ramDamage: 6, spawnRange: 60 };

export const PALETTE = {
  skyTop: 0x2a1a5e,
  skyMid: 0xff8c42,
  skyLow: 0xffd27a,
  sun: 0xffdf8a,
  ocean: 0x1e6f8e,
  sand: 0xe8c98f,
  road: 0x2c2f3a,
  sidewalk: 0x8a8f9e,
  grass: 0x3f7a4a,
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
