// Solara Bay — the city: sky, ocean, beach, roads, buildings, props, landmarks.
// All textures are generated on canvas at runtime; no image files are loaded.

// ---- canvas texture helpers ----
function canvasTex(w, h, draw) {
  var c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  var t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
}
// A building facade: base colour, window grid, shopfront, tint band. Returns {map, emissive}.
function facadeTex(base, win, lit) {
  var cols = randi(4, 7), rows = randi(6, 12);
  var map = canvasTex(256, 256, function (g, w, h) {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    // subtle vertical grime + tint band near the top
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 0, w, 18);
    g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(0, h - 26, w, 26);
    var cw = w / cols, ch = (h - 40) / rows;
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var x = c * cw + cw * 0.18, y = 24 + r * ch + ch * 0.16;
      g.fillStyle = 'rgba(20,26,34,0.9)'; g.fillRect(x - 2, y - 2, cw * 0.64 + 4, ch * 0.68 + 4);
      g.fillStyle = win; g.fillRect(x, y, cw * 0.64, ch * 0.68);
      g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x, y, cw * 0.64, 3);
    }
    // ground-floor shopfront
    g.fillStyle = '#20242c'; g.fillRect(0, h - 26, w, 26);
    g.fillStyle = lit; g.fillRect(8, h - 22, w - 16, 18);
  });
  var em = canvasTex(256, 256, function (g, w, h) {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    var cw = w / cols, ch = (h - 40) / rows;
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      if (Math.random() < 0.42) {
        g.fillStyle = pick(['#ffd98a', '#ffedb0', '#9fd8ff', '#ffb36b']);
        g.fillRect(c * cw + cw * 0.18, 24 + r * ch + ch * 0.16, cw * 0.64, ch * 0.68);
      }
    }
    g.fillStyle = '#ffca6a'; g.fillRect(8, h - 22, w - 16, 18);
  });
  return { map: map, emissive: em };
}
// Road surface: asphalt with dashed centre line.
function roadTex() {
  return canvasTex(128, 128, function (g, w, h) {
    g.fillStyle = '#2b2f36'; g.fillRect(0, 0, w, h);
    for (var i = 0; i < 260; i++) { g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    g.fillStyle = '#e8c33a'; g.fillRect(w / 2 - 2, 0, 4, 44); g.fillRect(w / 2 - 2, 84, 4, 44);
    g.fillStyle = 'rgba(255,255,255,0.75)'; g.fillRect(4, 0, 3, h); g.fillRect(w - 7, 0, 3, h);
  });
}
function softBlobTex() {
  return canvasTex(128, 128, function (g, w, h) {
    var grd = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    grd.addColorStop(0, 'rgba(255,255,255,0.95)'); grd.addColorStop(0.6, 'rgba(255,255,255,0.45)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
  });
}
function billboardTex(lines, bg, fg) {
  return canvasTex(256, 128, function (g, w, h) {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = fg; g.font = 'bold 30px Arial'; g.textAlign = 'center';
    lines.forEach(function (s, i) { g.fillText(s, w / 2, 52 + i * 34); });
    g.strokeStyle = fg; g.lineWidth = 5; g.strokeRect(4, 4, w - 8, h - 8);
  });
}

// ---- district palettes ----
var DISTRICTS = {
  'La Plaza':       { base: ['#e8c9a0', '#dfb28a', '#e6d3b3'], win: '#7fb2c9', h: [14, 26], roof: '#b4552d' },
  'Old Harbor':     { base: ['#a4553a', '#8f4a34', '#b06a48'], win: '#5d7a72', h: [10, 18], roof: '#5d4030' },
  'North Beach':    { base: ['#f2e8d5', '#e8dcc8', '#ffffff'], win: '#6fb7d8', h: [24, 46], roof: '#3e7ea6' },
  'University Hill':{ base: ['#9c4a3c', '#a85840', '#8a3f33'], win: '#8aa8b8', h: [12, 22], roof: '#4a3226' },
  'Palm Heights':   { base: ['#cfe0e8', '#d8e6ee', '#b8ccd8'], win: '#4a7ea6', h: [30, 58], roof: '#2e4a5e' },
  'The Docks':      { base: ['#7a6a58', '#6b5d4c', '#8a7a66'], win: '#6a7a5a', h: [9, 15], roof: '#3c3630' },
};

function buildCity() {
  var scene = G.scene;
  var sun = new THREE.DirectionalLight(0xfff2d8, 1.15);
  sun.position.set(120, 180, 60); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -260; sun.shadow.camera.right = 260;
  sun.shadow.camera.top = 260; sun.shadow.camera.bottom = -260;
  sun.shadow.camera.far = 600;
  scene.add(sun); G.sun = sun;
  var hemi = new THREE.HemisphereLight(0xbfd9ff, 0x3a2f26, 0.75); scene.add(hemi); G.hemi = hemi;

  // sky dome (gradient shader, recoloured by time of day)
  var skyGeo = new THREE.SphereGeometry(900, 24, 16);
  var skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x2f7fd0) }, bot: { value: new THREE.Color(0xcfe8f5) } },
    vertexShader: 'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying vec3 vP; void main(){ float h=vP.y/900.0; float t=clamp(h,0.0,1.0); vec3 col=mix(bot,top,pow(t,0.8)); if(h<0.0) col=mix(bot,vec3(0.04,0.05,0.08),clamp(-h*4.0,0.0,1.0)); gl_FragColor=vec4(col,1.0); }',
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat)); G.skyMat = skyMat;

  // sun + moon discs
  var sunSpr = new THREE.Mesh(new THREE.CircleGeometry(26, 24), new THREE.MeshBasicMaterial({ color: 0xffe9a8, fog: false }));
  var moonSpr = new THREE.Mesh(new THREE.CircleGeometry(18, 24), new THREE.MeshBasicMaterial({ color: 0xe8eef5, fog: false }));
  scene.add(sunSpr); scene.add(moonSpr); G.sunDisc = sunSpr; G.moonDisc = moonSpr;

  // clouds
  var blob = softBlobTex();
  for (var i = 0; i < 14; i++) {
    var cl = new THREE.Sprite(new THREE.SpriteMaterial({ map: blob, transparent: true, opacity: rand(0.35, 0.7), fog: false }));
    cl.position.set(rand(-700, 700), rand(150, 260), rand(-700, 700));
    cl.scale.set(rand(120, 260), rand(30, 60), 1);
    cl.userData.vx = rand(1, 3);
    scene.add(cl); G.clouds.push(cl);
  }

  scene.fog = new THREE.Fog(0xcfe0ea, 220, 780);

  // ground: grass/concrete base + sand strip + ocean
  var ground = new THREE.Mesh(new THREE.PlaneGeometry(560, 560), new THREE.MeshLambertMaterial({ color: 0x4a7a4a }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.05, 0); ground.receiveShadow = true; scene.add(ground);
  var plaza = new THREE.Mesh(new THREE.PlaneGeometry(150, 150), new THREE.MeshLambertMaterial({ color: 0xb8a88a }));
  plaza.rotation.x = -Math.PI / 2; plaza.position.set(0, 0.02, 0); plaza.receiveShadow = true; scene.add(plaza);
  var sand = new THREE.Mesh(new THREE.PlaneGeometry(46, 560), new THREE.MeshLambertMaterial({ color: 0xe8d49a }));
  sand.rotation.x = -Math.PI / 2; sand.position.set(226, 0.02, 0); sand.receiveShadow = true; scene.add(sand);
  var oceanGeo = new THREE.PlaneGeometry(420, 560, 48, 48);
  var ocean = new THREE.Mesh(oceanGeo, new THREE.MeshPhongMaterial({ color: 0x1a6a9e, shininess: 120, transparent: true, opacity: 0.94 }));
  ocean.rotation.x = -Math.PI / 2; ocean.position.set(460, 0.4, 0); scene.add(ocean);
  G.ocean = ocean; G.oceanBase = oceanGeo.attributes.position.array.slice();

  // roads (grid every 70) with markings
  var rt = roadTex(); rt.wrapS = rt.wrapT = THREE.RepeatWrapping;
  var roadMat = new THREE.MeshLambertMaterial({ map: rt });
  for (var r = -210; r <= 210; r += 70) {
    var rx = new THREE.Mesh(new THREE.PlaneGeometry(500, 12), roadMat.clone());
    rx.material.map = rt.clone(); rx.material.map.repeat.set(7, 1); rx.material.map.needsUpdate = true;
    rx.rotation.x = -Math.PI / 2; rx.position.set(0, 0.05, r); rx.receiveShadow = true; scene.add(rx);
    var rz = new THREE.Mesh(new THREE.PlaneGeometry(12, 500), roadMat.clone());
    rz.material.map = rt.clone(); rz.material.map.repeat.set(7, 1); rz.material.map.needsUpdate = true;
    rz.rotation.x = -Math.PI / 2; rz.rotation.z = Math.PI / 2; rz.position.set(r, 0.05, 0); rz.receiveShadow = true; scene.add(rz);
  }

  buildBlocks(scene);
  buildProps(scene);
  buildPier(scene);
  buildFountain(scene);
}

function buildingAt(bx, bz, w, d, h, district) {
  var pal = DISTRICTS[district];
  var tex = facadeTex(pick(pal.base), pal.win, pick(['#ff9a3c', '#37c8ab', '#ff5d8f']));
  var mat = new THREE.MeshStandardMaterial({ map: tex.map, emissiveMap: tex.emissive, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.85, metalness: 0.05 });
  var b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  b.position.set(bx, h / 2, bz); b.castShadow = true; b.receiveShadow = true;
  G.scene.add(b); G.buildings.push(b);
  G.colliders.push({ x: bx, z: bz, hw: w / 2 + 0.6, hd: d / 2 + 0.6 });
  // parapet + rooftop clutter
  var pm = new THREE.MeshLambertMaterial({ color: pal.roof });
  var par = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.9, d + 0.6), pm);
  par.position.set(bx, h + 0.45, bz); G.scene.add(par);
  if (Math.random() < 0.6) {
    var ac = new THREE.Mesh(new THREE.BoxGeometry(rand(2, 4), 1.2, rand(2, 4)), new THREE.MeshLambertMaterial({ color: 0x9aa2a8 }));
    ac.position.set(bx + rand(-w / 4, w / 4), h + 1.4, bz + rand(-d / 4, d / 4)); G.scene.add(ac);
  }
  if (Math.random() < 0.4) {
    var tank = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 3, 10), new THREE.MeshLambertMaterial({ color: 0x7a5a3a }));
    tank.position.set(bx + rand(-w / 4, w / 4), h + 2.2, bz + rand(-d / 4, d / 4)); G.scene.add(tank);
  }
  if (Math.random() < 0.35) {
    var sign = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 2.2, 0.5), new THREE.MeshLambertMaterial({ color: pick([0xff5d8f, 0x37c8ab, 0xffb300, 0x2e9be6]), emissive: pick([0x881133, 0x0a5544, 0x664400, 0x0a3a66]) }));
    sign.position.set(bx, h - 1.5, bz + d / 2 + 0.3); G.scene.add(sign);
  }
  return b;
}

function buildBlocks(scene) {
  // blocks between the street grid; skip the beach strip and the plaza centre
  for (var bx = -210; bx <= 140; bx += 70) {
    for (var bz = -210; bz <= 140; bz += 70) {
      var cx = bx + 35, cz = bz + 35;
      if (Math.abs(cx) < 65 && Math.abs(cz) < 65) continue; // La Plaza square
      var district = districtAt(cx, cz);
      var pal = DISTRICTS[district];
      var n = district === 'The Docks' ? 1 : randi(2, 4);
      for (var i = 0; i < n; i++) {
        var w = rand(14, 26), d = rand(14, 26);
        var px = cx + rand(-14, 14), pz = cz + rand(-14, 14);
        if (px > 196) continue; // keep the beach clear
        var h = rand(pal.h[0], pal.h[1]);
        buildingAt(px, pz, w, d, h, district);
      }
    }
  }
  // landmark towers on the Palm Heights skyline
  buildingAt(150, 150, 30, 30, 72, 'Palm Heights');
  buildingAt(185, 185, 24, 24, 58, 'Palm Heights');
  buildingAt(120, -150, 26, 26, 54, 'North Beach');
}

function streetlight(x, z) {
  var g = new THREE.Group();
  var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 7, 8), new THREE.MeshLambertMaterial({ color: 0x2a2f36 }));
  pole.position.y = 3.5; pole.castShadow = true; g.add(pole);
  var arm = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 0.18), new THREE.MeshLambertMaterial({ color: 0x2a2f36 }));
  arm.position.set(1.1, 6.9, 0); g.add(arm);
  var lamp = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff2c0 }));
  lamp.position.set(2.2, 6.8, 0); g.add(lamp); G.streetlamps.push(lamp);
  var bulb = new THREE.Mesh(new THREE.CircleGeometry(0.7, 10), new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.0, side: THREE.DoubleSide }));
  bulb.position.set(2.2, 6.7, 0); bulb.rotation.x = Math.PI / 2; g.add(bulb); G.lampGlows.push(bulb);
  g.position.set(x, 0, z); G.scene.add(g);
}
function palm(x, z) {
  var g = new THREE.Group();
  var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, rand(6, 9), 7), new THREE.MeshLambertMaterial({ color: 0x7a5a3a }));
  trunk.position.y = 3.5; trunk.rotation.z = rand(-0.08, 0.08); trunk.castShadow = true; g.add(trunk);
  for (var i = 0; i < 7; i++) {
    var frond = new THREE.Mesh(new THREE.ConeGeometry(0.9, 4.4, 4), new THREE.MeshLambertMaterial({ color: 0x2e8b57 }));
    var a = (i / 7) * Math.PI * 2;
    frond.position.set(Math.cos(a) * 1.7, 7.4, Math.sin(a) * 1.7);
    frond.rotation.z = Math.cos(a) * 1.1; frond.rotation.x = -Math.sin(a) * 1.1;
    g.add(frond);
  }
  g.position.set(x, 0, z); G.scene.add(g);
}
function buildProps(scene) {
  G.streetlamps = []; G.lampGlows = [];
  // streetlights along every street corner
  for (var x = -210; x <= 210; x += 70) for (var z = -210; z <= 210; z += 70) {
    streetlight(x + 8, z + 8);
  }
  // palms along the beach boulevard and the plaza
  for (var z = -200; z <= 200; z += 28) palm(190, z);
  for (var i = 0; i < 8; i++) palm(rand(-55, 55), rand(-55, 55) + (Math.random() < 0.5 ? 62 : -62));
  // billboards
  var bb1 = new THREE.Mesh(new THREE.PlaneGeometry(18, 9), new THREE.MeshLambertMaterial({ map: billboardTex(['SOLARA BAY', 'LIVE FREE'], '#12283e', '#ffd23e'), emissive: 0x222222 }));
  bb1.position.set(-35, 16, -140); bb1.rotation.y = 0.3; scene.add(bb1);
  var bb2 = new THREE.Mesh(new THREE.PlaneGeometry(18, 9), new THREE.MeshLambertMaterial({ map: billboardTex(['TIDE KINGS', 'OWN THE NIGHT'], '#2e0a14', '#ff5d8f') }));
  bb2.position.set(140, 18, 105); bb2.rotation.y = -2.4; scene.add(bb2);
  var bb3 = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), new THREE.MeshLambertMaterial({ map: billboardTex(['NOVA & TURBO', 'THE SOLARA CREW'], '#0a2e1a', '#7dff9a') }));
  bb3.position.set(35, 15, 175); bb3.rotation.y = Math.PI; scene.add(bb3);
  // benches + umbrellas on the beach
  for (var z = -180; z <= 180; z += 45) {
    var um = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.6, 8), new THREE.MeshLambertMaterial({ color: pick([0xff5d8f, 0xffb300, 0x2e9be6, 0x37c8ab]) }));
    um.position.set(216, 3.4, z); um.castShadow = true; scene.add(um);
    var up = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.4, 6), new THREE.MeshLambertMaterial({ color: 0xdddddd }));
    up.position.set(216, 1.7, z); scene.add(up);
  }
  // shipping containers in The Docks
  var contCols = [0xc0392b, 0x2471a3, 0x229954, 0xd4ac0d, 0x7d3c98];
  for (var i = 0; i < 14; i++) {
    var c = new THREE.Mesh(new THREE.BoxGeometry(12, 2.6, 2.6), new THREE.MeshLambertMaterial({ color: pick(contCols) }));
    c.position.set(rand(80, 190), 1.3 + (i % 3) * 2.7, rand(-35, 35));
    c.rotation.y = (i % 2) * 0.12; c.castShadow = true; scene.add(c);
    G.colliders.push({ x: c.position.x, z: c.position.z, hw: 6.4, hd: 1.8 });
  }
  // dock cranes
  for (var i = 0; i < 2; i++) {
    var cr = new THREE.Group();
    var leg = new THREE.Mesh(new THREE.BoxGeometry(2, 26, 2), new THREE.MeshLambertMaterial({ color: 0xd4ac0d }));
    leg.position.y = 13; cr.add(leg);
    var jib = new THREE.Mesh(new THREE.BoxGeometry(30, 1.6, 1.6), new THREE.MeshLambertMaterial({ color: 0xd4ac0d }));
    jib.position.set(12, 25, 0); cr.add(jib);
    cr.position.set(150 + i * 40, 0, -20 + i * 40); scene.add(cr);
  }
}
function buildPier(scene) {
  // wooden pier out over the ocean at z = 0, lighthouse at its end
  var deck = new THREE.Mesh(new THREE.BoxGeometry(70, 1, 10), new THREE.MeshLambertMaterial({ color: 0x8a6a48 }));
  deck.position.set(275, 1.2, 0); deck.castShadow = true; scene.add(deck);
  for (var x = 246; x <= 306; x += 10) {
    var p = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 3, 6), new THREE.MeshLambertMaterial({ color: 0x5d4030 }));
    p.position.set(x, 0, -4); scene.add(p);
    var p2 = p.clone(); p2.position.z = 4; scene.add(p2);
  }
  var rail = new THREE.Mesh(new THREE.BoxGeometry(70, 0.9, 0.3), new THREE.MeshLambertMaterial({ color: 0xdddddd }));
  rail.position.set(275, 2.4, -4.8); scene.add(rail);
  var rail2 = rail.clone(); rail2.position.z = 4.8; scene.add(rail2);
  // lighthouse: striped tower + rotating beam
  var lh = new THREE.Group();
  var tower = new THREE.Mesh(new THREE.CylinderGeometry(3, 4.4, 22, 12), new THREE.MeshLambertMaterial({ color: 0xf2ead8 }));
  tower.position.y = 11; tower.castShadow = true; lh.add(tower);
  for (var i = 0; i < 3; i++) {
    var band = new THREE.Mesh(new THREE.CylinderGeometry(3.5 - i * 0.3, 3.7 - i * 0.3, 2.4, 12), new THREE.MeshLambertMaterial({ color: 0xc0392b }));
    band.position.y = 5 + i * 6; lh.add(band);
  }
  var lamp = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 10), new THREE.MeshBasicMaterial({ color: 0xfff2c0 }));
  lamp.position.y = 23.4; lh.add(lamp); G.lighthouseLamp = lamp;
  var beam = new THREE.Mesh(new THREE.ConeGeometry(3.2, 60, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
  beam.rotation.z = Math.PI / 2; beam.position.set(30, 23.4, 0); lh.add(beam); G.lighthouseBeam = beam;
  lh.position.set(308, 1.2, 0); scene.add(lh);
}
function buildFountain(scene) {
  var g = new THREE.Group();
  var basin = new THREE.Mesh(new THREE.CylinderGeometry(9, 10, 1.6, 20), new THREE.MeshLambertMaterial({ color: 0xcfc4ae }));
  basin.position.y = 0.8; basin.castShadow = true; g.add(basin);
  var water = new THREE.Mesh(new THREE.CircleGeometry(8.4, 20), new THREE.MeshPhongMaterial({ color: 0x2e9be6, shininess: 140 }));
  water.rotation.x = -Math.PI / 2; water.position.y = 1.65; g.add(water); G.fountainWater = water;
  var col = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.8, 4.4, 10), new THREE.MeshLambertMaterial({ color: 0xcfc4ae }));
  col.position.y = 2.6; g.add(col);
  var top = new THREE.Mesh(new THREE.SphereGeometry(1.4, 12, 10), new THREE.MeshLambertMaterial({ color: 0xffd23e }));
  top.position.y = 5.2; g.add(top);
  g.position.set(0, 0, 0); scene.add(g);
  G.colliders.push({ x: 0, z: 0, hw: 10.5, hd: 10.5 });
}
// ---- day / night + weather, called every frame ----
function updateEnvironment(dt, t) {
  var hour = G.time;
  // day factor: 1 at noon, 0 at midnight
  var dayF = clamp(Math.sin((hour - 6) / 12 * Math.PI), 0, 1);
  G.dayNight = 1 - dayF;
  var sunA = (hour - 6) / 12 * Math.PI; // sun path
  G.sun.position.set(Math.cos(sunA) * 300, Math.sin(sunA) * 220 + 20, 120);
  G.sun.intensity = 0.25 + dayF * 0.95;
  G.sun.color.setHSL(0.09, 0.6, lerp(0.55, 0.75, dayF));
  G.hemi.intensity = 0.3 + dayF * 0.5;
  var top = new THREE.Color().setHSL(0.58, 0.65, lerp(0.06, 0.55, dayF));
  var bot = new THREE.Color().setHSL(0.08, 0.7, lerp(0.08, 0.75, dayF));
  if (hour > 17 && hour < 19) { top.setHSL(0.62, 0.5, 0.28); bot.setHSL(0.05, 0.85, 0.55); } // golden hour
  G.skyMat.uniforms.top.value.copy(top); G.skyMat.uniforms.bot.value.copy(bot);
  G.scene.fog.color.copy(bot).lerp(new THREE.Color(0x0a1420), G.dayNight * 0.7);
  G.scene.fog.near = 220 - G.dayNight * 60;
  // sun / moon discs
  G.sunDisc.position.set(Math.cos(sunA) * 700, Math.sin(sunA) * 520 + 40, -300);
  G.sunDisc.material.opacity = dayF > 0.02 ? 1 : 0; G.sunDisc.visible = dayF > 0.02;
  var moonA = sunA + Math.PI;
  G.moonDisc.position.set(Math.cos(moonA) * 700, Math.sin(moonA) * 520 + 40, -300);
  G.moonDisc.visible = dayF < 0.5;
  // clouds drift
  for (var i = 0; i < G.clouds.length; i++) {
    var c = G.clouds[i]; c.position.x += c.userData.vx * dt;
    if (c.position.x > 760) c.position.x = -760;
    c.material.opacity = lerp(0.12, 0.55, dayF);
  }
  // building windows + streetlights glow at night
  var glow = G.dayNight;
  for (var i = 0; i < G.buildings.length; i++) G.buildings[i].material.emissiveIntensity = glow * 0.85;
  for (var j = 0; j < G.streetlamps.length; j++) {
    G.streetlamps[j].material.color.setHex(glow > 0.4 ? 0xffe9a8 : 0x8a8a7a);
    G.lampGlows[j].material.opacity = glow * 0.35;
  }
  if (G.lighthouseLamp) G.lighthouseLamp.material.color.setHex(glow > 0.3 ? 0xfff2c0 : 0xcccccc);
  if (G.lighthouseBeam) { G.lighthouseBeam.rotation.y = t * 0.5; G.lighthouseBeam.material.opacity = glow > 0.3 ? 0.16 : 0.03; }
  // ocean waves (throttled to every 3rd frame — cheap on real GPUs, and the
  // headless software renderer needs the breathing room)
  if (G.ocean && G.frame % 3 === 0) {
    var pos = G.ocean.geometry.attributes.position, base = G.oceanBase;
    for (var k = 0; k < pos.count; k++) {
      var bx = base[k * 3], by = base[k * 3 + 1];
      pos.setZ(k, Math.sin(bx * 0.12 + t * 1.4) * 0.9 + Math.cos(by * 0.1 + t * 0.9) * 0.7);
    }
    pos.needsUpdate = true; G.ocean.geometry.computeVertexNormals();
  }
  if (G.fountainWater) G.fountainWater.material.color.setHSL(0.55, 0.7, 0.45 + Math.sin(t * 2) * 0.08);
  // rain (light, occasional)
  G.rainT -= dt;
  if (G.rainT <= 0) { G.raining = Math.random() < 0.18; G.rainT = rand(20, 60); }
}
