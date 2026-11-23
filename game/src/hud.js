// Solara Bay — HUD, minimap, menus, save/load.
var $ = function (id) { return document.getElementById(id); };
var mmCtx = null;

function initHud() {
  mmCtx = $('minimap').getContext('2d');
  $('startbtn').addEventListener('click', function () { AudioSys.unlock(); startGame(false); });
  $('continuebtn').addEventListener('click', function () { AudioSys.unlock(); startGame(true); });
  $('resumebtn').addEventListener('click', resumeGame);
  $('savebtn').addEventListener('click', function () { saveGame(); toast('Game saved.'); });
  $('quitbtn').addEventListener('click', function () { location.reload(); });
  $('retrybtn').addEventListener('click', function () { location.reload(); });
  $('titlebtn').addEventListener('click', function () { location.reload(); });
  var save = loadSave();
  if (save && save.cash > 0) {
    $('continuebtn').classList.remove('hidden');
    $('continuebtn').textContent = 'CONTINUE — ' + fmtCash(save.cash);
  }
  if (G.shot === 'title') { /* stay on title for the screenshot */ return; }
}
function startGame(continued) {
  $('title').classList.add('hidden');
  $('hud').classList.remove('hidden');
  G.started = true; G.paused = false;
  if (continued) {
    var s = loadSave();
    if (s) {
      G.cash = s.cash; G.missionsDone = s.missionsDone || [];
      G.standing = s.standing || G.standing;
      G.packagesGot = s.packagesGot || 0;
      if (s.px !== undefined) { G.player.position.set(s.px, 0, s.pz); }
    }
  }
  AudioSys.startRadio();
  showObjective('<b>Solara Bay</b><br>Press M for your next job. Steal a car with E, or explore on foot.');
  applyShotStaging();
}
function resumeGame() {
  $('pause').classList.add('hidden');
  G.paused = false;
}
function pauseGame() {
  if (!G.started || G.over) return;
  G.paused = true;
  $('pause').classList.remove('hidden');
}
function endGame(kind) {
  if (G.over) return;
  G.over = true; G.overKind = kind;
  $('hud').classList.add('hidden');
  $('end').classList.remove('hidden');
  $('endtitle').textContent = kind === 'busted' ? 'BUSTED' : 'WASTED';
  $('endtext').textContent = kind === 'busted'
    ? 'The Solara Bay PD caught up with you. The Tide Kings are laughing — for now.'
    : 'You went down in the streets of Solara Bay. The crew will come for you.';
  AudioSys.stopRadio();
  try { localStorage.removeItem('solara-bay-save'); } catch (e) {}
}
function toast(msg) {
  var t = $('toast');
  t.textContent = msg;
  clearTimeout(t._to);
  t._to = setTimeout(function () { t.textContent = ''; }, 3400);
}
function showObjective(html) { $('objective').innerHTML = html; }
function damagePlayer(n) {
  if (G.over || !G.started) return;
  var absorbed = Math.min(G.armor, n);
  G.armor -= absorbed;
  G.health -= (n - absorbed);
  $('vignette').style.boxShadow = 'inset 0 0 120px 40px rgba(200,0,0,' + clamp((100 - G.health) / 130, 0, 0.7) + ')';
  if (G.health <= 0) endGame('wasted');
}
function updateHud() {
  $('cash').textContent = fmtCash(G.cash);
  var stars = '';
  for (var i = 0; i < 5; i++) stars += i < G.wanted ? '★' : '<span class="off">★</span>';
  $('stars').innerHTML = stars;
  $('clock').textContent = fmtTime(G.time);
  var px = G.inCar ? G.car.position.x : G.player.position.x;
  var pz = G.inCar ? G.car.position.z : G.player.position.z;
  var d = districtAt(px, pz);
  $('district').textContent = d;
  $('standval').textContent = G.standing[d] || 0;
  $('speed').textContent = Math.round(Math.abs(G.speed) * 2.2);
  var w = G.weapons[G.weapon];
  $('weapon').textContent = w.name;
  $('ammo').textContent = w.ammo === Infinity ? '∞' : w.ammo;
  $('station').textContent = AudioSys.stationName();
  $('crosshair').style.display = (!G.inCar && G.weapon > 0 && G.started && !G.paused) ? 'block' : 'none';
  drawMinimap(px, pz);
}
function drawMinimap(px, pz) {
  if (!mmCtx) return;
  var c = mmCtx, S = 190, scale = S / 520;
  c.clearRect(0, 0, S, S);
  c.fillStyle = '#0e2a3a'; c.fillRect(0, 0, S, S);
  // ocean (east)
  c.fillStyle = '#1a6a9e'; c.fillRect((G.BEACH_X + 260) * scale, 0, S, S);
  c.fillStyle = '#e8d49a'; c.fillRect(G.BEACH_X * scale, 0, (G.OCEAN_X - G.BEACH_X) * scale, S);
  // roads
  c.strokeStyle = '#3a3f46'; c.lineWidth = 4;
  for (var r = -210; r <= 210; r += 70) {
    var v = (r + 260) * scale;
    c.beginPath(); c.moveTo(v, 0); c.lineTo(v, S); c.stroke();
    c.beginPath(); c.moveTo(0, v); c.lineTo(S, v); c.stroke();
  }
  // plaza
  c.fillStyle = '#b8a88a'; c.fillRect((0 - 60 + 260) * scale, (0 - 60 + 260) * scale, 120 * scale, 120 * scale);
  // pier
  c.strokeStyle = '#8a6a48'; c.lineWidth = 3;
  c.beginPath(); c.moveTo((246 + 260) * scale, (0 + 260) * scale); c.lineTo((308 + 260) * scale, (0 + 260) * scale); c.stroke();
  function blip(x, z, color, size) {
    c.fillStyle = color;
    c.beginPath(); c.arc((x + 260) * scale, (z + 260) * scale, size || 4, 0, Math.PI * 2); c.fill();
  }
  // packages
  for (var i = 0; i < G.pickups.length; i++) blip(G.pickups[i].position.x, G.pickups[i].position.z, '#37c8ab', 2.5);
  // mission marker
  if (G.mission) blip(G.mission.at[0], G.mission.at[1], '#ffb300', 6);
  // cops
  for (var j = 0; j < G.cops.length; j++) blip(G.cops[j].position.x, G.cops[j].position.z, '#2040ff', 3.5);
  // player arrow
  var pxp = (px + 260) * scale, pzp = (pz + 260) * scale;
  c.save();
  c.translate(pxp, pzp);
  c.rotate(G.inCar ? -G.car.rotation.y : -G.player.rotation.y);
  c.fillStyle = '#ffd23e';
  c.beginPath(); c.moveTo(0, -8); c.lineTo(5, 6); c.lineTo(-5, 6); c.closePath(); c.fill();
  c.restore();
  // north tick
  c.fillStyle = '#fff'; c.font = 'bold 11px Arial'; c.fillText('N', S / 2 - 4, 12);
}
// ---- save / load ----
function saveGame() {
  try {
    localStorage.setItem('solara-bay-save', JSON.stringify({
      cash: G.cash, missionsDone: G.missionsDone, standing: G.standing,
      packagesGot: G.packagesGot, racesBest: G.racesBest,
      px: G.player ? G.player.position.x : 0, pz: G.player ? G.player.position.z : 0,
      lead: G.lead, time: G.time,
    }));
  } catch (e) {}
}
function loadSave() {
  try { return JSON.parse(localStorage.getItem('solara-bay-save') || 'null'); } catch (e) { return null; }
}
// ---- screenshot staging (?shot=cover|drive|mission|city|title) ----
function applyShotStaging() {
  var s = G.shot; if (!s) return;
  if (s === 'cover') {
    G.time = 16.8; // golden hour, still bright
    var car = makeCar(0xc0392b, true);
    car.position.set(212, 0, -140); car.rotation.y = 0.25; // beach boulevard, angled south
    G.scene.add(car); G.cars.push(car);
    enterCarSilent(car);
    G.wanted = 2; // wanted stars show in the HUD; no cops spawned, clean hero shot
    showObjective('<b>Solara Bay</b><br>Escape the law down the beach boulevard.');
  } else if (s === 'drive') {
    G.time = 10.5;
    var car2 = makeCar(0x2471a3, true);
    car2.position.set(0, 0, 70); car2.rotation.y = Math.PI; // north-south road, facing north
    G.scene.add(car2); G.cars.push(car2);
    enterCarSilent(car2);
    G.wanted = 2;
    G.keys['KeyW'] = true; // drive forward for the shot
    var cop = spawnCop(0, 100); cop.rotation.y = Math.PI;
  } else if (s === 'mission') {
    G.time = 13;
    G.player.position.set(-20, 0, -6);
    G.camYaw = Math.PI * 0.25; // camera south-east of the player, gang in frame
    startMission(MISSIONS[0]);
    spawnGang(-30, -20, 3);
  } else if (s === 'city') {
    G.time = 17.2; // golden hour aerial
    G.shotCam = 'aerial';
    showObjective('<b>Solara Bay</b><br>Six districts. One crew. Every street is yours.');
  }
}
function enterCarSilent(car) {
  G.inCar = true; G.car = car;
  G.player.visible = false;
  car.userData.driver = true;
}
