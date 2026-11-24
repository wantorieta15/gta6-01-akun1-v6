# Solmar Bay — Sunset Run v6

[![Make GTA 6](https://make.fun/badge/gta6-01.svg)](https://make.fun/c/gta6-01)
[![Rank](https://make.fun/badge/gta6-01/wantorieta15/gta6-01-v6-akun1/rank.svg)](https://make.fun/c/gta6-01)
[![Reward](https://make.fun/badge/gta6-01/wantorieta15/gta6-01-v6-akun1/reward.svg)](https://make.fun/c/gta6-01)

A complete open-world crime game in the spirit of GTA 6, built for the
[Make GTA 6](https://make.fun/c/gta6-01) bounty on make.fun. It runs offline in
a desktop browser from its own static files — no build step, no network.

## Play it

Serve `game/` with any static server and open `game/index.html`, for example:

```sh
node serve.ts   # serves game/ on http://localhost:8080
```

Or open the folder directly with a static server of your choice.

## The game

Solmar Bay is a fictional beachfront city at golden hour: six named districts
(Palm Row, Marina, Downtown, Old Town, Sunset Strip, Harbor), an ocean and a
beach to the west, and a sunset that never quite sets. You play Marco, a driver
fresh out of the Marina, working jobs for fixer Lucia and gunman Dante.

- **Open world on foot and by car** — steal any parked car (E), drive the
  street grid, walk the beach and the sidewalks.
- **Nine story jobs** — from "First Light" to "King of Solmar", with staged
  objectives, a waypoint beacon, timers and GOLD / SILVER / BRONZE ratings.
- **Wanted system** — SBPD dispatch answers with named units (TARPON 38,
  AIR ONE, PELICAN-11, CONDOR-1, DOLPHIN 07), live distances and colored
  tactics (RAMMING, SPOTLIGHT, ROADBLOCK, FLANKING, PIT). At 3 stars the
  AIR-1 helicopter pins you with its searchlight.
- **Combat** — seven weapon slots (two locked), ammo, drive-by and on-foot
  shooting, car explosions, and three crew abilities: Ghost Ride (Z),
  Slipstream (X), Deadeye (C).
- **Progression** — cash, RP and rank, district standing, career stats.
- **HUD** — mission panel, dispatch board, minimap with district name, dialog
  with portraits, radio, speedometer with car name and condition.
- **Pause map** — full district map, mission checklist with ratings, career
  stats, and three save slots (progress saves in the browser).

## Controls

| Key | Action |
| --- | --- |
| W A S D | Drive / walk |
| E | Enter / exit car |
| Mouse + Click | Aim / shoot on foot |
| 1–7 | Weapons |
| Z / X / C | Crew abilities |
| Shift | Run on foot |
| Esc / P | Pause & map |

## Tech

- three.js r160 (vendored as `game/vendor/three.module.min.js`)
- Plain ES modules, no build step; procedural WebAudio sound
- Source split by job: `config.js` (tuning & story), `world.js` (rules),
  `scene3d.js` (the city), `hud.js` (panels & maps), `input.js`, `audio.js`,
  `shots.js` (screenshot scenes), `main.js` (boot & loop)

## License

MIT — see [LICENSE](LICENSE).
