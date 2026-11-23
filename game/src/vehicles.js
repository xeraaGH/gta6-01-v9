// Solara Bay — vehicles: detailed car models, traffic AI, player driving.
var CAR_COLORS = [0xc0392b, 0x2471a3, 0x229954, 0xd4ac0d, 0x7d3c98, 0xe67e22, 0xeeeeee, 0x1a1a1a, 0x2e9be6, 0xff5d8f];

function makeCar(color, sport) {
  var g = new THREE.Group();
  var bodyMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.35, metalness: 0.55 });
  var darkMat = new THREE.MeshStandardMaterial({ color: 0x14181d, roughness: 0.2, metalness: 0.4 });
  var glassMat = new THREE.MeshStandardMaterial({ color: 0x9fd8ff, roughness: 0.1, metalness: 0.8 });
  var body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 4.4), bodyMat);
  body.position.y = 0.55; body.castShadow = true; g.add(body);
  var cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.2), glassMat);
  cabin.position.set(0, 1.08, -0.2); cabin.castShadow = true; g.add(cabin);
  var roof = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.1, 2.0), bodyMat);
  roof.position.set(0, 1.38, -0.2); g.add(roof);
  var bumperF = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.28, 0.3), darkMat);
  bumperF.position.set(0, 0.42, 2.2); g.add(bumperF);
  var bumperR = bumperF.clone(); bumperR.position.z = -2.2; g.add(bumperR);
  var grille = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.08), darkMat);
  grille.position.set(0, 0.62, 2.22); g.add(grille);
  // headlights / taillights (emissive so they read at night)
  var hlMat = new THREE.MeshBasicMaterial({ color: 0xfff6c0 });
  var tlMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  [-0.7, 0.7].forEach(function (x) {
    var hl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.08), hlMat);
    hl.position.set(x, 0.68, 2.24); g.add(hl);
    var tl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.08), tlMat);
    tl.position.set(x, 0.68, -2.24); g.add(tl);
    var mir = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.3), bodyMat);
    mir.position.set(x * 1.15, 1.05, 0.7); g.add(mir);
  });
  if (sport) {
    var spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.08, 0.5), darkMat);
    spoiler.position.set(0, 1.15, -2.1); g.add(spoiler);
    var s1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.35, 0.1), darkMat);
    s1.position.set(-0.8, 0.95, -2.1); g.add(s1);
    var s2 = s1.clone(); s2.position.x = 0.8; g.add(s2);
  }
  // wheels with hubs
  var wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 12);
  var hubGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.3, 8);
  var wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
  var hubMat = new THREE.MeshStandardMaterial({ color: 0xbbbbbb, metalness: 0.8, roughness: 0.3 });
  var wheels = [];
  [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]].forEach(function (p) {
    var w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2; w.position.set(p[0], 0.36, p[1]); w.castShadow = true; g.add(w);
    var h = new THREE.Mesh(hubGeo, hubMat);
    h.rotation.z = Math.PI / 2; h.position.set(p[0], 0.36, p[1]); g.add(h);
    wheels.push(w);
  });
  g.userData.wheels = wheels;
  g.userData.isCar = true;
  return g;
}

function spawnTraffic() {
  for (var i = 0; i < 12; i++) {
    var car = makeCar(pick(CAR_COLORS), Math.random() < 0.25);
    var horizontal = Math.random() < 0.5;
    var street = pick([-210, -140, -70, 0, 70, 140, 210]);
    var along = rand(-210, 210);
    car.position.set(horizontal ? along : street, 0, horizontal ? street : along);
    car.rotation.y = horizontal ? (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (Math.random() < 0.5 ? 0 : Math.PI);
    car.userData.speed = rand(7, 13);
    car.userData.horizontal = horizontal;
    car.userData.street = street;
    car.userData.dir = Math.random() < 0.5 ? 1 : -1;
    G.scene.add(car);
    G.traffic.push(car);
  }
}

function updateTraffic(dt) {
  for (var i = 0; i < G.traffic.length; i++) {
    var c = G.traffic[i];
    var s = c.userData.speed * c.userData.dir * dt;
    if (c.userData.horizontal) {
      c.position.x += s;
      if (c.position.x > 235) { c.position.x = -235; c.userData.street = pick([-210, -140, -70, 0, 70, 140, 210]); c.position.z = c.userData.street; }
      if (c.position.x < -235) { c.position.x = 235; c.userData.street = pick([-210, -140, -70, 0, 70, 140, 210]); c.position.z = c.userData.street; }
    } else {
      c.position.z += s;
      if (c.position.z > 235) { c.position.z = -235; c.userData.street = pick([-210, -140, -70, 0, 70, 140, 210]); c.position.x = c.userData.street; }
      if (c.position.z < -235) { c.position.z = 235; c.userData.street = pick([-210, -140, -70, 0, 70, 140, 210]); c.position.x = c.userData.street; }
    }
    // wheel spin
    var w = c.userData.wheels;
    for (var k = 0; k < w.length; k++) w[k].rotation.x += c.userData.speed * dt * 1.4;
  }
}

// Player driving: arcade physics, collision with buildings, steal any parked car.
function enterCar(car) {
  G.inCar = true; G.car = car;
  G.player.visible = false;
  car.userData.driver = true;
  toast('You took the ' + (car.userData.sport ? 'sports car' : 'sedan') + '.');
  addWanted(1, 'Grand theft auto');
  AudioSys.engineStart();
}
function exitCar() {
  if (!G.car) return;
  var car = G.car;
  car.userData.driver = false;
  G.inCar = false; G.car = null;
  G.player.visible = true;
  G.player.position.set(car.position.x + 2.5, 0, car.position.z + 1);
  G.playerVel.set(0, 0, 0);
}
function updateDriving(dt) {
  var car = G.car; if (!car) return;
  var k = G.keys;
  var accel = 0, steer = 0;
  if (k['KeyW'] || k['ArrowUp']) accel += 1;
  if (k['KeyS'] || k['ArrowDown']) accel -= 0.7;
  if (k['KeyA'] || k['ArrowLeft']) steer += 1;
  if (k['KeyD'] || k['ArrowRight']) steer -= 1;
  var nitro = (G.abilityOn && G.lead === 1) ? 1.9 : 1;
  var top = 34 * nitro;
  G.speed += accel * 26 * dt * nitro;
  if (!accel) G.speed *= Math.pow(0.4, dt);
  if (k['ShiftLeft'] || k['ShiftRight']) G.speed *= Math.pow(0.15, dt); // handbrake
  G.speed = clamp(G.speed, -10, top);
  var dir = G.speed >= 0 ? 1 : -1;
  car.rotation.y += steer * 1.9 * dt * dir * clamp(Math.abs(G.speed) / 8, 0, 1);
  var fx = Math.sin(car.rotation.y), fz = Math.cos(car.rotation.y);
  var nx = car.position.x + fx * G.speed * dt;
  var nz = car.position.z + fz * G.speed * dt;
  // building collision: push out
  var hit = collide(nx, nz, 1.6);
  if (hit) { nx = hit.x; nz = hit.z; G.speed *= 0.4; if (Math.abs(G.speed) > 12) { damagePlayer(4); AudioSys.crash(); } }
  nx = clamp(nx, -242, 242); nz = clamp(nz, -242, 242);
  car.position.x = nx; car.position.z = nz;
  // wheel spin + body lean
  var w = car.userData.wheels;
  for (var i = 0; i < w.length; i++) w[i].rotation.x += G.speed * dt * 1.4;
  car.rotation.z = lerp(car.rotation.z, -steer * 0.05 * clamp(Math.abs(G.speed) / 20, 0, 1), 0.2);
  // engine sound + speed lines
  AudioSys.engine(G.speed / top, G.abilityOn && G.lead === 1);
  // near-miss / speeding past a cop raises heat
  if (Math.abs(G.speed) > 26) {
    for (var j = 0; j < G.cops.length; j++) {
      if (dist2(nx, nz, G.cops[j].position.x, G.cops[j].position.z) < 14) { addWanted(0.25, 'Speeding past the law'); break; }
    }
  }
}
// Circle vs building AABB push-out. Returns corrected {x,z} or null.
function collide(x, z, r) {
  for (var i = 0; i < G.colliders.length; i++) {
    var c = G.colliders[i];
    var cx = clamp(x, c.x - c.hw, c.x + c.hw), cz = clamp(z, c.z - c.hd, c.z + c.hd);
    var dx = x - cx, dz = z - cz, d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      var d = Math.sqrt(d2) || 0.001;
      return { x: cx + dx / d * r, z: cz + dz / d * r };
    }
  }
  return null;
}
