// Solara Bay — init, game loop, input, camera, combat.
G.shotsFiredT = 0;
var clock = null;

function init() {
  var params = new URLSearchParams(location.search);
  G.shot = params.get('shot');
  var canvas = document.getElementById('c');
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  G.renderer = renderer;
  var scene = new THREE.Scene();
  G.scene = scene;
  var camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, 8, -14);
  G.camera = camera;
  buildCity();
  spawnTraffic();
  spawnPeds();
  spawnPackages();
  // parked cars to steal
  for (var i = 0; i < 8; i++) {
    var car = makeCar(pick(CAR_COLORS), Math.random() < 0.3);
    var horizontal = Math.random() < 0.5;
    var street = pick([-210, -140, -70, 0, 70, 140, 210]);
    car.position.set(horizontal ? rand(-200, 200) : street + rand(-4, 4), 0, horizontal ? street + rand(-4, 4) : rand(-200, 200));
    car.rotation.y = horizontal ? Math.PI / 2 : 0;
    G.scene.add(car); G.cars.push(car);
  }
  G.player = makePlayer();
  G.player.position.set(0, 0, 24);
  G.playerVel = new THREE.Vector3(0, 0, 0);
  scene.add(G.player);
  clock = new THREE.Clock();
  initHud();
  bindInput();
  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  // auto-start for screenshot staging (no user gesture needed for the shots)
  if (G.shot && G.shot !== 'title') {
    document.getElementById('title').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    G.started = true;
    applyShotStaging();
  }
  renderer.setAnimationLoop(tick);
}

function bindInput() {
  window.addEventListener('keydown', function (e) {
    G.keys[e.code] = true;
    if (e.code === 'Space') e.preventDefault();
    if (!G.started || G.paused || G.over) return;
    if (e.code === 'KeyE') {
      if (G.inCar) exitCar();
      else {
        // find the nearest car
        var best = null, bd = 5;
        var all = G.cars.concat(G.traffic);
        for (var i = 0; i < all.length; i++) {
          var d = dist2(G.player.position.x, G.player.position.z, all[i].position.x, all[i].position.z);
          if (d < bd) { bd = d; best = all[i]; }
        }
        if (best) {
          var ti = G.traffic.indexOf(best);
          if (ti >= 0) G.traffic.splice(ti, 1);
          enterCar(best);
        }
      }
    }
    if (e.code === 'KeyC') {
      G.lead = 1 - G.lead;
      var old = G.player;
      G.scene.remove(old);
      G.player = makePlayer();
      G.player.position.copy(old.position);
      G.player.rotation.copy(old.rotation);
      G.playerVel = new THREE.Vector3(0, 0, 0);
      G.scene.add(G.player);
      G.player.visible = !G.inCar;
      toast('Now playing ' + G.leads[G.lead].name + ' — ability: ' + G.leads[G.lead].ability + ' (Q).');
    }
    if (e.code === 'KeyQ') {
      if (G.abilityCd <= 0) {
        G.abilityOn = true; G.abilityT = 5; G.abilityCd = 18;
        toast(G.leads[G.lead].ability + ' activated!');
        AudioSys.pickup();
      }
    }
    if (e.code === 'Digit1') G.weapon = 0;
    if (e.code === 'Digit2') G.weapon = 1;
    if (e.code === 'Digit3') G.weapon = 2;
    if (e.code === 'Digit4') G.weapon = 3;
    if (e.code === 'KeyT') tryTaxi();
    if (e.code === 'KeyR') AudioSys.nextStation();
    if (e.code === 'KeyM') {
      var next = MISSIONS.find(function (m) { return G.missionsDone.indexOf(m.id) < 0; });
      if (next) startMission(next);
      else showObjective('<b>All missions done.</b><br>Solara Bay is yours.');
    }
    if (e.code === 'Escape') { if (G.paused) resumeGame(); else pauseGame(); }
  });
  window.addEventListener('keyup', function (e) { G.keys[e.code] = false; });
  var dragging = false, lx = 0, ly = 0;
  var cv = document.getElementById('c');
  cv.addEventListener('mousedown', function (e) { dragging = true; lx = e.clientX; ly = e.clientY; AudioSys.unlock(); });
  window.addEventListener('mousemove', function (e) {
    if (!dragging) return;
    G.camYaw -= (e.clientX - lx) * 0.005;
    G.camPitch = clamp(G.camPitch + (e.clientY - ly) * 0.003, 0.08, 1.1);
    lx = e.clientX; ly = e.clientY;
  });
  window.addEventListener('mouseup', function () { dragging = false; });
  cv.addEventListener('click', function () { if (G.started && !G.inCar && G.weapon > 0) shoot(); });
}

// ---- combat ----
function fireTracer(from, to, color) {
  var dir = new THREE.Vector3().subVectors(to, from);
  var len = dir.length();
  var geo = new THREE.BufferGeometry().setFromPoints([from.clone(), to.clone()]);
  var line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: color || 0xffe9a8, transparent: true, opacity: 0.9 }));
  G.scene.add(line);
  setTimeout(function () { G.scene.remove(line); }, 90);
  return len;
}
function shoot() {
  var w = G.weapons[G.weapon];
  if (G.shootCd > 0 || w.ammo <= 0) return;
  G.shootCd = w.rate;
  if (w.ammo !== Infinity) w.ammo--;
  G.shotsFiredT = 2;
  AudioSys.gunshot(false);
  addWanted(0.5, 'Shots fired');
  var origin = G.player.position.clone(); origin.y = 1.5;
  var dir = new THREE.Vector3();
  G.camera.getWorldDirection(dir);
  var end = origin.clone().add(dir.multiplyScalar(w.range));
  // hit gang members
  var hitGang = null, bestD = w.range;
  for (var i = 0; i < G.gang.length; i++) {
    var g = G.gang[i];
    var d = dist2(origin.x, origin.z, g.position.x, g.position.z);
    if (d < bestD) {
      var ang = Math.atan2(g.position.x - origin.x, g.position.z - origin.z);
      var camA = Math.atan2(dir.x, dir.z);
      var da = Math.abs(ang - camA);
      if (da < 0.35) { bestD = d; hitGang = g; }
    }
  }
  if (hitGang) {
    hitGang.userData.hp -= w.dmg;
    end = hitGang.position.clone(); end.y = 1.3;
    if (hitGang.userData.hp <= 0 && G.mission) G.mission.kills++;
    toast('Hit! Tide Kings member down.');
  }
  fireTracer(origin, end, 0xffe9a8);
  // muzzle flash
  var fl = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffdd66 }));
  fl.position.copy(origin).add(new THREE.Vector3(0, 0, 0.6));
  G.scene.add(fl);
  setTimeout(function () { G.scene.remove(fl); }, 60);
}
// ---- camera ----
function updateCamera(dt) {
  var cam = G.camera;
  if (G.shotCam === 'aerial') {
    cam.position.set(150, 170, 150);
    cam.lookAt(0, 0, 0);
    return;
  }
  // frame-rate independent smoothing so the camera settles even at low fps
  var kDrive = 1 - Math.pow(0.0001, dt);
  var kFoot = 1 - Math.pow(0.001, dt);
  var target, dist, height;
  if (G.inCar && G.car) {
    target = G.car.position;
    dist = 13; height = 5;
    var cy = G.car.rotation.y + Math.PI; // behind the car
    var cx = target.x + Math.sin(cy) * dist;
    var cz = target.z + Math.cos(cy) * dist;
    cam.position.x = lerp(cam.position.x, cx, kDrive);
    cam.position.y = lerp(cam.position.y, height, kDrive);
    cam.position.z = lerp(cam.position.z, cz, kDrive);
    cam.lookAt(target.x, 1.6, target.z);
  } else {
    target = G.player.position;
    dist = 9; height = 4.2;
    var yaw = G.camYaw, pitch = G.camPitch;
    var ox = Math.sin(yaw) * Math.cos(pitch) * dist;
    var oz = Math.cos(yaw) * Math.cos(pitch) * dist;
    var oy = Math.sin(pitch) * dist + 1.4;
    cam.position.x = lerp(cam.position.x, target.x + ox, kFoot);
    cam.position.y = lerp(cam.position.y, target.y + oy, kFoot);
    cam.position.z = lerp(cam.position.z, target.z + oz, kFoot);
    cam.lookAt(target.x, target.y + 1.5, target.z);
  }
}

// ---- main loop ----
function tick() {
  var dt = Math.min(clock.getDelta(), 0.05);
  var t = clock.elapsedTime;
  G.dt = dt; G.frame++;
  if (G.started && !G.paused && !G.over) {
    G.time = (G.time + dt * 0.02) % 24; // a full day in ~20 min
    if (G.shootCd > 0) G.shootCd -= dt;
    if (G.abilityCd > 0) G.abilityCd -= dt;
    if (G.abilityOn) { G.abilityT -= dt; if (G.abilityT <= 0) G.abilityOn = false; }
    if (G.shotsFiredT > 0) G.shotsFiredT -= dt;
    if (G.inCar) updateDriving(dt); else updateOnFoot(dt);
    updateTraffic(dt);
    updatePeds(dt, t);
    updateGang(dt);
    updatePolice(dt, t);
    updateMissions(dt);
    updateRace(dt);
    checkRaceStart();
    updateTaxi(dt);
    updateTailCar(dt);
    updatePickups(dt, t);
    updateHud();
  }
  updateEnvironment(dt, t);
  updateCamera(dt);
  G.renderer.render(G.scene, G.camera);
}

init();
