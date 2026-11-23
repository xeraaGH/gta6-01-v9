// Solara Bay — synthesized sound: engine, siren, gunshots, radio. No audio files.
var AudioSys = (function () {
  var ctx = null, master = null, engineOsc = null, engineOsc2 = null, engineGain = null;
  var stations = ['SOL FM', 'NEON 98', 'TIDE RADIO'];
  var station = 0, radioTimer = null, radioOn = false;
  function ensure() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
      } catch (e) { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function noiseBuf(dur) {
    var len = Math.floor(ctx.sampleRate * dur);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
  function blip(freq, dur, type, vol, slide) {
    if (!ensure()) return;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, ctx.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.2, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + dur);
  }
  return {
    unlock: ensure,
    stationName: function () { return stations[station]; },
    engineStart: function () {
      if (!ensure() || engineOsc) return;
      engineOsc = ctx.createOscillator(); engineOsc2 = ctx.createOscillator();
      engineOsc.type = 'sawtooth'; engineOsc2.type = 'square';
      engineOsc.frequency.value = 55; engineOsc2.frequency.value = 28;
      engineGain = ctx.createGain(); engineGain.gain.value = 0.0;
      var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
      engineOsc.connect(f); engineOsc2.connect(f); f.connect(engineGain); engineGain.connect(master);
      engineOsc.start(); engineOsc2.start();
    },
    engine: function (ratio, nitro) {
      if (!engineOsc || !ctx) return;
      var t = ctx.currentTime;
      engineOsc.frequency.setTargetAtTime(50 + ratio * 160 + (nitro ? 60 : 0), t, 0.05);
      engineOsc2.frequency.setTargetAtTime(25 + ratio * 80, t, 0.05);
      engineGain.gain.setTargetAtTime(G.inCar ? 0.06 + ratio * 0.05 : 0, t, 0.1);
    },
    gunshot: function (far) {
      if (!ensure()) return;
      var s = ctx.createBufferSource(); s.buffer = noiseBuf(0.12);
      var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = far ? 900 : 2800;
      var g = ctx.createGain(); g.gain.setValueAtTime(far ? 0.12 : 0.4, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      s.connect(f); f.connect(g); g.connect(master); s.start();
      blip(160, 0.08, 'square', 0.15, 50);
    },
    crash: function () {
      if (!ensure()) return;
      var s = ctx.createBufferSource(); s.buffer = noiseBuf(0.3);
      var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 600;
      var g = ctx.createGain(); g.gain.value = 0.35;
      s.connect(f); f.connect(g); g.connect(master); s.start();
    },
    pickup: function () { blip(880, 0.12, 'sine', 0.22); setTimeout(function () { blip(1320, 0.18, 'sine', 0.2); }, 90); },
    missionStart: function () { blip(440, 0.15, 'triangle', 0.25); setTimeout(function () { blip(660, 0.2, 'triangle', 0.25); }, 120); },
    missionDone: function () { [523, 659, 784, 1046].forEach(function (f, i) { setTimeout(function () { blip(f, 0.22, 'triangle', 0.22); }, i * 110); }); },
    jump: function () { blip(300, 0.15, 'sine', 0.12, 520); },
    siren: function () {
      if (!ensure()) return;
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'square'; g.gain.value = 0.05;
      o.connect(g); g.connect(master); o.start();
      var hi = false;
      var iv = setInterval(function () { o.frequency.value = hi ? 950 : 700; hi = !hi; }, 450);
      setTimeout(function () { clearInterval(iv); try { o.stop(); } catch (e) {} }, 4000);
    },
    nextStation: function () {
      station = (station + 1) % stations.length;
      toast('Radio: ' + stations[station]);
      if (radioOn) this.startRadio();
    },
    startRadio: function () {
      if (!ensure()) return;
      radioOn = true;
      if (radioTimer) clearInterval(radioTimer);
      // procedural loops: a bassline + hats, tempo/feel per station
      var roots = [55, 49, 61.7]; // A1, G1, B1
      var root = roots[station], step = 0, bpm = [96, 122, 80][station];
      var self = this;
      radioTimer = setInterval(function () {
        if (!ctx || G.paused || !G.started) return;
        var beat = step % 8;
        if (beat === 0 || beat === 4) blip(root * 2, 0.22, 'triangle', 0.16);
        if (beat === 2 || beat === 6) blip(root * 3, 0.14, 'triangle', 0.1);
        if (step % 2 === 0) blip(6000, 0.03, 'square', 0.02);
        if (station === 1 && beat === 7) blip(root * 4, 0.1, 'sawtooth', 0.08);
        if (station === 2 && beat === 3) blip(root * 1.5, 0.3, 'sine', 0.12);
        step++;
      }, 60000 / bpm / 2);
    },
    stopRadio: function () { radioOn = false; if (radioTimer) clearInterval(radioTimer); },
  };
})();
