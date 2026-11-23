// Solara Bay — police: patrol cruisers that chase and PIT, roadblocks, helicopter.
function makeCruiser() {
  var g = makeCar(0x111111, false);
  // white doors + light bar
  var door = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.4, 1.4), new THREE.MeshLambertMaterial({ color: 0xf2f2f2 }));
  door.position.set(0, 0.62, 0.1); g.add(door);
  var bar = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.16, 0.4), new THREE.MeshLambertMaterial({ color: 0x222222 }));
  bar.position.set(0, 1.5, -0.2); g.add(bar);
  var red = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.14, 0.42), new THREE.MeshBasicMaterial({ color: 0xff2020 }));
  red.position.set(-0.32, 1.58, -0.2); g.add(red);
  var blue = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.14, 0.42), new THREE.MeshBasicMaterial({ color: 0x2040ff }));
  blue.position.set(0.32, 1.58, -0.2); g.add(blue);
  g.userData.red = red; g.userData.blue = blue;
  g.userData.isCop = true;
  return g;
}
function spawnCop(x, z) {
  var c = makeCruiser();
  c.position.set(x, 0, z);
  c.userData.speed = 0; c.userData.state = 'chase';
  G.scene.add(c); G.cops.push(c);
  return c;
}
function wantedTargetCount() {
  if (G.wanted <= 0) return 0;
  return Math.min(1 + G.wanted, 6); // 2..6 cruisers
}
function updatePolice(dt, t) {
  var want = wantedTargetCount();
  var tx = G.inCar ? G.car.position.x : G.player.position.x;
  var tz = G.inCar ? G.car.position.z : G.player.position.z;
  // spawn / despawn to match the wanted level
  while (G.cops.length < want) {
    var a = rand(0, Math.PI * 2);
    spawnCop(tx + Math.cos(a) * rand(45, 70), tz + Math.sin(a) * rand(45, 70));
  }
  while (G.cops.length > want) { var c = G.cops.pop(); G.scene.remove(c); }
  // helicopter at 4+ stars
  if (G.wanted >= 4 && !G.heli) {
    G.heli = makeHeli(); G.scene.add(G.heli);
    toast('AIR ONE is overhead — break line of sight!');
    AudioSys.siren();
  }
  if (G.wanted < 4 && G.heli) { G.scene.remove(G.heli); G.heli = null; }
  if (G.heli) {
    var h = G.heli;
    h.position.x = lerp(h.position.x, tx, 0.01);
    h.position.z = lerp(h.position.z, tz, 0.01);
    h.position.y = 55 + Math.sin(t * 0.8) * 2;
    h.userData.rotor.rotation.y = t * 30;
    h.userData.spot.target.position.set(tx, 0, tz);
    h.userData.spot.position.set(h.position.x, h.position.y - 1, h.position.z);
  }
  // roadblocks at 3+ stars: a barrier ahead of the player's heading
  if (G.wanted >= 3 && G.roadblocks.length === 0) {
    var fx = G.inCar ? Math.sin(G.car.rotation.y) : Math.sin(G.camYaw);
    var fz = G.inCar ? Math.cos(G.car.rotation.y) : Math.cos(G.camYaw);
    for (var i = 0; i < 2; i++) {
      var bx = tx + fx * (55 + i * 30), bz = tz + fz * (55 + i * 30);
      bx = roadSnap(bx); bz = roadSnap(bz);
      var rb = new THREE.Group();
      var bar1 = new THREE.Mesh(new THREE.BoxGeometry(10, 1.1, 0.5), new THREE.MeshLambertMaterial({ color: 0xff5a2a }));
      bar1.position.y = 0.8; rb.add(bar1);
      var stripe = new THREE.Mesh(new THREE.BoxGeometry(10, 0.3, 0.52), new THREE.MeshLambertMaterial({ color: 0xffffff }));
      stripe.position.y = 1.0; rb.add(stripe);
      var cone = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 8), new THREE.MeshLambertMaterial({ color: 0xff5a2a }));
      cone.position.set(-6, 0.6, 0); rb.add(cone);
      var cone2 = cone.clone(); cone2.position.x = 6; rb.add(cone2);
      rb.position.set(bx, 0, bz);
      rb.rotation.y = Math.atan2(fx, fz) + Math.PI / 2;
      G.scene.add(rb); G.roadblocks.push(rb);
      G.colliders.push({ x: bx, z: bz, hw: 5.4, hd: 5.4 });
      spawnCop(bx - 8, bz - 4); spawnCop(bx + 8, bz + 4);
    }
    toast('Roadblock ahead — find another way through!');
  }
  if (G.wanted < 3 && G.roadblocks.length > 0) {
    for (var j = 0; j < G.roadblocks.length; j++) G.scene.remove(G.roadblocks[j]);
    G.roadblocks = [];
  }
  // cruisers chase + PIT
  for (var i = 0; i < G.cops.length; i++) {
    var cop = G.cops[i];
    var dx = tx - cop.position.x, dz = tz - cop.position.z, d = Math.sqrt(dx * dx + dz * dz) || 1;
    var wantA = Math.atan2(dx, dz);
    var da = wantA - cop.rotation.y;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    cop.rotation.y += clamp(da, -2.4 * dt, 2.4 * dt);
    var top = G.inCar ? 30 : 9;
    cop.userData.speed = lerp(cop.userData.speed, top, 0.02);
    var nx = cop.position.x + Math.sin(cop.rotation.y) * cop.userData.speed * dt;
    var nz = cop.position.z + Math.cos(cop.rotation.y) * cop.userData.speed * dt;
    var hit = collide(nx, nz, 1.6);
    if (hit) { nx = hit.x; nz = hit.z; cop.userData.speed *= 0.5; }
    cop.position.x = clamp(nx, -242, 242); cop.position.z = clamp(nz, -242, 242);
    // flashing light bar
    var ph = Math.floor(t * 6) % 2;
    cop.userData.red.material.color.setHex(ph ? 0xff2020 : 0x551111);
    cop.userData.blue.material.color.setHex(ph ? 0x111155 : 0x2040ff);
    // PIT: ram the player's car from the side / bump the player
    if (d < 4.5) {
      if (G.inCar) {
        G.car.rotation.y += 0.9 * dt * (Math.random() < 0.5 ? 1 : -1);
        G.speed *= 0.86;
        if (Math.random() < dt * 0.5) { damagePlayer(5); AudioSys.crash(); }
      } else if (d < 2.2) {
        damagePlayer(6);
        // busted if a cop touches the player at 3+ stars while on foot and slow
        if (G.wanted >= 3 && Math.abs(G.playerVel.x) + Math.abs(G.playerVel.z) < 2) endGame('busted');
      }
    }
  }
  // wanted decay: hide for a while and the heat drops
  if (G.wanted > 0) {
    var nearest = 999;
    for (var k = 0; k < G.cops.length; k++) nearest = Math.min(nearest, dist2(tx, tz, G.cops[k].position.x, G.cops[k].position.z));
    var hidden = nearest > 55 && !G.shotsFiredT;
    if (hidden) { G.wantedTimer += dt; if (G.wantedTimer > 14) { G.wanted--; G.wantedTimer = 0; toast('Heat dropping — wanted level ' + G.wanted + '.'); } }
    else G.wantedTimer = 0;
  }
}
function makeHeli() {
  var g = new THREE.Group();
  var body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.8, 2.2), new THREE.MeshLambertMaterial({ color: 0x1a2a3a }));
  body.castShadow = true; g.add(body);
  var glass = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 2.0), new THREE.MeshStandardMaterial({ color: 0x9fd8ff, roughness: 0.1, metalness: 0.8 }));
  glass.position.set(2.2, 0.2, 0); g.add(glass);
  var tail = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.5, 0.5), new THREE.MeshLambertMaterial({ color: 0x1a2a3a }));
  tail.position.set(-4, 0.6, 0); g.add(tail);
  var rotor = new THREE.Mesh(new THREE.BoxGeometry(11, 0.12, 0.7), new THREE.MeshLambertMaterial({ color: 0x222222 }));
  rotor.position.y = 1.4; g.add(rotor);
  var spot = new THREE.SpotLight(0xfff2c0, 2.2, 90, 0.28, 0.4, 1);
  g.add(spot); g.add(spot.target);
  g.userData.rotor = rotor; g.userData.spot = spot;
  g.position.set(0, 55, 0);
  return g;
}
function addWanted(n, why) {
  var before = G.wanted;
  G.wanted = clamp(Math.round(G.wanted + n), 0, 5);
  if (G.wanted > before) { G.wantedTimer = 0; if (why) toast(why + ' — wanted level ' + G.wanted + '.'); }
}
