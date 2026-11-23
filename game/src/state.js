// Solara Bay — shared game state, constants and small utilities.
// One global object G holds everything the game's files share.

var G = {
  // world
  HALF: 245,            // city half-size (x/z in [-245, 245])
  ROAD_EVERY: 70,       // streets every 70 units
  ROAD_W: 12,           // road width
  BEACH_X: 208,         // sand starts here (east edge)
  OCEAN_X: 244,         // water starts here
  // player
  lead: 0,              // 0 = Nia "Nova" Reyes, 1 = Theo "Turbo" Marsh
  leads: [
    { name: 'Nia "Nova" Reyes', ability: 'Focus', color: 0xe14b7a, jacket: 0xd9366b, key: 'Q' },
    { name: 'Theo "Turbo" Marsh', ability: 'Nitro', color: 0x2e9be6, jacket: 0x1f6fb2, key: 'Q' },
  ],
  cash: 250,
  health: 100, armor: 0,
  wanted: 0, wantedTimer: 0, seenTimer: 0,
  // progression
  missionsDone: [], standing: { 'La Plaza': 10, 'Old Harbor': 0, 'North Beach': 0, 'University Hill': 0, 'Palm Heights': 0, 'The Docks': 0 },
  packagesGot: 0, packagesTotal: 20, racesBest: {}, taxiEarned: 0,
  // session
  started: false, paused: false, over: false, overKind: '',
  time: 8.0,            // hours, 0-24; starts 08:00
  dayNight: 0,          // 0 day, 1 night (lerped)
  raining: false, rainT: 0,
  // mission runtime
  mission: null,        // active mission object
  missionStage: 0, missionTimer: 0,
  // combat
  weapon: 0,            // 0 fists, 1 pistol, 2 smg, 3 rifle
  weapons: [
    { name: 'Fists', ammo: Infinity, dmg: 12, rate: 0.35, range: 2.2 },
    { name: 'Pistol', ammo: 48, dmg: 22, rate: 0.28, range: 60 },
    { name: 'SMG', ammo: 120, dmg: 13, rate: 0.09, range: 45 },
    { name: 'Rifle', ammo: 40, dmg: 45, rate: 0.55, range: 120 },
  ],
  shootCd: 0, abilityCd: 0, abilityOn: false, abilityT: 0,
  // driving
  inCar: false, car: null, speed: 0,
  // runtime refs (filled by the other files)
  scene: null, camera: null, renderer: null,
  player: null, playerVel: null,
  cars: [], traffic: [], peds: [], cops: [], heli: null, roadblocks: [],
  buildings: [], colliders: [], pickups: [], markers: [],
  ocean: null, sun: null, moon: null, skyMat: null, clouds: [],
  keys: {}, mouseDX: 0, mouseDY: 0, camYaw: 0, camPitch: 0.32,
  shot: null,            // screenshot staging mode from ?shot=
  frame: 0, dt: 0,
};

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function rand(a, b) { return a + Math.random() * (b - a); }
function randi(a, b) { return Math.floor(rand(a, b + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function dist2(ax, az, bx, bz) { var dx = ax - bx, dz = az - bz; return Math.sqrt(dx * dx + dz * dz); }
function fmtCash(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
function fmtTime(h) {
  var hh = Math.floor(h) % 24, mm = Math.floor((h % 1) * 60);
  return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
}
function districtAt(x, z) {
  if (Math.abs(x) <= 70 && Math.abs(z) <= 70) return 'La Plaza';
  if (z < -70) return x < 0 ? 'Old Harbor' : 'North Beach';
  if (z > 70) return x < 0 ? 'University Hill' : 'Palm Heights';
  return x < 0 ? 'University Hill' : 'The Docks';
}
// A point is on a road if it is close to a street line (streets every 70 units).
function onRoad(x, z) {
  function near(v) { var r = Math.abs(v % 70); return Math.min(r, 70 - r) < 8; }
  return near(x) || near(z);
}
// Snap a point to the nearest road centreline (used for staging cars/peds on roads).
function roadSnap(v) { var r = Math.round(v / 70) * 70; return clamp(r, -210, 210); }
