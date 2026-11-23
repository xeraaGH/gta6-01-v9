[![Make.fun — Make GTA 6](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![Rank](https://make.fun/badge/gta6-01/xeraaGH/gta6-01-v9/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![Reward](https://make.fun/badge/gta6-01/xeraaGH/gta6-01-v9/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# Solara Bay — an open-world crime game

**Solara Bay** is a complete 3D open-world crime game built for make.fun's
["Make GTA 6" bounty](https://make.fun/bounty/gta6-01) ($1,666 in USDC).
Referral code: `mk5wvbzz`.

## The city

Solara Bay is a sun-soaked coastal city with six districts — La Plaza, Old Harbor,
North Beach, University Hill, Palm Heights and The Docks — plus a beach, a pier and
a lighthouse. Buildings carry canvas-generated facades with lit windows at night,
varied rooflines with parapets, AC units, water tanks and neon signs. Streetlights,
palms, billboards, benches and beach umbrellas fill the streets. The sky runs a full
day/night cycle with a gradient dome, sun and moon, drifting clouds and fog, and the
ocean is animated. Cars are detailed models with cabins, wheels, headlights and
spoilers — not plain boxes.

## The story

Nia "Nova" Reyes and Theo "Turbo" Marsh came to Solara Bay with a stolen sedan and a
plan: take the city back from Sal "The Anchor" Moreau and his Tide Kings. Ten story
missions ($15,400 purse) take the crew from a plaza meetup through a stolen sports
car, a warehouse shootout, a timed campus run, a dockside deal, a tail job, a heat
wave, a package hunt, a pier brawl and a final beach-boulevard chase.

## How it plays

- **On foot and by car** — third-person on foot, arcade driving with a chase camera.
  Steal any car with E. Two switchable leads: Nova's Focus (slow motion) and Turbo's
  Nitro (speed burst), both on Q.
- **Wanted 1–5 stars** — cruisers chase and PIT you, roadblocks seal streets at 3
  stars, a spotlight helicopter hunts you at 4+. Break line of sight to cool off;
  a Pay 'n Spray garage repaints your car and clears the heat.
- **Missions and activities** — 10 story missions, 3 street races, taxi fares (T),
  20 hidden packages, district standing that grows as you work each district.
- **Combat** — fists, pistol, SMG and rifle; Tide Kings gang members shoot back.
- **HUD and menus** — live minimap, cash, wanted stars, clock, district and
  standing, speed, weapon and radio. Title screen, pause menu, busted/wasted
  screens, localStorage save. Synthesized WebAudio engine, sirens, gunshots and
  three procedural radio stations — no audio files.

## Controls

WASD move / drive · mouse drag to look · E enter / exit car · C switch lead ·
click shoot · F punch · 1/2/3/4 weapons · T taxi · R radio · Shift run / handbrake ·
Space jump · Q Focus / Nitro · Esc pause · M next mission

## Structure

- `main.ts` — the entrypoint: copies `game/` and `screenshots/` to the output
  directory and writes `dossier.json` with the vendored make.fun library.
- `game/index.html` + `game/style.css` — the page and HUD.
- `game/src/state.js` — shared state, constants, utilities.
- `game/src/city.js` — the city: sky, ocean, roads, buildings, props, landmarks.
- `game/src/vehicles.js` — car models, traffic AI, driving physics.
- `game/src/people.js` — the player on foot, pedestrians, gang members.
- `game/src/police.js` — cruisers, PIT, roadblocks, helicopter.
- `game/src/missions.js` — story missions, races, taxi, packages, standing.
- `game/src/audio.js` — synthesized sound and procedural radio.
- `game/src/hud.js` — HUD, minimap, menus, save/load.
- `game/src/main.js` — init, game loop, input, camera, combat.
- `game/vendor/three.min.js` — three.js r147 (minified UMD build, MIT).

## Run it

Serve `game/` with any static server and open `index.html` in a desktop browser.
It plays offline — no network requests. To hand the entry in, run `node main.ts`
(or `MAKEFUN_OUTPUT_DIR=out node main.ts` outside the grader).
