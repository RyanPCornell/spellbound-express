// ============================================================================
//  SPELLBOUND EXPRESS — SOUND
//  Everything is synthesised with Web Audio (no sound files): the train's
//  chuff-chuff, its whistle, brakes, right/wrong chimes, and a fanfare that is
//  different every time the castle is reached.
// ============================================================================
window.AUDIO = (function () {
  var ctx = null, master = null, on = true, chuffPhase = 0, speed = 0, noiseBuf = null;
  function ensure() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
        var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      } catch (e) { ctx = null; }
    }
    if (ctx && ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  // iPads only allow sound after a tap: wake the audio on the first one
  function unlock() { ensure(); }
  window.addEventListener("pointerdown", unlock, { once: false, passive: true });

  function tone(freq, start, dur, o) {
    if (!on || !ensure()) return;
    o = o || {};
    var t0 = ctx.currentTime + (start || 0), osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || "triangle"; osc.frequency.setValueAtTime(freq, t0);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t0 + dur);
    var v = o.vol || 0.18;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + (o.attack || 0.015));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(o.dest || master); osc.start(t0); osc.stop(t0 + dur + 0.05);
  }
  function noise(start, dur, o) {
    if (!on || !ensure()) return;
    o = o || {};
    var t0 = ctx.currentTime + (start || 0), src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf; src.loop = true;
    f.type = o.filter || "bandpass"; f.frequency.setValueAtTime(o.freq || 800, t0); f.Q.value = o.q || 0.8;
    if (o.sweep) f.frequency.exponentialRampToValueAtTime(o.sweep, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(o.vol || 0.2, t0 + (o.attack || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(master); src.start(t0); src.stop(t0 + dur + 0.05);
  }

  // called every frame by the game with the train's speed
  function tick(dt, v) {
    speed = v;
    if (!on || !ctx || v < 0.3) return;
    chuffPhase += dt * (0.9 + v * 0.42);
    if (chuffPhase >= 1) {
      chuffPhase -= 1;
      var vol = Math.min(0.16, 0.05 + v * 0.008);
      noise(0, 0.13, { freq: 520, q: 0.7, vol: vol, sweep: 300 });
    }
  }
  function whistle() {
    tone(784, 0, 0.55, { type: "sine", vol: 0.12, attack: 0.05 }); tone(988, 0, 0.55, { type: "sine", vol: 0.1, attack: 0.05 });
    tone(784, 0.6, 0.85, { type: "sine", vol: 0.12, attack: 0.05 }); tone(988, 0.6, 0.85, { type: "sine", vol: 0.1, attack: 0.05 });
    noise(0, 1.4, { freq: 2400, q: 2, vol: 0.03 });
  }
  function brake() { noise(0, 1.1, { freq: 3200, q: 1.5, vol: 0.05, sweep: 1200, attack: 0.1 }); }
  function ding() { tone(880, 0, 0.12, { vol: 0.16 }); tone(1320, 0.09, 0.3, { vol: 0.14 }); tone(1760, 0.18, 0.4, { type: "sine", vol: 0.08 }); }
  function wrong() { tone(330, 0, 0.18, { type: "square", vol: 0.06 }); tone(262, 0.16, 0.32, { type: "square", vol: 0.06 }); }
  function click() { tone(1400, 0, 0.05, { type: "sine", vol: 0.06 }); }
  function sparkle() { for (var i = 0; i < 6; i++) tone(1200 + i * 220 + Math.random() * 120, i * 0.05, 0.25, { type: "sine", vol: 0.05 }); }
  function pop() { noise(0, 0.25, { freq: 1500, q: 0.5, vol: 0.12 }); noise(0.04, 0.7, { freq: 4000, q: 0.6, vol: 0.03 }); }

  // a different fanfare each time: random key, rhythm and one of six melodies
  var MELODIES = [
    [0, 4, 7, 12, 7, 12, 16, 19],
    [0, 2, 4, 7, 9, 12, 16, 12, 19],
    [7, 0, 4, 7, 12, 11, 12, 16, 24],
    [0, 7, 4, 12, 9, 16, 14, 19],
    [12, 7, 4, 0, 4, 7, 12, 16, 19, 24],
    [0, 4, 7, 4, 9, 12, 9, 16, 19],
  ];
  function fanfare(seed) {
    if (!on || !ensure()) return;
    var m = MELODIES[(seed || Math.floor(Math.random() * 99)) % MELODIES.length];
    var base = 262 * Math.pow(2, (Math.floor(Math.random() * 7) - 2) / 12), step = 0.15 + Math.random() * 0.05;
    m.forEach(function (n, i) {
      var f = base * Math.pow(2, n / 12), last = i === m.length - 1;
      tone(f, i * step, last ? 1.6 : step * 1.6, { type: "triangle", vol: 0.16 });
      tone(f * 2, i * step, last ? 1.4 : step * 1.2, { type: "sine", vol: 0.05 });
    });
    var end = m.length * step;
    [0, 4, 7, 12].forEach(function (n) { tone(base * Math.pow(2, n / 12), end, 2.2, { type: "sine", vol: 0.07, attack: 0.08 }); });
  }

  return { unlock: unlock, tick: tick, whistle: whistle, brake: brake, ding: ding, wrong: wrong, click: click, sparkle: sparkle, pop: pop, fanfare: fanfare,
    set: function (v) { on = !!v; }, get on() { return on; } };
})();
