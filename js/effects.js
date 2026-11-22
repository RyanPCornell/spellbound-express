// ============================================================================
//  SPELLBOUND EXPRESS — CASTLE CELEBRATIONS
//  When the train reaches the castle the sky turns to a twilight palette and
//  three effects play together: fireworks (sphere, ring, heart or star
//  bursts), confetti, a rainbow, sky lanterns, balloons, a sparkle spiral up
//  the keep, a tower light show, shooting stars, an aurora, or a star shower.
//  The combination, colours and sky are different every time.
// ============================================================================
window.FX = (function () {
  var T = THREE;
  var running = [];
  var SKIES = [
    { name: "Purple Dusk", skyTop: "#160f3a", skyHorizon: "#7a3f9a", skyBottom: "#3a1f55", fog: "#3a2a5e", stars: 1, light: 0.35 },
    { name: "Rose Gold", skyTop: "#2a1840", skyHorizon: "#ff8a7a", skyBottom: "#ffc48a", fog: "#a8607a", stars: 0.7, light: 0.5 },
    { name: "Midnight Blue", skyTop: "#050a24", skyHorizon: "#1f3f8a", skyBottom: "#10204a", fog: "#16285a", stars: 1, light: 0.28 },
    { name: "Northern Teal", skyTop: "#061a24", skyHorizon: "#1f7a7a", skyBottom: "#0f3a44", fog: "#16404a", stars: 1, light: 0.3 },
    { name: "Ember Sunset", skyTop: "#2a1030", skyHorizon: "#ff7a3a", skyBottom: "#ffb35a", fog: "#9a4a3a", stars: 0.6, light: 0.5 },
  ];
  var PALETTES = [
    ["#ff4f8a", "#ffd23f", "#4fd8ff"], ["#a35cff", "#ff7cc3", "#ffffff"], ["#46ff9a", "#3fb8ff", "#ffe37a"],
    ["#ff8a3d", "#ffef7a", "#ff4f4f"], ["#7f8cff", "#ff9de0", "#9fffe0"], ["#ffcf33", "#ffffff", "#ff6fb5"],
  ];
  var EFFECTS = ["fireworks", "confetti", "rainbow", "lanterns", "balloons", "spiral", "towerlights", "shootingstars", "aurora", "starshower"];
  var BIG = ["fireworks", "rainbow", "aurora", "lanterns", "balloons"];

  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  // choose a combination not used in the last few celebrations
  function choose(history) {
    history = history || [];
    for (var tries = 0; tries < 60; tries++) {
      var big = pick(BIG), rest = shuffle(EFFECTS.filter(function (e) { return e !== big; })).slice(0, 2);
      var combo = [big].concat(rest), key = combo.slice().sort().join("+");
      if (history.indexOf(key) === -1) return { combo: combo, key: key };
    }
    var c = shuffle(EFFECTS).slice(0, 3); return { combo: c, key: c.slice().sort().join("+") };
  }

  function celebrate(history) {
    stop();
    var lv = WORLD.level, scene = WORLD.scene, C = lv.castlePos.clone(), F = lv.castleFwd.clone();
    var choice = choose(history), palette = pick(PALETTES), skyP = pick(SKIES);
    WORLD.setSky(skyP, 2.2);
    choice.combo.forEach(function (name) { running.push(MAKERS[name]({ scene: scene, C: C, F: F, pal: palette, castle: lv.castle })); });
    var hook = function (t, dt) {
      running = running.filter(function (r) { var alive = r.update(t, dt); if (!alive) r.dispose(); return alive; });
    };
    WORLD.addHook(hook);
    running.hook = hook;
    return { key: choice.key, combo: choice.combo, sky: skyP.name };
  }
  function stop() {
    running.forEach(function (r) { r.dispose(); });
    if (running.hook) WORLD.removeHook(running.hook);
    running = [];
  }

  // ---------------------------------------------------------------- particles
  function particleSystem(scene, n, size) {
    var g = new T.BufferGeometry(), pos = new Float32Array(n * 3), colA = new Float32Array(n * 3);
    g.setAttribute("position", new T.BufferAttribute(pos, 3)); g.setAttribute("color", new T.BufferAttribute(colA, 3));
    var m = new T.PointsMaterial({ size: size || 1.6, map: WORLD.dotTex, vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending });
    var pts = new T.Points(g, m); pts.frustumCulled = false; scene.add(pts);
    var P = { pts: pts, n: n, pos: pos, col: colA, vel: new Float32Array(n * 3), life: new Float32Array(n), max: new Float32Array(n), base: new Float32Array(n * 3), next: 0 };
    P.spawn = function (x, y, z, vx, vy, vz, c, life) {
      var i = P.next; P.next = (P.next + 1) % n;
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      P.vel[i * 3] = vx; P.vel[i * 3 + 1] = vy; P.vel[i * 3 + 2] = vz;
      P.base[i * 3] = c.r; P.base[i * 3 + 1] = c.g; P.base[i * 3 + 2] = c.b;
      P.life[i] = P.max[i] = life;
    };
    P.step = function (dt, grav, drag) {
      for (var i = 0; i < n; i++) {
        if (P.life[i] <= 0) { colA[i * 3] = colA[i * 3 + 1] = colA[i * 3 + 2] = 0; continue; }
        P.life[i] -= dt;
        var k = Math.max(0, P.life[i] / P.max[i]);
        P.vel[i * 3 + 1] -= (grav || 0) * dt;
        var dr = 1 - (drag || 0) * dt;
        P.vel[i * 3] *= dr; P.vel[i * 3 + 1] *= dr; P.vel[i * 3 + 2] *= dr;
        pos[i * 3] += P.vel[i * 3] * dt; pos[i * 3 + 1] += P.vel[i * 3 + 1] * dt; pos[i * 3 + 2] += P.vel[i * 3 + 2] * dt;
        var fl = k > 0.3 ? 1 : k / 0.3 * (0.6 + Math.random() * 0.4);
        colA[i * 3] = P.base[i * 3] * fl; colA[i * 3 + 1] = P.base[i * 3 + 1] * fl; colA[i * 3 + 2] = P.base[i * 3 + 2] * fl;
      }
      g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true;
    };
    P.dispose = function () { scene.remove(pts); g.dispose(); m.dispose(); };
    return P;
  }

  var MAKERS = {
    // ---- fireworks with different burst shapes
    fireworks: function (o) {
      var P = particleSystem(o.scene, 4200, 1.9), trails = particleSystem(o.scene, 900, 1.1), age = 0, nextLaunch = 0.2, rockets = [];
      var cols = o.pal.map(function (c) { return new T.Color(c); });
      function burst(x, y, z) {
        var shape = pick(["sphere", "sphere", "ring", "heart", "star", "double"]), c1 = pick(cols), c2 = pick(cols), n = 170, sp = 14 + Math.random() * 6;
        var side = new T.Vector3(o.F.z, 0, -o.F.x);
        for (var i = 0; i < n; i++) {
          var v = new T.Vector3(), a = i / n * Math.PI * 2;
          if (shape === "ring") v.set(Math.cos(a), Math.sin(a), 0).multiplyScalar(sp);
          else if (shape === "heart") { var hx = 16 * Math.pow(Math.sin(a), 3), hy = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a); v.set(hx, hy, 0).multiplyScalar(sp / 16); }
          else if (shape === "star") { var r = (i % 2 ? 0.45 : 1) * sp, aa = Math.floor(i / 2) / (n / 2) * Math.PI * 2; var k = (i % 34) / 34; v.set(Math.cos(a), Math.sin(a), 0).multiplyScalar(sp * (0.45 + 0.55 * Math.abs(Math.cos(a * 2.5)))); }
          else { var u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u); v.set(s * Math.cos(th), u, s * Math.sin(th)).multiplyScalar(sp * (shape === "double" && i % 2 ? 0.55 : 1)); }
          if (shape === "ring" || shape === "heart" || shape === "star") { var w = v.clone(); v.set(side.x * w.x, w.y, side.z * w.x); v.addScaledVector(o.F, (Math.random() - 0.5) * 2); }
          P.spawn(x, y, z, v.x, v.y, v.z, i % 3 ? c1 : c2, 1.6 + Math.random() * 0.8);
        }
        AUDIO.pop();
      }
      return {
        update: function (t, dt) {
          age += dt;
          if (age < 9 && age > nextLaunch) {
            nextLaunch = age + 0.28 + Math.random() * 0.45;
            var side = new T.Vector3(o.F.z, 0, -o.F.x);
            var start = o.C.clone().addScaledVector(side, (Math.random() - 0.5) * 70).addScaledVector(o.F, -10 + Math.random() * 20);
            rockets.push({ p: start, vy: 46 + Math.random() * 14, life: 1.1 + Math.random() * 0.5, c: pick(cols) });
          }
          rockets = rockets.filter(function (r) {
            r.life -= dt; r.p.y += r.vy * dt; r.vy -= 18 * dt;
            trails.spawn(r.p.x, r.p.y, r.p.z, (Math.random() - 0.5), -2, (Math.random() - 0.5), r.c, 0.5);
            if (r.life <= 0) { burst(r.p.x, r.p.y, r.p.z); return false; }
            return true;
          });
          P.step(dt, 7, 0.9); trails.step(dt, 0, 0);
          return age < 12.5;
        },
        dispose: function () { P.dispose(); trails.dispose(); },
      };
    },
    // ---- confetti raining over the castle and the train
    confetti: function (o) {
      var n = 700, g = new T.PlaneGeometry(0.55, 0.32), m = new T.MeshBasicMaterial({ side: T.DoubleSide });
      var im = new T.InstancedMesh(g, m, n), d = new T.Object3D(), c = new T.Color(), parts = [], age = 0;
      var cols = o.pal.concat(["#ffffff", "#46c486", "#ff8a3d"]);
      for (var i = 0; i < n; i++) {
        parts.push({ x: o.C.x + (Math.random() - 0.5) * 120, y: o.C.y + 50 + Math.random() * 80, z: o.C.z + (Math.random() - 0.5) * 120,
          vy: -(4 + Math.random() * 4), rx: Math.random() * 6, ry: Math.random() * 6, sx: Math.random() * 6 - 3, sy: Math.random() * 6 - 3, ph: Math.random() * 6 });
        im.setColorAt(i, c.set(cols[i % cols.length]));
      }
      im.frustumCulled = false; o.scene.add(im);
      return {
        update: function (t, dt) {
          age += dt;
          parts.forEach(function (p, i) {
            p.y += p.vy * dt; p.x += Math.sin(t * 2 + p.ph) * dt * 2; p.rx += p.sx * dt; p.ry += p.sy * dt;
            if (p.y < o.C.y - 6 && age < 8) p.y += 120;
            d.position.set(p.x, p.y, p.z); d.rotation.set(p.rx, p.ry, 0); d.updateMatrix(); im.setMatrixAt(i, d.matrix);
          });
          im.instanceMatrix.needsUpdate = true;
          return age < 14;
        },
        dispose: function () { o.scene.remove(im); g.dispose(); m.dispose(); },
      };
    },
    // ---- a rainbow arching over the castle
    rainbow: function (o) {
      var grp = new T.Group(), age = 0, cols = ["#ff3f4f", "#ff8a1f", "#ffd21f", "#3fdc5a", "#2fa7ff", "#5a5aff", "#a35cff"], mats = [];
      cols.forEach(function (c, i) {
        var m = new T.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, depthWrite: false });
        var tor = new T.Mesh(new T.TorusGeometry(70 - i * 2.4, 1.25, 8, 90, Math.PI), m);
        grp.add(tor); mats.push(m);
      });
      grp.position.copy(o.C).addScaledVector(o.F, 18); grp.position.y -= 6;
      grp.rotation.y = Math.atan2(o.F.z, -o.F.x) + Math.PI / 2;
      grp.rotation.y = Math.atan2(-o.F.x, -o.F.z);
      grp.scale.set(0.01, 0.01, 1);
      o.scene.add(grp);
      var sparkle = particleSystem(o.scene, 600, 1.4);
      return {
        update: function (t, dt) {
          age += dt;
          var k = Math.min(1, age / 2.5), e = 1 - Math.pow(1 - k, 3);
          grp.scale.set(e, e, 1);
          mats.forEach(function (m, i) { m.opacity = Math.min(0.85, age * 0.5) * (age > 11 ? Math.max(0, 1 - (age - 11) / 2) : 1); });
          if (age < 10 && Math.random() < 0.9) {
            var a = Math.random() * Math.PI, r = 62 + Math.random() * 8, side = new T.Vector3(o.F.z, 0, -o.F.x);
            var p = grp.position.clone().addScaledVector(side, Math.cos(a) * r * e); p.y += Math.sin(a) * r * e;
            sparkle.spawn(p.x, p.y, p.z, 0, -2, 0, new T.Color(pick(cols)), 1.5);
          }
          sparkle.step(dt, 0, 0);
          return age < 13;
        },
        dispose: function () { o.scene.remove(grp); grp.traverse(function (m) { if (m.geometry) m.geometry.dispose(); }); mats.forEach(function (m) { m.dispose(); }); sparkle.dispose(); },
      };
    },
    // ---- glowing sky lanterns drifting up
    lanterns: function (o) {
      var grp = new T.Group(), list = [], age = 0, bodyG = new T.CylinderGeometry(0.7, 0.55, 1.4, 10);
      for (var i = 0; i < 70; i++) {
        var c = pick(["#ffb347", "#ffd27a", "#ff9e7a", "#ffe9a8"]);
        var m = new T.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.3, transparent: true, opacity: 0.92 });
        var l = new T.Mesh(bodyG, m);
        var glow = new T.Sprite(new T.SpriteMaterial({ map: WORLD.dotTex, color: c, transparent: true, opacity: 0.7, depthWrite: false, blending: T.AdditiveBlending }));
        glow.scale.set(5, 5, 1); l.add(glow);
        l.position.set(o.C.x + (Math.random() - 0.5) * 140, o.C.y + 2 + Math.random() * 12, o.C.z + (Math.random() - 0.5) * 140);
        l.userData = { v: 3 + Math.random() * 3, ph: Math.random() * 6, delay: Math.random() * 4 };
        grp.add(l); list.push(l);
      }
      o.scene.add(grp);
      return {
        update: function (t, dt) {
          age += dt;
          list.forEach(function (l) {
            if (age < l.userData.delay) return;
            l.position.y += l.userData.v * dt; l.position.x += Math.sin(t * 0.8 + l.userData.ph) * dt * 1.5;
            l.rotation.y += dt * 0.5;
          });
          return age < 16;
        },
        dispose: function () { o.scene.remove(grp); bodyG.dispose(); list.forEach(function (l) { l.material.dispose(); }); },
      };
    },
    // ---- a big balloon release
    balloons: function (o) {
      var grp = new T.Group(), list = [], age = 0, bg = new T.SphereGeometry(1.4, 18, 14), sg = new T.CylinderGeometry(0.03, 0.03, 3, 4);
      var cols = o.pal.concat(["#ef4f66", "#46c486", "#ffcf33", "#35a6dd", "#a35ce0"]);
      for (var i = 0; i < 80; i++) {
        var b = new T.Group(), m = new T.MeshStandardMaterial({ color: pick(cols), roughness: 0.2, metalness: 0.1 });
        var ball = new T.Mesh(bg, m); ball.scale.set(1, 1.2, 1); b.add(ball);
        var str = new T.Mesh(sg, new T.MeshBasicMaterial({ color: "#ffffff" })); str.position.y = -3; b.add(str);
        b.position.set(o.C.x + (Math.random() - 0.5) * 90, o.C.y - 4 + Math.random() * 6, o.C.z + (Math.random() - 0.5) * 90);
        b.userData = { v: 5 + Math.random() * 5, ph: Math.random() * 6, delay: Math.random() * 2.5 };
        grp.add(b); list.push(b);
      }
      o.scene.add(grp);
      return {
        update: function (t, dt) {
          age += dt;
          list.forEach(function (b) {
            if (age < b.userData.delay) return;
            b.position.y += b.userData.v * dt; b.position.x += Math.sin(t * 1.2 + b.userData.ph) * dt * 2;
            b.rotation.z = Math.sin(t * 1.5 + b.userData.ph) * 0.2;
          });
          return age < 15;
        },
        dispose: function () { o.scene.remove(grp); bg.dispose(); sg.dispose(); list.forEach(function (b) { b.children.forEach(function (c) { c.material.dispose(); }); }); },
      };
    },
    // ---- a helix of sparkles winding up the keep
    spiral: function (o) {
      var P = particleSystem(o.scene, 2400, 1.5), age = 0, cols = o.pal.map(function (c) { return new T.Color(c); });
      return {
        update: function (t, dt) {
          age += dt;
          if (age < 10) for (var k = 0; k < 6; k++) {
            var a = t * 4 + k * Math.PI / 3, h = (t * 9 + k * 7) % 55, r = 18 - h * 0.18;
            P.spawn(o.C.x + Math.cos(a) * r, o.C.y + h, o.C.z + Math.sin(a) * r, 0, 1.5, 0, cols[k % cols.length], 2.2);
          }
          P.step(dt, -0.5, 0);
          return age < 13;
        },
        dispose: function () { P.dispose(); },
      };
    },
    // ---- the castle's roofs and windows flash through the colours
    towerlights: function (o) {
      var C = o.castle, age = 0, saved = C.roofs.map(function (r) { return { c: r.material.color.clone(), e: r.material.emissive.clone(), ei: r.material.emissiveIntensity }; });
      var rainbow = ["#ff3f4f", "#ff8a1f", "#ffd21f", "#3fdc5a", "#2fa7ff", "#a35cff"];
      return {
        update: function (t, dt) {
          age += dt;
          C.roofs.forEach(function (r, i) {
            var c = rainbow[Math.floor(t * 4 + i) % rainbow.length];
            r.material.emissive.set(c); r.material.emissiveIntensity = 0.5 + Math.sin(t * 8 + i) * 0.3;
          });
          C.orb.scale.setScalar(1 + Math.sin(t * 6) * 0.15 + Math.min(1, age) * 0.4);
          return age < 12;
        },
        dispose: function () {
          C.roofs.forEach(function (r, i) { r.material.color.copy(saved[i].c); r.material.emissive.copy(saved[i].e); r.material.emissiveIntensity = saved[i].ei; });
          C.orb.scale.setScalar(1);
        },
      };
    },
    // ---- shooting stars streaking across the sky
    shootingstars: function (o) {
      var P = particleSystem(o.scene, 2500, 1.8), heads = [], age = 0, next = 0;
      return {
        update: function (t, dt) {
          age += dt;
          if (age < 10 && age > next) {
            next = age + 0.35 + Math.random() * 0.6;
            var side = new T.Vector3(o.F.z, 0, -o.F.x), dir = Math.random() < 0.5 ? 1 : -1;
            var p = o.C.clone().addScaledVector(side, -dir * 90).addScaledVector(o.F, -30 - Math.random() * 60); p.y += 70 + Math.random() * 40;
            heads.push({ p: p, v: side.clone().multiplyScalar(dir * (70 + Math.random() * 30)).add(new T.Vector3(0, -18, 0)), life: 2.4 });
          }
          heads = heads.filter(function (h) {
            h.life -= dt;
            // fill the gap travelled this frame so the trail is a smooth streak at any frame rate
            var steps = Math.max(4, Math.ceil(h.v.length() * dt / 0.35));
            for (var k = 0; k < steps; k++) {
              h.p.addScaledVector(h.v, dt / steps);
              P.spawn(h.p.x, h.p.y, h.p.z, 0, 0, 0, new T.Color(k % 3 ? "#cfe8ff" : "#ffffff"), 0.6);
            }
            return h.life > 0;
          });
          P.step(dt, 0, 0);
          return age < 12;
        },
        dispose: function () { P.dispose(); },
      };
    },
    // ---- ribbons of aurora light behind the castle
    aurora: function (o) {
      var grp = new T.Group(), age = 0, ribbons = [];
      var cols = [["#3fff9f", "#3fb8ff"], ["#a35cff", "#ff6fd8"], ["#3fffe0", "#7f8cff"]];
      for (var i = 0; i < 3; i++) {
        var g = new T.PlaneGeometry(260, 46, 80, 1), pos = g.attributes.position, colors = [], c1 = new T.Color(cols[i][0]), c2 = new T.Color(cols[i][1]), c = new T.Color();
        for (var k = 0; k < pos.count; k++) { var top = pos.getY(k) > 0; c.copy(top ? c2 : c1).multiplyScalar(top ? 0.0 : 1); colors.push(c.r, c.g, c.b); }
        g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
        var m = new T.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending });
        var r = new T.Mesh(g, m);
        r.position.copy(o.C).addScaledVector(o.F, 90 + i * 25); r.position.y += 70 + i * 12;    // behind the castle
        r.rotation.y = Math.atan2(-o.F.x, -o.F.z);
        grp.add(r); ribbons.push({ r: r, base: g.attributes.position.array.slice(), ph: i * 2 });
      }
      o.scene.add(grp);
      return {
        update: function (t, dt) {
          age += dt;
          ribbons.forEach(function (rb) {
            var p = rb.r.geometry.attributes.position;
            for (var k = 0; k < p.count; k++) { var x = rb.base[k * 3]; p.setZ(k, Math.sin(x * 0.025 + t * 0.8 + rb.ph) * 18); p.setY(k, rb.base[k * 3 + 1] + Math.sin(x * 0.04 + t * 1.3 + rb.ph) * 6); }
            p.needsUpdate = true;
            rb.r.material.opacity = Math.min(0.75, age * 0.3) * (age > 12 ? Math.max(0, 1 - (age - 12) / 2) : 1);
          });
          return age < 14;
        },
        dispose: function () { o.scene.remove(grp); ribbons.forEach(function (rb) { rb.r.geometry.dispose(); rb.r.material.dispose(); }); },
      };
    },
    // ---- golden stars tumbling down
    starshower: function (o) {
      var sh = new T.Shape();
      for (var i = 0; i < 10; i++) { var a = i / 10 * Math.PI * 2, r = i % 2 ? 0.45 : 1; if (i === 0) sh.moveTo(Math.sin(a) * r, Math.cos(a) * r); else sh.lineTo(Math.sin(a) * r, Math.cos(a) * r); }
      var g = new T.ExtrudeGeometry(sh, { depth: 0.25, bevelEnabled: false });
      var n = 160, m = new T.MeshStandardMaterial({ color: "#ffd23f", emissive: "#ffb000", emissiveIntensity: 0.8, metalness: 0.6, roughness: 0.3 });
      var im = new T.InstancedMesh(g, m, n), d = new T.Object3D(), list = [], age = 0, c = new T.Color();
      for (var k = 0; k < n; k++) {
        list.push({ x: o.C.x + (Math.random() - 0.5) * 100, y: o.C.y + 60 + Math.random() * 60, z: o.C.z + (Math.random() - 0.5) * 100, v: 6 + Math.random() * 6, s: 0.6 + Math.random() * 1.2, ph: Math.random() * 6 });
        im.setColorAt(k, c.set(pick(o.pal.concat(["#ffd23f", "#ffffff"]))));
      }
      im.frustumCulled = false; o.scene.add(im);
      return {
        update: function (t, dt) {
          age += dt;
          list.forEach(function (p, i) {
            p.y -= p.v * dt; if (p.y < o.C.y - 5 && age < 9) p.y += 120;
            d.position.set(p.x, p.y, p.z); d.rotation.set(t + p.ph, t * 1.3 + p.ph, 0); d.scale.setScalar(p.s); d.updateMatrix(); im.setMatrixAt(i, d.matrix);
          });
          im.instanceMatrix.needsUpdate = true;
          return age < 13;
        },
        dispose: function () { o.scene.remove(im); g.dispose(); m.dispose(); },
      };
    },
  };

  return { celebrate: celebrate, stop: stop, EFFECTS: EFFECTS, NAMES: {
    fireworks: "Fireworks", confetti: "Confetti", rainbow: "Rainbow", lanterns: "Sky lanterns", balloons: "Balloons",
    spiral: "Sparkle spiral", towerlights: "Tower light show", shootingstars: "Shooting stars", aurora: "Aurora", starshower: "Star shower" } };
})();
