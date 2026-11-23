// Solara Bay — story missions, street races, taxi fares, hidden packages, standing.
var MISSIONS = [
  { id: 1, title: 'Welcome to Solara', brief: 'Meet Nova at the plaza fountain. The crew is waiting.', type: 'drive', at: [0, 0], pay: 400, district: 'La Plaza' },
  { id: 2, title: 'Hot Wheels', brief: 'Steal the sports car parked on the North Beach strip and bring it to the garage.', type: 'steal', at: [140, -140], pay: 800, district: 'North Beach' },
  { id: 3, title: 'The Tide Kings', brief: 'Clear the Tide Kings crew out of the Old Harbor warehouse yard.', type: 'shoot', at: [-150, -150], pay: 1200, district: 'Old Harbor', count: 5 },
  { id: 4, title: 'Campus Run', brief: 'Deliver the package to the University Hill dorms before the clock runs out.', type: 'timed', at: [-150, 150], pay: 1000, district: 'University Hill', seconds: 75 },
  { id: 5, title: 'Dockside Deal', brief: 'Pick up the crate at the docks and deliver it to the plaza. Do not attract the law.', type: 'deliver', at: [140, 0], pay: 1500, district: 'The Docks' },
  { id: 6, title: 'Tail the Anchor', brief: "Follow Sal Moreau's car through the city. Stay close — but do not get spotted.", type: 'tail', at: [0, 140], pay: 1400, district: 'Palm Heights' },
  { id: 7, title: 'Heat Wave', brief: 'The law is onto you. Lose a 3-star wanted level and make it to the safehouse.', type: 'escape', at: [-70, 70], pay: 1600, district: 'University Hill' },
  { id: 8, title: 'Package Hunt', brief: 'Five hidden packages are stashed around Marina District. Collect them all.', type: 'collect', at: [140, 0], pay: 1800, district: 'The Docks', count: 5 },
  { id: 9, title: 'Beachfront Brawl', brief: 'The Tide Kings are holding the pier. Take it back, whatever it takes.', type: 'shoot', at: [210, 0], pay: 2200, district: 'North Beach', count: 7 },
  { id: 10, title: 'The Anchor Falls', brief: 'Final job: chase Sal Moreau down the beach boulevard and end the Tide Kings for good.', type: 'finale', at: [210, -70], pay: 3500, district: 'North Beach' },
];
var RACES = [
  { id: 'r1', name: 'Boulevard Sprint', at: [140, -70], laps: 1, par: 55 },
  { id: 'r2', name: 'Harbor Loop', at: [-140, -70], laps: 1, par: 70 },
  { id: 'r3', name: 'Night Neon Run', at: [0, 140], laps: 1, par: 65 },
];

function startMission(m) {
  G.mission = m; G.missionStage = 0; G.missionTimer = m.seconds || 0;
  G.mission.collected = 0; G.mission.kills = 0; G.mission.tailT = 0;
  if (m.type === 'steal') spawnTargetCar(m.at[0], m.at[1]);
  if (m.type === 'tail' || m.type === 'finale') spawnTailCar(m.at[0], m.at[1]);
  if (m.type === 'shoot') spawnGang(m.at[0], m.at[1], m.count);
  if (m.type === 'collect') spawnMissionPackages(m.at[0], m.at[1], m.count);
  if (m.type === 'timed') G.missionTimer = m.seconds;
  showObjective('<b>' + m.title + '</b><br>' + m.brief);
  toast('Mission started: ' + m.title);
  AudioSys.missionStart();
  setMarker(m.at[0], m.at[1], 0xffb300);
}
function completeMission() {
  var m = G.mission;
  G.cash += m.pay;
  G.missionsDone.push(m.id);
  var st = G.standing[m.district] || 0;
  G.standing[m.district] = Math.min(100, st + 14);
  showObjective('<b>' + m.title + ' — COMPLETE</b><br>+' + fmtCash(m.pay) + ' · ' + m.district + ' standing up.');
  toast('Mission complete! +' + fmtCash(m.pay));
  AudioSys.missionDone();
  clearMarker();
  G.mission = null;
  saveGame();
  if (G.missionsDone.length >= 10) {
    showObjective('<b>ALL 10 MISSIONS DONE</b><br>Solara Bay is yours, ' + G.leads[G.lead].name + '. The crew runs this city now.');
  }
}
function failMission(why) {
  if (!G.mission) return;
  showObjective('<b>Mission failed</b><br>' + why + ' — talk to the crew and try again.');
  toast('Mission failed: ' + why);
  clearMarker();
  G.mission = null;
}
function updateMissions(dt) {
  var m = G.mission; if (!m) return;
  var px = G.inCar ? G.car.position.x : G.player.position.x;
  var pz = G.inCar ? G.car.position.z : G.player.position.z;
  if (m.type === 'timed') {
    G.missionTimer -= dt;
    if (G.missionTimer <= 0) { failMission('Out of time.'); return; }
    showObjective('<b>' + m.title + '</b> — ' + Math.ceil(G.missionTimer) + 's left<br>' + m.brief);
  }
  var d = dist2(px, pz, m.at[0], m.at[1]);
  if (m.type === 'drive' || m.type === 'deliver') {
    if (d < 8) completeMission();
  } else if (m.type === 'steal') {
    if (G.inCar && G.car && G.car.userData.targetCar && d < 10 && G.missionStage === 0) {
      G.missionStage = 1; showObjective('<b>' + m.title + '</b><br>Car secured — now bring it to the garage in La Plaza.');
      setMarker(0, 35, 0x7dff9a); G.mission.at = [0, 35];
    } else if (G.missionStage === 1 && d < 10) completeMission();
  } else if (m.type === 'shoot') {
    m.kills = m.count - G.gang.length;
    showObjective('<b>' + m.title + '</b> — Tide Kings left: ' + G.gang.length + '<br>' + m.brief);
    if (G.gang.length === 0 && m.kills >= m.count) completeMission();
  } else if (m.type === 'tail') {
    var tc = G.tailCar;
    if (!tc) { failMission('You lost the target.'); return; }
    var td = dist2(px, pz, tc.position.x, tc.position.z);
    if (td < 26) m.tailT += dt; else m.tailT = Math.max(0, m.tailT - dt * 2);
    showObjective('<b>' + m.title + '</b> — tail progress ' + Math.round(m.tailT) + '/20s<br>Stay close, stay unseen.');
    if (m.tailT >= 20) completeMission();
    if (td > 70) failMission('You lost the target.');
  } else if (m.type === 'escape') {
    if (G.wanted >= 3) { G.missionStage = 1; }
    if (G.missionStage === 1 && G.wanted === 0) {
      showObjective('<b>' + m.title + '</b><br>Clean — now reach the safehouse.');
      setMarker(m.at[0], m.at[1], 0x7dff9a);
      if (d < 8) completeMission();
    } else if (G.missionStage === 0) {
      showObjective('<b>' + m.title + '</b><br>Raise some heat first — get the law on you (wanted 3+).');
    }
  } else if (m.type === 'collect') {
    showObjective('<b>' + m.title + '</b> — packages ' + m.collected + '/' + m.count + '<br>' + m.brief);
    if (m.collected >= m.count) completeMission();
  } else if (m.type === 'finale') {
    var fc = G.tailCar;
    if (!fc) { failMission('Moreau slipped away.'); return; }
    var fd = dist2(px, pz, fc.position.x, fc.position.z);
    showObjective('<b>' + m.title + '</b><br>Run Moreau off the road — ram his car!');
    if (fd < 5 && G.inCar && Math.abs(G.speed) > 12) {
      fc.userData.hp -= 1;
      if (fc.userData.hp <= 0) { G.scene.remove(fc); G.tailCar = null; completeMission(); }
    }
  }
  updateMarker(dt);
}
function spawnTargetCar(x, z) {
  var car = makeCar(0xffd23e, true);
  car.position.set(x, 0, z); car.userData.targetCar = true; car.userData.sport = true;
  G.scene.add(car); G.cars.push(car);
}
function spawnTailCar(x, z) {
  var car = makeCar(0x1a1a1a, true);
  car.position.set(x, 0, z);
  car.userData.tail = true; car.userData.hp = 3; car.userData.speed = 0;
  car.userData.wp = [[-140, -140], [140, -140], [140, 140], [-140, 140]];
  car.userData.wpi = 0;
  G.scene.add(car); G.tailCar = car;
}
function updateTailCar(dt) {
  var c = G.tailCar; if (!c) return;
  var wp = c.userData.wp[c.userData.wpi];
  var dx = wp[0] - c.position.x, dz = wp[1] - c.position.z, d = Math.sqrt(dx * dx + dz * dz);
  if (d < 8) { c.userData.wpi = (c.userData.wpi + 1) % c.userData.wp.length; return; }
  var wantA = Math.atan2(dx, dz), da = wantA - c.rotation.y;
  while (da > Math.PI) da -= Math.PI * 2;
  while (da < -Math.PI) da += Math.PI * 2;
  c.rotation.y += clamp(da, -2 * dt, 2 * dt);
  c.userData.speed = lerp(c.userData.speed, 16, 0.01);
  c.position.x += Math.sin(c.rotation.y) * c.userData.speed * dt;
  c.position.z += Math.cos(c.rotation.y) * c.userData.speed * dt;
}
function spawnMissionPackages(x, z, n) {
  for (var i = 0; i < n; i++) {
    var p = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), new THREE.MeshBasicMaterial({ color: 0x7dff9a }));
    p.position.set(x + rand(-40, 40), 1.2, z + rand(-40, 40));
    p.userData.missionPack = true;
    G.scene.add(p); G.markers.push(p);
  }
}
// hidden packages (20, scattered, persistent)
function spawnPackages() {
  var spots = [];
  for (var i = 0; i < 20; i++) {
    var x = rand(-220, 195), z = rand(-220, 220);
    if (Math.abs(x) < 60 && Math.abs(z) < 60) { x += 90; }
    spots.push([x, z]);
  }
  spots.forEach(function (s) {
    var p = new THREE.Mesh(new THREE.OctahedronGeometry(0.9), new THREE.MeshBasicMaterial({ color: 0x37c8ab }));
    p.position.set(s[0], 1.4, s[1]);
    p.userData.pack = true;
    G.scene.add(p); G.pickups.push(p);
  });
}
function updatePickups(dt, t) {
  var px = G.inCar ? G.car.position.x : G.player.position.x;
  var pz = G.inCar ? G.car.position.z : G.player.position.z;
  for (var i = G.pickups.length - 1; i >= 0; i--) {
    var p = G.pickups[i];
    p.rotation.y = t; p.position.y = 1.4 + Math.sin(t * 2 + i) * 0.25;
    if (dist2(px, pz, p.position.x, p.position.z) < 2.6) {
      G.scene.remove(p); G.pickups.splice(i, 1);
      G.packagesGot++; G.cash += 150;
      toast('Hidden package found! +' + fmtCash(150) + ' (' + G.packagesGot + '/' + G.packagesTotal + ')');
      AudioSys.pickup();
      saveGame();
    }
  }
  for (var j = G.markers.length - 1; j >= 0; j--) {
    var mp = G.markers[j];
    if (mp.userData.missionPack) {
      mp.rotation.y = t * 2;
      if (dist2(px, pz, mp.position.x, mp.position.z) < 2.6) {
        G.scene.remove(mp); G.markers.splice(j, 1);
        if (G.mission) G.mission.collected++;
        AudioSys.pickup();
      }
    }
  }
}
// mission marker: light beam + floating diamond
var markerBeam = null, markerDia = null;
function setMarker(x, z, color) {
  clearMarker();
  markerBeam = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 60, 12, 1, true), new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
  markerBeam.position.set(x, 30, z); G.scene.add(markerBeam);
  markerDia = new THREE.Mesh(new THREE.OctahedronGeometry(1.4), new THREE.MeshBasicMaterial({ color: color }));
  markerDia.position.set(x, 6, z); G.scene.add(markerDia);
}
function clearMarker() {
  if (markerBeam) { G.scene.remove(markerBeam); markerBeam = null; }
  if (markerDia) { G.scene.remove(markerDia); markerDia = null; }
}
function updateMarker(dt) {
  if (markerDia) { markerDia.rotation.y += dt * 2; markerDia.position.y = 6 + Math.sin(G.frame * 0.05) * 0.6; }
}
// ---- races ----
function startRace(r) {
  G.race = { def: r, cp: 0, t: 0, checkpoints: [] };
  var pts = [[r.at[0], r.at[1]], [r.at[0] + 120, r.at[1]], [r.at[0] + 120, r.at[1] + 120], [r.at[0], r.at[1] + 120]];
  pts.forEach(function (p, i) {
    var ring = new THREE.Mesh(new THREE.TorusGeometry(5, 0.5, 8, 24), new THREE.MeshBasicMaterial({ color: i === 0 ? 0x7dff9a : 0xffb300 }));
    ring.position.set(p[0], 3, p[1]); ring.rotation.y = Math.PI / 2;
    G.scene.add(ring); G.race.checkpoints.push(ring);
  });
  showObjective('<b>' + r.name + '</b><br>Hit all 4 checkpoints. Par: ' + r.par + 's. Get in a car!');
  setMarker(r.at[0], r.at[1], 0x7dff9a);
  toast('Race started: ' + r.name);
}
function updateRace(dt) {
  var rc = G.race; if (!rc) return;
  rc.t += dt;
  var px = G.inCar ? G.car.position.x : G.player.position.x;
  var pz = G.inCar ? G.car.position.z : G.player.position.z;
  var pts = [[rc.def.at[0], rc.def.at[1]], [rc.def.at[0] + 120, rc.def.at[1]], [rc.def.at[0] + 120, rc.def.at[1] + 120], [rc.def.at[0], rc.def.at[1] + 120]];
  var cur = pts[rc.cp];
  if (dist2(px, pz, cur[0], cur[1]) < 7) {
    rc.cp++;
    if (rc.cp < pts.length) { setMarker(pts[rc.cp][0], pts[rc.cp][1], 0x7dff9a); AudioSys.pickup(); }
    else {
      var t = rc.t, best = G.racesBest[rc.def.id];
      var win = t <= rc.def.par;
      G.cash += win ? 900 : 200;
      if (!best || t < best) G.racesBest[rc.def.id] = Math.round(t * 10) / 10;
      toast(rc.def.name + ' finished in ' + t.toFixed(1) + 's — ' + (win ? 'under par! +$900' : '+$200'));
      showObjective('<b>' + rc.def.name + ' — DONE</b><br>Time ' + t.toFixed(1) + 's (best ' + G.racesBest[rc.def.id] + 's, par ' + rc.def.par + 's).');
      rc.checkpoints.forEach(function (r) { G.scene.remove(r); });
      clearMarker(); G.race = null; saveGame();
    }
  }
  if (G.race) showObjective('<b>' + rc.def.name + '</b> — checkpoint ' + (rc.cp + 1) + '/4 · ' + rc.t.toFixed(1) + 's<br>Par ' + rc.def.par + 's.');
}
// Races start when the player drives up to a race start marker.
function checkRaceStart() {
  if (G.race || G.mission || !G.inCar) return;
  for (var i = 0; i < RACES.length; i++) {
    if (dist2(G.car.position.x, G.car.position.z, RACES[i].at[0], RACES[i].at[1]) < 10) {
      startRace(RACES[i]);
      return;
    }
  }
}
// ---- taxi ----
function tryTaxi() {
  if (!G.inCar) return;
  if (G.taxi) return;
  for (var i = 0; i < G.peds.length; i++) {
    var p = G.peds[i];
    if (dist2(G.car.position.x, G.car.position.z, p.position.x, p.position.z) < 6) {
      var dest = [rand(-200, 190), rand(-200, 200)];
      G.taxi = { ped: p, dest: dest, fare: randi(25, 80) };
      p.userData.taxi = true;
      p.visible = false; // they hopped in
      setMarker(dest[0], dest[1], 0x9fd8ff);
      showObjective('<b>Taxi fare</b><br>Drop your passenger at the marker. Fare: ' + fmtCash(G.taxi.fare) + '.');
      toast('Passenger aboard — take them to the marker.');
      return;
    }
  }
  toast('No passenger nearby. Pull up next to a pedestrian and press T.');
}
function updateTaxi(dt) {
  if (!G.taxi) return;
  var d = dist2(G.car.position.x, G.car.position.z, G.taxi.dest[0], G.taxi.dest[1]);
  if (d < 8) {
    var fare = G.taxi.fare;
    G.cash += fare; G.taxiEarned += fare;
    G.taxi.ped.visible = true;
    G.taxi.ped.position.set(G.car.position.x + 3, 0, G.car.position.z + 2);
    G.taxi.ped.userData.taxi = false;
    toast('Fare complete! +' + fmtCash(fare));
    AudioSys.pickup();
    clearMarker(); G.taxi = null; saveGame();
  }
}
