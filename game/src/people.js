// Solara Bay — people: the player on foot, pedestrians, gang members.
var PED_COLORS = [0xe8b04b, 0x7fb2c9, 0xc96a5a, 0x8a9a5b, 0x9b7ec9, 0xe8e8e8, 0x5a6a7a];

function makePerson(shirt, pants, scale) {
  var g = new THREE.Group();
  var s = scale || 1;
  var body = new THREE.Mesh(new THREE.BoxGeometry(0.62 * s, 0.85 * s, 0.34 * s), new THREE.MeshLambertMaterial({ color: shirt }));
  body.position.y = 1.05 * s; body.castShadow = true; g.add(body);
  var head = new THREE.Mesh(new THREE.SphereGeometry(0.26 * s, 10, 8), new THREE.MeshLambertMaterial({ color: 0xd9a986 }));
  head.position.y = 1.72 * s; g.add(head);
  var hair = new THREE.Mesh(new THREE.SphereGeometry(0.27 * s, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x2a1c10 }));
  hair.position.y = 1.76 * s; g.add(hair);
  var legL = new THREE.Mesh(new THREE.BoxGeometry(0.24 * s, 0.7 * s, 0.26 * s), new THREE.MeshLambertMaterial({ color: pants }));
  legL.position.set(-0.16 * s, 0.35 * s, 0); g.add(legL);
  var legR = legL.clone(); legR.position.x = 0.16 * s; g.add(legR);
  var armL = new THREE.Mesh(new THREE.BoxGeometry(0.18 * s, 0.7 * s, 0.2 * s), new THREE.MeshLambertMaterial({ color: shirt }));
  armL.position.set(-0.42 * s, 1.05 * s, 0); g.add(armL);
  var armR = armL.clone(); armR.position.x = 0.42 * s; g.add(armR);
  g.userData.legL = legL; g.userData.legR = legR; g.userData.armL = armL; g.userData.armR = armR;
  return g;
}

function makePlayer() {
  var lead = G.leads[G.lead];
  var p = makePerson(lead.jacket, 0x22262e, 1);
  // lead distinction: Nova wears a cap, Turbo a headband
  if (G.lead === 0) {
    var cap = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.12, 10), new THREE.MeshLambertMaterial({ color: 0xffd23e }));
    cap.position.y = 1.92; p.add(cap);
  } else {
    var band = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.05, 6, 12), new THREE.MeshLambertMaterial({ color: 0x2e9be6 }));
    band.position.y = 1.82; band.rotation.x = Math.PI / 2; p.add(band);
  }
  p.userData.isPlayer = true;
  return p;
}

function spawnPeds() {
  for (var i = 0; i < 30; i++) {
    var p = makePerson(pick(PED_COLORS), pick([0x22262e, 0x3a3f4a, 0x5a4a3a]), rand(0.92, 1.06));
    var x = rand(-230, 200), z = rand(-230, 230);
    p.position.set(x, 0, z);
    p.rotation.y = rand(0, Math.PI * 2);
    p.userData.walkSpeed = rand(1.2, 2.4);
    p.userData.target = { x: rand(-230, 200), z: rand(-230, 230) };
    p.userData.fleeing = false; p.userData.taxi = false;
    p.userData.phase = rand(0, Math.PI * 2);
    G.scene.add(p);
    G.peds.push(p);
  }
}

function updatePeds(dt, t) {
  var px = G.player ? G.player.position.x : 0, pz = G.player ? G.player.position.z : 0;
  for (var i = 0; i < G.peds.length; i++) {
    var p = G.peds[i];
    var dx = px - p.position.x, dz = pz - p.position.z, d = Math.sqrt(dx * dx + dz * dz);
    var speed = p.userData.walkSpeed;
    // flee from gunfire, speeding cars, or the player sprinting at them
    if ((G.shotsFiredT > 0 && d < 30) || (G.inCar && Math.abs(G.speed) > 15 && d < 18) || (d < 3 && G.keys['ShiftLeft'])) {
      p.userData.fleeing = true;
      p.userData.target = { x: p.position.x - dx * 2, z: p.position.z - dz * 2 };
      speed = 5;
    } else if (d > 40) p.userData.fleeing = false;
    var tx = p.userData.target.x, tz = p.userData.target.z;
    var tdx = tx - p.position.x, tdz = tz - p.position.z, td = Math.sqrt(tdx * tdx + tdz * tdz);
    if (td < 2) {
      p.userData.target = { x: rand(-230, 200), z: rand(-230, 230) };
    } else {
      p.position.x += (tdx / td) * speed * dt;
      p.position.z += (tdz / td) * speed * dt;
      p.rotation.y = Math.atan2(tdx, tdz);
      // walk cycle
      var sw = Math.sin(t * 8 + p.userData.phase) * 0.5;
      p.userData.legL.rotation.x = sw; p.userData.legR.rotation.x = -sw;
      p.userData.armL.rotation.x = -sw * 0.7; p.userData.armR.rotation.x = sw * 0.7;
    }
    // keep peds out of buildings
    var hit = collide(p.position.x, p.position.z, 0.7);
    if (hit) { p.position.x = hit.x; p.position.z = hit.z; p.userData.target = { x: rand(-230, 200), z: rand(-230, 230) }; }
  }
}

// Gang members: hostile NPCs who shoot back. Spawned by missions.
function spawnGang(x, z, n) {
  var out = [];
  for (var i = 0; i < n; i++) {
    var g = makePerson(0x1a1a1a, 0x22262e, 1);
    var vest = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.5, 0.4), new THREE.MeshLambertMaterial({ color: 0x8a1a2a }));
    vest.position.y = 1.15; g.add(vest);
    g.position.set(x + rand(-6, 6), 0, z + rand(-6, 6));
    g.userData.hp = 60; g.userData.gang = true; g.userData.shootCd = rand(0.5, 1.5);
    G.scene.add(g); G.gang.push(g); out.push(g);
  }
  return out;
}
function updateGang(dt) {
  var px = G.player.position.x, pz = G.player.position.z;
  for (var i = G.gang.length - 1; i >= 0; i--) {
    var g = G.gang[i];
    if (g.userData.hp <= 0) { G.scene.remove(g); G.gang.splice(i, 1); continue; }
    var dx = px - g.position.x, dz = pz - g.position.z, d = Math.sqrt(dx * dx + dz * dz);
    if (d > 26) { // walk toward the player
      g.position.x += (dx / d) * 3.2 * dt; g.position.z += (dz / d) * 3.2 * dt;
    }
    g.rotation.y = Math.atan2(dx, dz);
    g.userData.shootCd -= dt;
    if (g.userData.shootCd <= 0 && d < 34) {
      g.userData.shootCd = rand(1.1, 2.0);
      // gang fire: tracer + chance to hit
      fireTracer(g.position, G.player.position, 0xff5040);
      if (Math.random() < 0.3) { damagePlayer(rand(4, 9)); }
      AudioSys.gunshot(true);
    }
  }
}
G.gang = [];

// Player on-foot movement + jump.
function updateOnFoot(dt) {
  var k = G.keys;
  var run = (k['ShiftLeft'] || k['ShiftRight']) ? 1.8 : 1;
  var mx = 0, mz = 0;
  if (k['KeyW'] || k['ArrowUp']) mz += 1;
  if (k['KeyS'] || k['ArrowDown']) mz -= 1;
  if (k['KeyA'] || k['ArrowLeft']) mx -= 1;
  if (k['KeyD'] || k['ArrowRight']) mx += 1;
  var len = Math.sqrt(mx * mx + mz * mz) || 1;
  mx /= len; mz /= len;
  var yaw = G.camYaw;
  var wx = (mx * Math.cos(yaw) - mz * Math.sin(yaw)) * 6.5 * run;
  var wz = (mx * Math.sin(yaw) + mz * Math.cos(yaw)) * 6.5 * run;
  G.playerVel.x = lerp(G.playerVel.x, wx, 0.25);
  G.playerVel.z = lerp(G.playerVel.z, wz, 0.25);
  var nx = G.player.position.x + G.playerVel.x * dt;
  var nz = G.player.position.z + G.playerVel.z * dt;
  var hit = collide(nx, nz, 0.7);
  if (hit) { nx = hit.x; nz = hit.z; }
  G.player.position.x = clamp(nx, -242, 242);
  G.player.position.z = clamp(nz, -242, 242);
  // jump
  if (k['Space'] && G.player.position.y <= 0.01) { G.playerVel.y = 7; AudioSys.jump(); }
  G.playerVel.y -= 22 * dt;
  G.player.position.y = Math.max(0, G.player.position.y + G.playerVel.y * dt);
  if (G.player.position.y === 0) G.playerVel.y = 0;
  // face movement direction, walk cycle
  var moving = Math.abs(G.playerVel.x) + Math.abs(G.playerVel.z) > 0.5;
  if (moving) {
    G.player.rotation.y = Math.atan2(G.playerVel.x, G.playerVel.z);
    var sw = Math.sin(G.frame * 0.35) * 0.6;
    G.player.userData.legL.rotation.x = sw; G.player.userData.legR.rotation.x = -sw;
    G.player.userData.armL.rotation.x = -sw * 0.7; G.player.userData.armR.rotation.x = sw * 0.7;
  } else {
    G.player.userData.legL.rotation.x = 0; G.player.userData.legR.rotation.x = 0;
    G.player.userData.armL.rotation.x = 0; G.player.userData.armR.rotation.x = 0;
  }
}
