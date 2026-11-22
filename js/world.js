// ============================================================================
//  SPELLBOUND EXPRESS — THE 3D WORLD
//  A new valley is generated for every level: rolling low-poly hills, a river
//  with a stone bridge, forests, far mountains, a winding railway with a
//  word-gate at every stop, and a castle on a hill at the end. Four themes
//  rotate by level (Blossom Meadow, Golden Autumn, Snowy Peaks, Candy Sunset).
//  Everything is built from code (no model files) with Three.js r128.
// ============================================================================
window.WORLD = (function () {
  var T = THREE;
  var renderer, scene, camera, clock, pmrem;
  var sky, stars, sun, hemi, sunTarget;
  var level = null;              // everything that belongs to the current valley
  var train = null, avatarSeat = null, avatar = null;
  var frameHooks = [];
  var camMode = "title", camPos = new T.Vector3(0, 60, 120), camLook = new T.Vector3();
  var listeners = {};

  // ------------------------------------------------------------- utilities
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function noiseFn(seed) {
    function h(x, z) { var n = Math.sin(x * 127.1 + z * 311.7 + seed * 74.7) * 43758.5453; return n - Math.floor(n); }
    function sm(t) { return t * t * (3 - 2 * t); }
    function v(x, z) {
      var ix = Math.floor(x), iz = Math.floor(z), fx = sm(x - ix), fz = sm(z - iz);
      var a = h(ix, iz), b = h(ix + 1, iz), c = h(ix, iz + 1), d = h(ix + 1, iz + 1);
      return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
    }
    return function (x, z, oct) {
      var s = 0, amp = 1, f = 1, norm = 0;
      for (var i = 0; i < (oct || 4); i++) { s += v(x * f, z * f) * amp; norm += amp; amp *= 0.5; f *= 2.03; }
      return s / norm;
    };
  }
  function smooth(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function col(c) { return new T.Color(c); }
  function std(color, o) {
    o = o || {};
    return new T.MeshStandardMaterial({ color: color, roughness: o.r != null ? o.r : 0.6, metalness: o.m || 0,
      emissive: o.e || "#000000", emissiveIntensity: o.ei != null ? o.ei : 1, flatShading: !!o.flat,
      transparent: !!o.op, opacity: o.op || 1, side: o.ds ? T.DoubleSide : T.FrontSide, vertexColors: !!o.vc });
  }
  function mesh(g, m, x, y, z, shadow) {
    var o = new T.Mesh(g, m); o.position.set(x || 0, y || 0, z || 0);
    if (shadow !== false) { o.castShadow = true; o.receiveShadow = true; }
    return o;
  }
  function put(g, o) { g.add(o); return o; }
  function textTexture(text, o) {
    o = o || {};
    var c = document.createElement("canvas"), w = o.w || 512, h = o.h || 128; c.width = w; c.height = h;
    var x = c.getContext("2d");
    if (o.bg) { x.fillStyle = o.bg; x.fillRect(0, 0, w, h); }
    x.fillStyle = o.color || "#3a2b28";
    x.font = (o.weight || 800) + " " + (o.size || 64) + "px Fredoka, 'Trebuchet MS', sans-serif";
    x.textAlign = "center"; x.textBaseline = "middle";
    x.fillText(text, w / 2, h / 2 + 4);
    var t = new T.CanvasTexture(c); t.anisotropy = 4; t.encoding = T.sRGBEncoding; return t;
  }
  var dotTex = (function () {
    var c = document.createElement("canvas"); c.width = c.height = 64;
    var x = c.getContext("2d"), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.35, "rgba(255,255,255,.8)"); g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return new T.CanvasTexture(c);
  })();

  // ---------------------------------------------------------------- themes
  var THEMES = [
    { id: "meadow", name: "Blossom Meadow", skyTop: "#3f8ff0", skyHorizon: "#bfe5ff", skyBottom: "#eaf7ff", fog: "#cde9ff",
      sunColor: "#fff1d0", sunDir: [0.5, 0.8, 0.35], hemiSky: "#d6ecff", hemiGround: "#6d9a4e",
      grass: ["#79cc55", "#5db446", "#93d665", "#6ec24f"], high: "#8fbe68", rock: "#a39e8e", peak: "#ffffff",
      tree: "round", leaves: ["#4cae4c", "#5fc35a", "#ffb7d5", "#ff9ec7", "#3f9b46"], trunk: "#7a5134",
      deco: "flowers", accent: "#ff7cc3", water: "#45ade6", particles: "butterflies" },
    { id: "autumn", name: "Golden Autumn", skyTop: "#4c84d4", skyHorizon: "#ffe0b5", skyBottom: "#fff1dc", fog: "#f7dcb8",
      sunColor: "#ffe2b0", sunDir: [-0.5, 0.6, 0.4], hemiSky: "#ffe8cc", hemiGround: "#8a6a3a",
      grass: ["#b9b64c", "#c9a33e", "#a3a845", "#d0b44f"], high: "#a08a4a", rock: "#9c8d78", peak: "#f4efe6",
      tree: "round", leaves: ["#e8743a", "#f2a93b", "#d94e3a", "#f6c445", "#c96a2c"], trunk: "#6b4428",
      deco: "pumpkins", accent: "#ff8a3d", water: "#3f9fd0", particles: "leaves" },
    { id: "winter", name: "Snowy Peaks", skyTop: "#6a9ad8", skyHorizon: "#e6f1ff", skyBottom: "#f4f9ff", fog: "#e3eefb",
      sunColor: "#ffffff", sunDir: [0.3, 0.55, -0.5], hemiSky: "#eaf3ff", hemiGround: "#9fb4cc",
      grass: ["#f6f9ff", "#e8f0fa", "#dfe9f6", "#f0f5fc"], high: "#e8eef8", rock: "#8b97a8", peak: "#ffffff",
      tree: "pine", leaves: ["#2f6b4f", "#3a7d5a", "#2b5f48"], trunk: "#5a3d2b",
      deco: "snowmen", accent: "#5fb7ff", water: "#a9dcf5", particles: "snow" },
    { id: "sunset", name: "Candy Sunset", skyTop: "#3f2f86", skyHorizon: "#ff9f7c", skyBottom: "#ffd08a", fog: "#f0a58f",
      sunColor: "#ffc08a", sunDir: [-0.2, 0.28, -0.9], hemiSky: "#ffc8b4", hemiGround: "#7a5a9a",
      grass: ["#86cf98", "#a5dba5", "#76c592", "#b7e3a8"], high: "#c6a6e0", rock: "#b49cc9", peak: "#fff0fa",
      tree: "round", leaves: ["#ff8fc7", "#b48cff", "#7fd6ff", "#ffd27a", "#ff9e7a"], trunk: "#8a5a7a",
      deco: "candy", accent: "#b48cff", water: "#7fa8ff", particles: "fireflies" },
  ];
  var CASTLE_PALETTES = [
    { roofs: ["#ff6fb5", "#8a6cff", "#47c6ff", "#ffcf33"], wall: "#f6ecdf", trim: "#ffd86b", glow: "#ff9de0" },
    { roofs: ["#ef4f66", "#ffcf33", "#46c486", "#35a6dd"], wall: "#f3eadb", trim: "#ffcf33", glow: "#ffe27a" },
    { roofs: ["#a35ce0", "#ff8a3d", "#6fd8c8", "#ff7cc3"], wall: "#efe6ff", trim: "#ffe37a", glow: "#c9a3ff" },
    { roofs: ["#2f6fdd", "#59b7ff", "#ffcf33", "#ffffff"], wall: "#eef3fb", trim: "#ffd23f", glow: "#9fd8ff" },
    { roofs: ["#3fc9a0", "#ff7cc3", "#ffd23f", "#7f8cff"], wall: "#f2f6ec", trim: "#ffd86b", glow: "#9fffe0" },
  ];

  // ------------------------------------------------------------------ init
  function init(canvas) {
    renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.outputEncoding = T.sRGBEncoding;           // colours are converted to linear on input (color.js)
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    scene = new T.Scene();
    camera = new T.PerspectiveCamera(55, 1, 0.5, 3000);
    clock = new T.Clock();
    pmrem = new T.PMREMGenerator(renderer);

    hemi = new T.HemisphereLight("#d6ecff", "#6d9a4e", 0.75); scene.add(hemi);
    sun = new T.DirectionalLight("#fff1d0", 1.0);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    var sc = sun.shadow.camera; sc.left = sc.bottom = -55; sc.right = sc.top = 55; sc.near = 1; sc.far = 400;
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.6;
    sunTarget = new T.Object3D(); scene.add(sunTarget); sun.target = sunTarget;
    scene.add(sun);
    scene.add(new T.AmbientLight("#ffffff", 0.12));

    // sky dome with a gradient + stars that fade in at twilight
    sky = new T.Mesh(new T.SphereGeometry(1400, 32, 16), new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: col("#3f8ff0") }, horizon: { value: col("#bfe5ff") }, bottom: { value: col("#eaf7ff") } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: "uniform vec3 top; uniform vec3 horizon; uniform vec3 bottom; varying vec3 vP;" +
        "void main(){ float y = vP.y; vec3 c = y > 0.0 ? mix(horizon, top, pow(min(1.0, y * 1.6), 0.75)) : mix(horizon, bottom, min(1.0, -y * 4.0));" +
        " gl_FragColor = linearToOutputTexel(vec4(c, 1.0)); }",
    }));
    sky.renderOrder = -10; scene.add(sky);
    var sg = new T.BufferGeometry(), sp = [];
    for (var i = 0; i < 1400; i++) {
      var th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 0.95);
      sp.push(Math.sin(ph) * Math.cos(th) * 1300, Math.cos(ph) * 1300, Math.sin(ph) * Math.sin(th) * 1300);
    }
    sg.setAttribute("position", new T.Float32BufferAttribute(sp, 3));
    stars = new T.Points(sg, new T.PointsMaterial({ size: 3.2, map: dotTex, transparent: true, opacity: 0, depthWrite: false, fog: false, sizeAttenuation: false }));
    scene.add(stars);

    window.addEventListener("resize", resize);
    resize();
    renderer.setAnimationLoop(frame);
  }
  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.9 ? 68 : 55;     // portrait iPads see a bit more
    camera.updateProjectionMatrix();
  }

  // sky colours (can blend to a twilight palette during celebrations)
  var skyState = { from: null, to: null, t: 1, dur: 1 };
  function setSky(p, dur) {
    var u = sky.material.uniforms;
    var cur = { top: u.top.value.clone(), horizon: u.horizon.value.clone(), bottom: u.bottom.value.clone(), fog: scene.fog ? scene.fog.color.clone() : col(p.fog), stars: stars.material.opacity, light: sun.intensity };
    skyState = { from: cur, to: { top: col(p.skyTop), horizon: col(p.skyHorizon), bottom: col(p.skyBottom), fog: col(p.fog), stars: p.stars || 0, light: p.light != null ? p.light : 1 }, t: 0, dur: dur || 0.0001 };
  }
  function stepSky(dt) {
    if (skyState.t >= 1 || !skyState.to) return;
    skyState.t = Math.min(1, skyState.t + dt / skyState.dur);
    var k = smooth(0, 1, skyState.t), a = skyState.from, b = skyState.to, u = sky.material.uniforms;
    u.top.value.copy(a.top).lerp(b.top, k); u.horizon.value.copy(a.horizon).lerp(b.horizon, k); u.bottom.value.copy(a.bottom).lerp(b.bottom, k);
    if (scene.fog) scene.fog.color.copy(a.fog).lerp(b.fog, k);
    stars.material.opacity = a.stars + (b.stars - a.stars) * k;
    sun.intensity = a.light + (b.light - a.light) * k;
    hemi.intensity = 0.75 * (0.12 + 0.88 * sun.intensity);
    if (level && level.castle) level.castle.light.intensity = Math.max(0, 1 - sun.intensity) * 2.4;
  }
  function environment(theme) {
    // a soft environment map from the sky colours (an equirectangular
    // gradient image): gives metals and glossy paint something to reflect
    var c = document.createElement("canvas"); c.width = 64; c.height = 32;
    var x = c.getContext("2d"), g = x.createLinearGradient(0, 0, 0, 32);
    g.addColorStop(0, theme.skyTop); g.addColorStop(0.48, theme.skyHorizon); g.addColorStop(0.52, theme.hemiGround); g.addColorStop(1, theme.hemiGround);
    x.fillStyle = g; x.fillRect(0, 0, 64, 32);
    var tex = new T.CanvasTexture(c); tex.encoding = T.sRGBEncoding; tex.mapping = T.EquirectangularReflectionMapping;
    var env = pmrem.fromEquirectangular(tex).texture;
    tex.dispose();
    if (scene.environment) scene.environment.dispose();
    scene.environment = env;
  }

  // ============================================================ BUILD LEVEL
  function buildLevel(levelNum, nStops, seed) {
    clearLevel();
    var theme = THEMES[(levelNum - 1) % THEMES.length];
    var R = rng(seed || (levelNum * 9973 + 17)), noise = noiseFn(R() * 1000);
    var L = (nStops + 1) * 46 + 90;              // track length grows with the number of words
    level = { theme: theme, root: new T.Group(), R: R, noise: noise, stops: [], anims: [], particles: [], num: levelNum,
      palette: CASTLE_PALETTES[Math.floor(R() * CASTLE_PALETTES.length)] };
    scene.add(level.root);
    scene.fog = new T.Fog(theme.fog, 160, 900);
    setSky({ skyTop: theme.skyTop, skyHorizon: theme.skyHorizon, skyBottom: theme.skyBottom, fog: theme.fog, stars: 0, light: 1 });
    sun.color.set(theme.sunColor); hemi.color.set(theme.hemiSky); hemi.groundColor.set(theme.hemiGround);
    environment(theme);

    // ---- the railway line
    var n = Math.ceil(L / 42) + 1, pts = [], ph1 = R() * 6, ph2 = R() * 6, amp = 26 + R() * 18;
    for (var i = 0; i < n; i++) {
      var z = -i * 42, k = smooth(0, 2.5, i);
      var x = k * (Math.sin(i * 0.62 + ph1) * amp + Math.sin(i * 0.27 + ph2) * amp * 0.8);
      var y = k * (Math.sin(i * 0.45 + ph2) * 2.6 + i * 0.12);
      pts.push(new T.Vector3(x, y, z));
    }
    var curve = new T.CatmullRomCurve3(pts, false, "centripetal");
    level.curve = curve; level.L = curve.getLength();
    var S = 420, samples = [];
    for (i = 0; i <= S; i++) {
      var u = i / S, p = curve.getPointAt(u), t = curve.getTangentAt(u);
      var nrm = new T.Vector3(t.z, 0, -t.x).normalize();      // left-right across the track
      samples.push({ u: u, p: p, t: t, n: nrm });
    }
    level.samples = samples;

    // river crosses roughly 40% of the way along, between two stops
    var ri = Math.round(S * 0.42), rs = samples[ri];
    level.river = { c: rs.p.clone(), dir: new T.Vector3(rs.n.x, 0, rs.n.z), nrm: new T.Vector3(rs.t.x, 0, rs.t.z).normalize(), y: rs.p.y - 4.2 };
    // castle on a hill beyond the end of the line
    var end = samples[S], fwd = new T.Vector3(end.t.x, 0, end.t.z).normalize();
    level.castlePos = end.p.clone().add(fwd.clone().multiplyScalar(46)); level.castlePos.y = end.p.y + 2.5;
    level.castleFwd = fwd;

    buildTerrain();
    buildWater();
    buildTrack();
    buildBridge();
    buildStation(samples[4], "Spellbound Station");
    buildScenery();
    buildMountains();
    buildClouds();
    buildCastle();
    buildParticles();
    placeStops(nStops);
    if (!train) buildTrain();
    train.s = 14; train.v = 0; train.target = 14; train.moving = false; train.dir = 1;
    placeTrain(0);
    return { L: level.L, theme: theme };
  }
  function clearLevel() {
    if (!level) return;
    scene.remove(level.root);
    level.root.traverse(function (o) {
      if (o.geometry) o.geometry.dispose();
      if (o.material) [].concat(o.material).forEach(function (m) { if (m.map) m.map.dispose(); m.dispose(); });
    });
    level = null;
  }

  // nearest point on the track to (x, z): {d, y, i}
  function nearTrack(x, z) {
    var s = level.samples, best = 1e18, bi = 0;
    for (var i = 0; i < s.length; i += 2) { var dx = s[i].p.x - x, dz = s[i].p.z - z, d = dx * dx + dz * dz; if (d < best) { best = d; bi = i; } }
    for (var j = Math.max(0, bi - 2); j <= Math.min(s.length - 1, bi + 2); j++) { var ex = s[j].p.x - x, ez = s[j].p.z - z, e = ex * ex + ez * ez; if (e < best) { best = e; bi = j; } }
    return { d: Math.sqrt(best), y: s[bi].p.y, i: bi };
  }
  function riverDist(x, z) {
    var r = level.river, dx = x - r.c.x, dz = z - r.c.z;
    var along = dx * r.dir.x + dz * r.dir.z, across = dx * r.nrm.x + dz * r.nrm.z;
    return Math.abs(across - Math.sin(along * 0.03) * 12);
  }
  // terrain height at (x, z): hills, valley walls, track bed, river, castle hill
  function heightAt(x, z, near) {
    var nz = level.noise, nt = near || nearTrack(x, z);
    var hills = (nz(x * 0.011, z * 0.011) - 0.45) * 26 + (nz(x * 0.05, z * 0.05) - 0.5) * 3.2;
    var walls = smooth(28, 170, nt.d) * (18 + nz(x * 0.006 + 5, z * 0.006) * 70);
    var h = nt.y - 2 + hills * smooth(6, 40, nt.d) + walls;
    h = h + (nt.y - 0.45 - h) * (1 - smooth(4.5, 15, nt.d));             // flat bed for the rails
    var cd = Math.hypot(x - level.castlePos.x, z - level.castlePos.z);
    h = h + (level.castlePos.y - 0.4 - h) * (1 - smooth(30, 58, cd));     // castle plateau
    var rd = riverDist(x, z);
    if (rd < 16) h = Math.min(h, h + (level.river.y - 2.6 - h) * (1 - smooth(5, 16, rd)));
    return h;
  }
  function buildTerrain() {
    var s = level.samples, minX = 1e9, maxX = -1e9;
    s.forEach(function (q) { minX = Math.min(minX, q.p.x); maxX = Math.max(maxX, q.p.x); });
    var x0 = minX - 280, x1 = maxX + 280, z0 = 140, z1 = level.castlePos.z - 180;
    var W = x1 - x0, D = z0 - z1, cell = 4.6;
    var nx = Math.ceil(W / cell), nz = Math.ceil(D / cell);
    var g = new T.PlaneGeometry(W, D, nx, nz);
    g.rotateX(-Math.PI / 2);
    g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    var pos = g.attributes.position, cols = [], th = level.theme, nzf = level.noise, c = new T.Color();
    var grass = th.grass.map(col), high = col(th.high), rock = col(th.rock), peak = col(th.peak), sand = col("#e8d9a8");
    for (var i = 0; i < pos.count; i++) {
      var x = pos.getX(i), z = pos.getZ(i), nt = nearTrack(x, z), h = heightAt(x, z, nt);
      pos.setY(i, h);
      var rel = h - nt.y, k = nzf(x * 0.03, z * 0.03);
      c.copy(grass[Math.floor(k * 3.99) % grass.length]).lerp(grass[(Math.floor(k * 7) + 1) % grass.length], (k * 5) % 1 * 0.5);
      if (rel > 16) c.lerp(high, smooth(16, 40, rel));
      if (rel > 38) c.lerp(rock, smooth(38, 60, rel) * 0.8);
      if (rel > 62) c.lerp(peak, smooth(62, 80, rel));
      var rd = riverDist(x, z);
      if (rd < 11 && th.id !== "winter") c.lerp(sand, 1 - smooth(6, 11, rd));
      if (nt.d < 6) c.lerp(col("#b5a58c"), (1 - smooth(3, 6, nt.d)) * 0.3);
      cols.push(c.r, c.g, c.b);
    }
    g.setAttribute("color", new T.Float32BufferAttribute(cols, 3));
    g.computeVertexNormals();
    var m = mesh(g, std("#ffffff", { vc: true, flat: true, r: 0.95 }));
    m.castShadow = false;
    level.root.add(m);
    level.bounds = { x0: x0, x1: x1, z0: z0, z1: z1 };
  }

  function buildWater() {
    var r = level.river, g = new T.PlaneGeometry(700, 34, 140, 6);
    var pos = g.attributes.position;
    for (var i = 0; i < pos.count; i++) {
      var a = pos.getX(i), b = pos.getY(i) + Math.sin(a * 0.03) * 12;
      pos.setXYZ(i, r.c.x + r.dir.x * a + r.nrm.x * b, r.y, r.c.z + r.dir.z * a + r.nrm.z * b);
    }
    g.computeVertexNormals();
    var m = mesh(g, new T.MeshStandardMaterial({ color: level.theme.water, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.88 }), 0, 0, 0, false);
    m.receiveShadow = true;
    level.root.add(m);
    level.anims.push(function (t) { m.position.y = Math.sin(t * 0.8) * 0.08; });
    // sparkles drifting downstream: built in "river space" (z = along, x = across)
    var holder = new T.Group(); holder.position.set(r.c.x, r.y + 0.15, r.c.z);
    holder.rotation.y = Math.atan2(r.dir.x, r.dir.z);
    var sg = new T.BufferGeometry(), sp = [], lane = [];
    for (var k = 0; k < 140; k++) { var along = (Math.random() - 0.5) * 600, across = (Math.random() - 0.5) * 22; lane.push(across); sp.push(-(across + Math.sin(along * 0.03) * 12), 0, along); }
    sg.setAttribute("position", new T.Float32BufferAttribute(sp, 3));
    var sparks = new T.Points(sg, new T.PointsMaterial({ size: 1.1, map: dotTex, transparent: true, opacity: 0.8, depthWrite: false, color: "#ffffff" }));
    sparks.frustumCulled = false;
    holder.add(sparks); level.root.add(holder);
    level.anims.push(function (t, dt) {
      var p = sg.attributes.position;
      for (var j = 0; j < p.count; j++) {
        var along = p.getZ(j) + dt * 7;
        if (along > 300) along -= 600;
        p.setXYZ(j, -(lane[j] + Math.sin(along * 0.03) * 12), 0, along);   // local +x is the river's -nrm side
      }
      p.needsUpdate = true;
      sparks.material.opacity = 0.45 + Math.sin(t * 3) * 0.3;
    });
  }

  // ---- rails, sleepers and gravel ballast
  function buildTrack() {
    var s = level.samples, th = level.theme;
    var railM = new T.MeshStandardMaterial({ color: "#c9d0da", metalness: 0.9, roughness: 0.28 });
    [-0.72, 0.72].forEach(function (off) {
      var pts = s.map(function (q) { return q.p.clone().add(q.n.clone().multiplyScalar(off)).add(new T.Vector3(0, 0.32, 0)); });
      var g = new T.TubeGeometry(new T.CatmullRomCurve3(pts), s.length * 3, 0.085, 6, false);
      var m = mesh(g, railM); m.castShadow = false; level.root.add(m);
    });
    // sleepers
    var count = Math.floor(level.L / 1.15), sl = new T.InstancedMesh(new T.BoxGeometry(2.5, 0.18, 0.46), std("#7a5134", { r: 0.9 }), count);
    var d = new T.Object3D();
    for (var i = 0; i < count; i++) {
      var u = i / count, p = level.curve.getPointAt(u), t = level.curve.getTangentAt(u);
      d.position.set(p.x, p.y + 0.16, p.z); d.rotation.set(0, Math.atan2(t.x, t.z), 0); d.updateMatrix();
      sl.setMatrixAt(i, d.matrix);
    }
    sl.receiveShadow = true; level.root.add(sl);
    // gravel ballast: a trapezoid ribbon
    var prof = [[-2.3, -0.5], [-1.65, 0.07], [1.65, 0.07], [2.3, -0.5]], verts = [], idx = [], colors = [], gc = col(th.id === "winter" ? "#c9cfd8" : "#a39582");
    s.forEach(function (q, k) {
      prof.forEach(function (pp) { verts.push(q.p.x + q.n.x * pp[0], q.p.y + pp[1], q.p.z + q.n.z * pp[0]); var v = 0.9 + Math.random() * 0.2; colors.push(gc.r * v, gc.g * v, gc.b * v); });
      if (k > 0) { var a = (k - 1) * 4, b = k * 4; for (var j = 0; j < 3; j++) idx.push(a + j, b + j, a + j + 1, b + j, b + j + 1, a + j + 1); }
    });
    var bg = new T.BufferGeometry();
    bg.setAttribute("position", new T.Float32BufferAttribute(verts, 3));
    bg.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
    bg.setIndex(idx); bg.computeVertexNormals();
    var bm = mesh(bg, std("#ffffff", { vc: true, r: 1, flat: true })); bm.castShadow = false; level.root.add(bm);
  }

  // ---- stone bridge where the track crosses the river
  function buildBridge() {
    var s = level.samples, span = [];
    s.forEach(function (q, i) { if (riverDist(q.p.x, q.p.z) < 17) span.push(i); });
    if (!span.length) return;
    var stone = std("#c8b9a2", { r: 0.85, flat: true }), dark = std("#a8987f", { r: 0.9, flat: true });
    var d = new T.Object3D(), g = new T.Group();
    for (var k = span[0]; k <= span[span.length - 1]; k++) {
      var q = s[k], a = Math.atan2(q.t.x, q.t.z);
      var deck = mesh(new T.BoxGeometry(4.8, 1.1, 2.2), stone, q.p.x, q.p.y - 0.75, q.p.z); deck.rotation.y = a; g.add(deck);
      if (k % 2 === 0) [-1, 1].forEach(function (sd) {
        var w = mesh(new T.BoxGeometry(0.45, 0.8, 2.25), dark, q.p.x + q.n.x * 2.5 * sd, q.p.y + 0.1, q.p.z + q.n.z * 2.5 * sd); w.rotation.y = a; g.add(w);
      });
    }
    // arched piers down to the riverbed
    [0.15, 0.5, 0.85].forEach(function (f) {
      var q = s[span[Math.floor((span.length - 1) * f)]], h = q.p.y - level.river.y + 3;
      var pier = mesh(new T.BoxGeometry(4.2, h, 2.6), stone, q.p.x, q.p.y - 1.2 - h / 2, q.p.z); pier.rotation.y = Math.atan2(q.t.x, q.t.z); g.add(pier);
      var cap = mesh(new T.BoxGeometry(4.8, 0.5, 3.2), dark, q.p.x, q.p.y - 1.25, q.p.z); cap.rotation.y = pier.rotation.y; g.add(cap);
    });
    // lamp posts at each end
    [span[0], span[span.length - 1]].forEach(function (k) {
      var q = s[k];
      [-1, 1].forEach(function (sd) { g.add(lamp(q.p.x + q.n.x * 2.6 * sd, q.p.y + 0.4, q.p.z + q.n.z * 2.6 * sd)); });
    });
    level.root.add(g);
  }
  function lamp(x, y, z) {
    var g = new T.Group(); g.position.set(x, y, z);
    g.add(mesh(new T.CylinderGeometry(0.09, 0.12, 3, 8), std("#2f3440", { m: 0.6, r: 0.4 }), 0, 1.5, 0));
    var glass = mesh(new T.SphereGeometry(0.32, 16, 12), std("#fff2c4", { e: "#ffd77a", ei: 1.2 }), 0, 3.15, 0, false);
    g.add(glass);
    g.add(mesh(new T.ConeGeometry(0.4, 0.3, 8), std("#2f3440", { m: 0.6 }), 0, 3.55, 0));
    level.glowers = level.glowers || []; level.glowers.push(glass);
    return g;
  }

  // ---- the starting station
  function buildStation(q, name) {
    var g = new T.Group(), a = Math.atan2(q.t.x, q.t.z);
    g.position.copy(q.p); g.rotation.y = a;
    var acc = level.theme.accent;
    var plat = mesh(new T.BoxGeometry(4, 1.1, 22), std("#d9cdb8", { r: 0.9 }), -4.6, 0.25, 0); g.add(plat);
    g.add(mesh(new T.BoxGeometry(0.3, 0.12, 22), std("#ffd23f"), -2.75, 0.83, 0));
    for (var i = -1; i <= 1; i++) g.add(mesh(new T.CylinderGeometry(0.14, 0.14, 4, 10), std("#f6f2ea"), -5.8, 2.8, i * 8));
    var roof = mesh(new T.BoxGeometry(5.4, 0.35, 20), std(acc, { r: 0.5 }), -4.8, 4.9, 0); roof.rotation.z = 0.12; g.add(roof);
    for (var j = 0; j < 10; j++) { var sc = mesh(new T.CylinderGeometry(0.27, 0.27, 5.4, 10, 1, false, 0, Math.PI), std(j % 2 ? "#ffffff" : acc, { r: 0.6, ds: true }), -4.8, 4.6, -9 + j * 2); sc.rotation.z = Math.PI / 2; g.add(sc); }
    var sign = new T.Mesh(new T.PlaneGeometry(6, 1.5), new T.MeshStandardMaterial({ map: textTexture(name, { bg: "#2f3a5e", color: "#ffe37a", size: 60 }), roughness: 0.6 }));
    sign.position.set(-2.4, 5.8, 0); sign.rotation.y = Math.PI / 2; g.add(sign);
    var back = sign.clone(); back.rotation.y = -Math.PI / 2; back.position.x = -2.45; g.add(back);
    g.add(lamp(-3.2, 0.8, 9.5)); g.add(lamp(-3.2, 0.8, -9.5));
    // flower boxes / crates
    [-6, 6].forEach(function (z) { g.add(mesh(new T.BoxGeometry(1.2, 0.9, 1.2), std("#a4713f"), -5.5, 1.25, z)); });
    level.root.add(g);
  }

  // ---- trees, rocks and theme decorations (all instanced)
  function buildScenery() {
    var th = level.theme, R = level.R, b = level.bounds, d = new T.Object3D(), c = new T.Color();
    var spots = [];
    for (var tries = 0; tries < 6000 && spots.length < 620; tries++) {
      var x = b.x0 + 20 + R() * (b.x1 - b.x0 - 40), z = b.z1 + 20 + R() * (b.z0 - b.z1 - 40);
      var nt = nearTrack(x, z);
      if (nt.d < 9 || nt.d > 240 || riverDist(x, z) < 10) continue;
      if (Math.hypot(x - level.castlePos.x, z - level.castlePos.z) < 48) continue;
      var y = heightAt(x, z, nt);
      if (y - nt.y > 55) continue;
      // clumps: forests are denser in noisy patches
      if (level.noise(x * 0.02 + 9, z * 0.02) < 0.42 && R() < 0.7) continue;
      spots.push([x, y, z, 0.8 + R() * 0.9]);
    }
    var trunkM = std(th.trunk, { r: 0.9, flat: true }), leafM = std("#ffffff", { r: 0.8, flat: true });
    var trunks = new T.InstancedMesh(new T.CylinderGeometry(0.35, 0.55, 3.2, 6), trunkM, spots.length);
    var leaves = [];
    if (th.tree === "pine") {
      [[3.4, 4.2, 4.4], [2.7, 3.6, 6.6], [1.9, 3, 8.6]].forEach(function (l) { leaves.push({ g: new T.ConeGeometry(l[0], l[1], 7), y: l[2] }); });
      leaves.push({ g: new T.ConeGeometry(1.0, 1.6, 7), y: 9.9, snow: true });
    } else {
      leaves.push({ g: new T.IcosahedronGeometry(2.6, 1), y: 4.6 });
      leaves.push({ g: new T.IcosahedronGeometry(1.9, 1), y: 6.6, dx: 0.6 });
      leaves.push({ g: new T.IcosahedronGeometry(1.6, 1), y: 5.2, dx: -1.4 });
    }
    var lMeshes = leaves.map(function (l) { var m = new T.InstancedMesh(l.g, leafM, spots.length); m.castShadow = true; m.receiveShadow = true; return m; });
    spots.forEach(function (sp, i) {
      var s = sp[3], rot = R() * 6.28;
      d.position.set(sp[0], sp[1] + 1.4 * s, sp[2]); d.rotation.set(0, rot, 0); d.scale.set(s, s, s); d.updateMatrix(); trunks.setMatrixAt(i, d.matrix);
      var lc = th.leaves[Math.floor(R() * th.leaves.length)];
      leaves.forEach(function (l, k) {
        var dx = (l.dx || 0) * s;
        d.position.set(sp[0] + Math.cos(rot) * dx, sp[1] + l.y * s, sp[2] + Math.sin(rot) * dx);
        d.rotation.set(R() * 0.4, rot, R() * 0.4); d.scale.set(s, s * (th.tree === "pine" ? 1 : 0.92), s); d.updateMatrix();
        lMeshes[k].setMatrixAt(i, d.matrix);
        c.set(l.snow ? "#ffffff" : lc).offsetHSL(0, 0, (R() - 0.5) * 0.08);
        lMeshes[k].setColorAt(i, c);
      });
    });
    trunks.castShadow = true;
    level.root.add(trunks); lMeshes.forEach(function (m) { level.root.add(m); });

    // rocks
    var rocks = new T.InstancedMesh(new T.DodecahedronGeometry(1.2, 0), std(th.rock, { flat: true, r: 0.9 }), 160), rn = 0;
    for (var t2 = 0; t2 < 600 && rn < 160; t2++) {
      var rx = b.x0 + R() * (b.x1 - b.x0), rz = b.z1 + R() * (b.z0 - b.z1), nt2 = nearTrack(rx, rz);
      if (nt2.d < 7 || nt2.d > 200) continue;
      var sc = 0.5 + R() * 1.8;
      d.position.set(rx, heightAt(rx, rz, nt2) + 0.2, rz); d.rotation.set(R() * 3, R() * 3, R() * 3); d.scale.set(sc, sc * 0.7, sc); d.updateMatrix();
      rocks.setMatrixAt(rn++, d.matrix);
    }
    rocks.count = rn; rocks.castShadow = true; rocks.receiveShadow = true; level.root.add(rocks);

    // decorations near the line: flowers, pumpkins, snowmen or candy
    var deco = [];
    for (var t3 = 0; t3 < 4000 && deco.length < 420; t3++) {
      var q = level.samples[Math.floor(R() * level.samples.length)], side = R() < 0.5 ? -1 : 1, off = 4 + R() * 26;
      var dx3 = q.p.x + q.n.x * off * side + (R() - 0.5) * 4, dz3 = q.p.z + q.n.z * off * side + (R() - 0.5) * 4;
      if (riverDist(dx3, dz3) < 9 || nearTrack(dx3, dz3).d < 3.8) continue;
      deco.push([dx3, heightAt(dx3, dz3), dz3]);
    }
    if (th.deco === "flowers") {
      var stem = new T.InstancedMesh(new T.CylinderGeometry(0.05, 0.05, 0.7, 4), std("#4c9a3a"), deco.length);
      var bloom = new T.InstancedMesh(new T.IcosahedronGeometry(0.28, 0), std("#ffffff", { flat: true }), deco.length);
      deco.forEach(function (p, i) {
        d.position.set(p[0], p[1] + 0.35, p[2]); d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1); d.updateMatrix(); stem.setMatrixAt(i, d.matrix);
        d.position.y = p[1] + 0.75; d.updateMatrix(); bloom.setMatrixAt(i, d.matrix);
        bloom.setColorAt(i, c.set(["#ff7cc3", "#ffd23f", "#ffffff", "#a35ce0", "#ff8a3d"][i % 5]));
      });
      level.root.add(stem, bloom);
      // mushrooms
      for (var mi = 0; mi < 14; mi++) {
        var mp = deco[(mi * 29) % deco.length];
        level.root.add(mushroom(mp[0] + 1.2, mp[1], mp[2] + 0.6, 0.8 + R() * 0.8));
      }
    } else if (th.deco === "pumpkins") {
      var pk = new T.InstancedMesh(new T.SphereGeometry(0.6, 12, 8), std("#f08a24", { r: 0.6, flat: true }), Math.min(90, deco.length));
      for (var pi = 0; pi < pk.count; pi++) { var p = deco[pi * 4 % deco.length], s = 0.7 + R() * 0.9; d.position.set(p[0], p[1] + 0.4 * s, p[2]); d.rotation.set(0, R() * 3, 0); d.scale.set(s * 1.15, s * 0.85, s * 1.15); d.updateMatrix(); pk.setMatrixAt(pi, d.matrix); }
      pk.castShadow = true; level.root.add(pk);
      var leaf = new T.InstancedMesh(new T.CircleGeometry(0.35, 5), std("#ffffff", { ds: true }), deco.length);
      deco.forEach(function (p, i) { d.position.set(p[0], p[1] + 0.06, p[2]); d.rotation.set(-Math.PI / 2, 0, R() * 6); d.scale.set(1, 1, 1); d.updateMatrix(); leaf.setMatrixAt(i, d.matrix); leaf.setColorAt(i, c.set(th.leaves[i % th.leaves.length])); });
      level.root.add(leaf);
    } else if (th.deco === "snowmen") {
      for (var si = 0; si < 16; si++) { var sp2 = deco[(si * 23) % deco.length]; level.root.add(snowman(sp2[0], sp2[1], sp2[2], R() * 6)); }
      var ice = new T.InstancedMesh(new T.OctahedronGeometry(0.5, 0), std("#bfe8ff", { e: "#8fd0ff", ei: 0.25, r: 0.15, m: 0.1 }), 80);
      for (var ii = 0; ii < 80; ii++) { var ip = deco[(ii * 5) % deco.length]; d.position.set(ip[0], ip[1] + 0.5, ip[2]); d.rotation.set(0, R() * 3, 0); d.scale.set(1, 1.6 + R(), 1); d.updateMatrix(); ice.setMatrixAt(ii, d.matrix); }
      level.root.add(ice);
    } else if (th.deco === "candy") {
      for (var ci = 0; ci < 22; ci++) { var cp = deco[(ci * 17) % deco.length]; level.root.add(ci % 2 ? lollipop(cp[0], cp[1], cp[2], R()) : candyCane(cp[0], cp[1], cp[2], R() * 6)); }
      var drop = new T.InstancedMesh(new T.SphereGeometry(0.5, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), std("#ffffff", { r: 0.25 }), 120);
      for (var di = 0; di < 120; di++) { var dp = deco[(di * 3) % deco.length], ds = 0.6 + R(); d.position.set(dp[0], dp[1], dp[2]); d.rotation.set(0, 0, 0); d.scale.set(ds, ds * 1.2, ds); d.updateMatrix(); drop.setMatrixAt(di, d.matrix); drop.setColorAt(di, c.set(["#ff7cc3", "#7fd6ff", "#ffd27a", "#b48cff", "#8ff0b0"][di % 5])); }
      level.root.add(drop);
    }
  }
  function mushroom(x, y, z, s) {
    var g = new T.Group(); g.position.set(x, y, z); g.scale.setScalar(s);
    g.add(mesh(new T.CylinderGeometry(0.18, 0.24, 0.6, 10), std("#f6efe2"), 0, 0.3, 0));
    g.add(mesh(new T.SphereGeometry(0.55, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), std("#ef4f66", { r: 0.4 }), 0, 0.55, 0));
    for (var i = 0; i < 5; i++) { var a = i * 1.3; g.add(mesh(new T.SphereGeometry(0.08, 8, 6), std("#ffffff"), Math.cos(a) * 0.32, 0.92, Math.sin(a) * 0.32)); }
    return g;
  }
  function snowman(x, y, z, rot) {
    var g = new T.Group(), w = std("#ffffff", { r: 0.85 }); g.position.set(x, y, z); g.rotation.y = rot;
    g.add(mesh(new T.SphereGeometry(0.9, 18, 14), w, 0, 0.8, 0), mesh(new T.SphereGeometry(0.65, 18, 14), w, 0, 2.0, 0), mesh(new T.SphereGeometry(0.45, 18, 14), w, 0, 2.95, 0));
    var nose = mesh(new T.ConeGeometry(0.09, 0.5, 8), std("#ff8a1a"), 0, 2.95, 0.6); nose.rotation.x = Math.PI / 2; g.add(nose);
    [-1, 1].forEach(function (s) { g.add(mesh(new T.SphereGeometry(0.06, 8, 6), std("#222"), 0.16 * s, 3.08, 0.4)); });
    g.add(mesh(new T.CylinderGeometry(0.32, 0.32, 0.45, 14), std("#2a2a33"), 0, 3.45, 0), mesh(new T.CylinderGeometry(0.5, 0.5, 0.06, 18), std("#2a2a33"), 0, 3.24, 0));
    var sc = mesh(new T.TorusGeometry(0.48, 0.12, 8, 20), std("#ef4f66"), 0, 2.55, 0); sc.rotation.x = Math.PI / 2; g.add(sc);
    return g;
  }
  function lollipop(x, y, z, r) {
    var g = new T.Group(); g.position.set(x, y, z); g.rotation.y = r * 6;
    g.add(mesh(new T.CylinderGeometry(0.12, 0.12, 4, 8), std("#ffffff"), 0, 2, 0));
    var d = mesh(new T.CylinderGeometry(1.4, 1.4, 0.35, 32), std(["#ff7cc3", "#7fd6ff", "#b48cff"][Math.floor(r * 3)], { r: 0.25 }), 0, 4.6, 0); d.rotation.x = Math.PI / 2; g.add(d);
    for (var i = 1; i <= 3; i++) g.add(mesh(new T.TorusGeometry(i * 0.38, 0.09, 6, 30), std(i % 2 ? "#ffffff" : "#ffe37a", { r: 0.3 }), 0, 4.6, 0.19));
    return g;
  }
  function candyCane(x, y, z, rot) {
    var g = new T.Group(); g.position.set(x, y, z); g.rotation.y = rot;
    for (var i = 0; i < 10; i++) g.add(mesh(new T.CylinderGeometry(0.22, 0.22, 0.4, 12), std(i % 2 ? "#ffffff" : "#ef4f66", { r: 0.3 }), 0, 0.2 + i * 0.4, 0));
    var hook = mesh(new T.TorusGeometry(0.7, 0.22, 10, 20, Math.PI), std("#ef4f66", { r: 0.3 }), 0.7, 4.0, 0); g.add(hook);
    return g;
  }

  // ---- distant mountains ringing the valley
  function buildMountains() {
    var b = level.bounds, R = level.R, th = level.theme, g = new T.Group(), c = new T.Color();
    for (var i = 0; i < 46; i++) {
      var side = i % 2 ? 1 : -1, z = b.z0 - R() * (b.z0 - b.z1 + 300), x = side > 0 ? b.x1 + 40 + R() * 220 : b.x0 - 40 - R() * 220;
      if (i % 9 === 0) { x = b.x0 + R() * (b.x1 - b.x0); z = b.z1 - 80 - R() * 200; }
      var h = 120 + R() * 220, r = 90 + R() * 120;
      var geo = new T.ConeGeometry(r, h, 7, 4), pos = geo.attributes.position, cols = [];
      for (var k = 0; k < pos.count; k++) {
        var y = pos.getY(k);
        if (y < h / 2 - 1) { pos.setX(k, pos.getX(k) * (0.85 + R() * 0.3)); pos.setZ(k, pos.getZ(k) * (0.85 + R() * 0.3)); }
        var f = (y + h / 2) / h;
        c.set(th.rock).lerp(col(th.high), 0.3);
        if (f > 0.62) c.set(th.peak);
        cols.push(c.r, c.g, c.b);
      }
      geo.setAttribute("color", new T.Float32BufferAttribute(cols, 3));
      geo.computeVertexNormals();
      var m = new T.Mesh(geo, std("#ffffff", { vc: true, flat: true, r: 1 }));
      m.position.set(x, h / 2 - 40, z); m.rotation.y = R() * 6;
      g.add(m);
    }
    level.root.add(g);
  }
  function buildClouds() {
    var R = level.R, b = level.bounds, m = std("#ffffff", { r: 1, flat: true });
    m.emissive = col("#ffffff"); m.emissiveIntensity = 0.18;
    for (var i = 0; i < 22; i++) {
      var g = new T.Group(), n = 5 + Math.floor(R() * 5);
      for (var k = 0; k < n; k++) {
        var p = mesh(new T.IcosahedronGeometry(6 + R() * 7, 1), m, (k - n / 2) * 7 + R() * 4, R() * 4, R() * 6, false);
        p.scale.y = 0.65; g.add(p);
      }
      g.position.set(b.x0 + R() * (b.x1 - b.x0), 95 + R() * 70, b.z0 - R() * (b.z0 - b.z1));
      g.userData.drift = 1 + R() * 2;
      level.root.add(g);
      (function (cg) { level.anims.push(function (t, dt) { cg.position.x += cg.userData.drift * dt; if (cg.position.x > b.x1 + 60) cg.position.x = b.x0 - 60; }); })(g);
    }
  }

  // ======================================================== THE CASTLE
  function buildCastle() {
    var P = level.palette, g = new T.Group(), R = level.R;
    g.position.copy(level.castlePos);
    g.rotation.y = Math.atan2(-level.castleFwd.x, -level.castleFwd.z);     // front faces the train
    var wall = std(P.wall, { r: 0.75 }), trim = std(P.trim, { m: 0.75, r: 0.3 }), stone = std("#c9bca6", { r: 0.9, flat: true });
    var win = std("#ffe9a8", { e: "#ffc95a", ei: 0.6 });
    level.castle = { group: g, windows: [], roofs: [], orb: null, crystals: [], flags: [], towers: [], palette: P };
    var C = level.castle;
    // plateau
    var base = mesh(new T.CylinderGeometry(30, 36, 8, 18), stone, 0, -4.4, 0); g.add(base);
    g.add(mesh(new T.CylinderGeometry(30.5, 30.5, 0.6, 18), std(level.theme.grass[0], { flat: true }), 0, -0.2, 0));
    // curtain walls (square, with crenellations)
    var S = 15, crenG = new T.BoxGeometry(1.1, 1.2, 1.2), crens = [];
    [[0, -S, 0], [0, S, 0], [-S, 0, Math.PI / 2], [S, 0, Math.PI / 2]].forEach(function (w, i) {
      var seg = mesh(new T.BoxGeometry(2 * S, 9, 2.4), wall, w[0], 4.5, w[1]); seg.rotation.y = w[2]; g.add(seg);
      for (var k = -S + 1; k < S; k += 2.2) crens.push([w[0] + (w[2] ? 0 : k), 9.6, w[1] + (w[2] ? k : 0)]);
      if (i === 1) {   // front wall: windows + banners
        for (var b = -1; b <= 1; b += 2) {
          var banner = mesh(new T.PlaneGeometry(2.4, 5.2), std(P.roofs[(b + 1) / 2 + 1], { ds: true, r: 0.7 }), b * 9, 5.5, S + 1.25);
          g.add(banner); C.flags.push(banner);
          g.add(mesh(new T.CircleGeometry(0.7, 20), trim, b * 9, 6.2, S + 1.3));
        }
      }
    });
    var cr = new T.InstancedMesh(crenG, wall, crens.length), d = new T.Object3D();
    crens.forEach(function (p, i) { d.position.set(p[0], p[1], p[2]); d.updateMatrix(); cr.setMatrixAt(i, d.matrix); });
    cr.castShadow = true; g.add(cr);
    // gate
    var arch = mesh(new T.CylinderGeometry(3.2, 3.2, 2.6, 24, 1, false, 0, Math.PI), std("#3a2a48", { r: 0.8 }), 0, 4, S + 0.1);
    arch.rotation.set(Math.PI / 2, 0, Math.PI / 2); g.add(arch);
    g.add(mesh(new T.BoxGeometry(6.4, 4, 2.6), std("#3a2a48"), 0, 2, S + 0.1));
    for (var px = -2.6; px <= 2.6; px += 1.3) g.add(mesh(new T.BoxGeometry(0.15, 6.6, 0.15), trim, px, 3.3, S + 1.4));
    for (var py = 1; py <= 6; py += 1.4) g.add(mesh(new T.BoxGeometry(6, 0.15, 0.15), trim, 0, py, S + 1.4));
    var bridgeM = mesh(new T.BoxGeometry(6, 0.4, 10), std("#8a6038", { r: 0.9 }), 0, -0.05, S + 6.2); g.add(bridgeM);
    // towers
    function tower(x, z, r, h, roofCol, rh) {
      var t = new T.Group(); t.position.set(x, 0, z);
      t.add(mesh(new T.CylinderGeometry(r, r * 1.12, h, 24), wall, 0, h / 2, 0));
      t.add(mesh(new T.CylinderGeometry(r * 1.22, r * 1.22, 1.4, 24), wall, 0, h + 0.2, 0));
      t.add(mesh(new T.TorusGeometry(r * 1.22, 0.18, 8, 32), trim, 0, h - 0.5, 0)).children;
      var ring = t.children[t.children.length - 1]; ring.rotation.x = Math.PI / 2;
      var roof = mesh(new T.ConeGeometry(r * 1.42, rh, 24), std(roofCol, { r: 0.35, m: 0.1 }), 0, h + 0.9 + rh / 2, 0); t.add(roof); C.roofs.push(roof);
      t.add(mesh(new T.SphereGeometry(r * 0.22, 14, 10), trim, 0, h + 0.9 + rh + r * 0.15, 0));
      var pole = mesh(new T.CylinderGeometry(0.07, 0.07, 3.2, 6), trim, 0, h + 2.4 + rh, 0); t.add(pole);
      var flag = mesh(new T.PlaneGeometry(2.4, 1.3, 8, 2), std(P.roofs[(C.towers.length + 1) % 4], { ds: true, r: 0.6 }), 1.25, h + 3.2 + rh, 0, false);
      t.add(flag); C.flags.push(flag); flag.userData.wave = true;
      for (var k = 0; k < 6; k++) {
        var a = k / 6 * Math.PI * 2 + 0.3, wy = h * (0.35 + (k % 3) * 0.2);
        var w = mesh(new T.BoxGeometry(0.9, 1.5, 0.3), win, Math.sin(a) * r * 1.02, wy, Math.cos(a) * r * 1.02, false);
        w.rotation.y = a; t.add(w); C.windows.push(w);
      }
      C.towers.push(t); g.add(t);
      return t;
    }
    tower(-S, -S, 3.6, 18, P.roofs[0], 9);
    tower(S, -S, 3.6, 18, P.roofs[1], 9);
    tower(-S, S, 3.9, 15, P.roofs[2], 8);
    tower(S, S, 3.9, 15, P.roofs[3], 8);
    tower(-4.6, S + 0.4, 2.2, 13, P.roofs[1], 5.5);
    tower(4.6, S + 0.4, 2.2, 13, P.roofs[0], 5.5);
    // the keep and its spires
    var keep = tower(0, -2, 7.5, 28, P.roofs[0], 15);
    tower(-7.5, -6, 2.6, 34, P.roofs[2], 12);
    tower(7.5, -6, 2.6, 34, P.roofs[3], 12);
    tower(0, 5, 3.2, 22, P.roofs[1], 9);
    // a magic orb above the keep
    var orb = mesh(new T.SphereGeometry(2.2, 32, 20), std("#ffffff", { e: P.glow, ei: 1.4, r: 0.2 }), 0, 51, -2, false);
    g.add(orb); C.orb = orb;
    // a magical light that washes the castle in colour once the sky darkens
    var glowL = new T.PointLight(P.glow, 0, 140, 1.4); glowL.position.set(0, 30, 22); g.add(glowL); C.light = glowL;
    var halo = new T.Sprite(new T.SpriteMaterial({ map: dotTex, color: P.glow, transparent: true, opacity: 0.85, depthWrite: false, blending: T.AdditiveBlending }));
    halo.scale.set(16, 16, 1); halo.position.copy(orb.position); g.add(halo); C.halo = halo;
    // floating crystals orbiting the keep
    for (var ci = 0; ci < 6; ci++) {
      var cm = mesh(new T.OctahedronGeometry(1.2, 0), std(P.roofs[ci % 4], { e: P.roofs[ci % 4], ei: 0.55, r: 0.15, m: 0.2 }), 0, 0, 0, false);
      cm.scale.y = 1.7; g.add(cm); C.crystals.push(cm);
    }
    // sparkles rising around the castle
    var sg = new T.BufferGeometry(), sp = [];
    for (var s2 = 0; s2 < 260; s2++) sp.push((Math.random() - 0.5) * 50, Math.random() * 60, (Math.random() - 0.5) * 50);
    sg.setAttribute("position", new T.Float32BufferAttribute(sp, 3));
    var sparks = new T.Points(sg, new T.PointsMaterial({ size: 0.9, map: dotTex, color: P.glow, transparent: true, opacity: 0.9, depthWrite: false, blending: T.AdditiveBlending }));
    g.add(sparks); C.sparks = sparks;
    // a castle station platform at the end of the line
    var end = level.samples[level.samples.length - 1];
    var plat = mesh(new T.BoxGeometry(4, 1.1, 16), std("#e6dccb", { r: 0.9 }), 0, 0, 0);
    var pg = new T.Group(); pg.position.copy(end.p).add(end.n.clone().multiplyScalar(-4.4)); pg.position.y += 0.25;
    pg.rotation.y = Math.atan2(end.t.x, end.t.z); pg.add(plat);
    var bump = mesh(new T.BoxGeometry(3, 1.4, 0.8), std("#ef4f66"), 4.4, 0.4, 6.5); pg.add(bump);
    level.root.add(pg);
    level.root.add(g);
    level.anims.push(function (t) {
      orb.position.y = 51 + Math.sin(t * 1.4) * 0.8; halo.position.y = orb.position.y;
      halo.material.opacity = 0.65 + Math.sin(t * 2.2) * 0.2;
      C.crystals.forEach(function (c, i) {
        var a = t * 0.5 + i / C.crystals.length * Math.PI * 2;
        c.position.set(Math.cos(a) * 14, 36 + Math.sin(t * 1.3 + i) * 2.5, -2 + Math.sin(a) * 14); c.rotation.y = t * 1.5 + i;
      });
      C.flags.forEach(function (f) {
        if (!f.userData.wave) return;
        var p = f.geometry.attributes.position;
        for (var k = 0; k < p.count; k++) { var x = p.getX(k); p.setZ(k, Math.sin(x * 2.2 - t * 5) * 0.22 * (x + 1.2)); }
        p.needsUpdate = true;
      });
      var sp3 = sparks.geometry.attributes.position;
      for (var k2 = 0; k2 < sp3.count; k2++) { var y = sp3.getY(k2) + 0.06; if (y > 62) y = 0; sp3.setY(k2, y); }
      sp3.needsUpdate = true;
    });
  }

  // ---------------------------------------------------- ambient particles
  function buildParticles() {
    var th = level.theme, kind = th.particles;
    var n = kind === "snow" ? 1600 : kind === "leaves" ? 500 : kind === "fireflies" ? 400 : 0;
    if (kind === "butterflies") { buildButterflies(); return; }
    var g = new T.BufferGeometry(), p = [], c = [], cc = new T.Color();
    for (var i = 0; i < n; i++) {
      p.push((Math.random() - 0.5) * 160, Math.random() * 60, (Math.random() - 0.5) * 160);
      cc.set(kind === "leaves" ? th.leaves[i % th.leaves.length] : kind === "fireflies" ? ["#fff38a", "#ffd0f0", "#bfe8ff"][i % 3] : "#ffffff");
      c.push(cc.r, cc.g, cc.b);
    }
    g.setAttribute("position", new T.Float32BufferAttribute(p, 3));
    g.setAttribute("color", new T.Float32BufferAttribute(c, 3));
    var m = new T.PointsMaterial({ size: kind === "snow" ? 0.55 : kind === "leaves" ? 0.9 : 0.7, map: dotTex, vertexColors: true, transparent: true,
      opacity: 0.95, depthWrite: false, blending: kind === "fireflies" ? T.AdditiveBlending : T.NormalBlending });
    var pts = new T.Points(g, m); pts.frustumCulled = false;
    level.root.add(pts);
    level.anims.push(function (t, dt) {
      var a = g.attributes.position, cx = camera.position.x, cz = camera.position.z, by = camera.position.y - 25;
      for (var i = 0; i < a.count; i++) {
        var x = a.getX(i), y = a.getY(i), z = a.getZ(i);
        if (kind === "fireflies") { y += Math.sin(t * 2 + i) * 0.02; x += Math.cos(t + i) * 0.02; }
        else { y -= (kind === "snow" ? 4 : 3) * dt; x += Math.sin(t * 0.8 + i) * dt * (kind === "leaves" ? 2 : 0.8); }
        if (y < by) y = by + 60;
        if (x < cx - 80) x += 160; if (x > cx + 80) x -= 160;
        if (z < cz - 80) z += 160; if (z > cz + 80) z -= 160;
        a.setXYZ(i, x, y, z);
      }
      a.needsUpdate = true;
      if (kind === "fireflies") m.opacity = 0.6 + Math.sin(t * 3) * 0.3;
    });
  }
  function buildButterflies() {
    var cols = ["#ff7cc3", "#ffd23f", "#7fd6ff", "#b48cff", "#ff8a3d"];
    for (var i = 0; i < 18; i++) {
      var q = level.samples[Math.floor(level.R() * level.samples.length)];
      var g = new T.Group(), m = std(cols[i % cols.length], { ds: true, r: 0.6 });
      var l = new T.Mesh(new T.CircleGeometry(0.35, 12), m), r = l.clone();
      l.position.x = -0.3; r.position.x = 0.3; g.add(l, r);
      var home = q.p.clone().add(q.n.clone().multiplyScalar((level.R() - 0.5) * 24)); home.y += 1.5;
      level.root.add(g);
      (function (g, l, r, home, ph) {
        level.anims.push(function (t) {
          g.position.set(home.x + Math.sin(t * 0.7 + ph) * 3, home.y + Math.sin(t * 1.7 + ph) * 0.8, home.z + Math.cos(t * 0.5 + ph) * 3);
          var f = Math.sin(t * 18 + ph) * 1.1; l.rotation.y = f; r.rotation.y = -f; g.rotation.y = t * 0.6 + ph;
        });
      })(g, l, r, home, i * 1.7);
    }
  }

  // ======================================================== WORD STOPS
  function placeStops(n) {
    level.stops = [];
    for (var i = 0; i < n; i++) {
      var d = level.L * (i + 1) / (n + 1.15) + 24, u = d / level.L;
      var p = level.curve.getPointAt(u), t = level.curve.getTangentAt(u);
      var g = new T.Group(); g.position.copy(p); g.rotation.y = Math.atan2(t.x, t.z);
      var acc = std(level.theme.accent, { r: 0.4, m: 0.1 }), gold = std("#ffcf33", { m: 0.7, r: 0.3 });
      [-1, 1].forEach(function (s) {
        g.add(mesh(new T.CylinderGeometry(0.22, 0.28, 5, 12), acc, 2.9 * s, 2.5, 0));
        g.add(mesh(new T.SphereGeometry(0.32, 12, 10), gold, 2.9 * s, 5.1, 0));
      });
      var arch = mesh(new T.TorusGeometry(2.9, 0.2, 10, 30, Math.PI), acc, 0, 5, 0); g.add(arch);
      var sign = new T.Group(); sign.position.set(0, 6.3, 0);
      var hex = mesh(new T.CylinderGeometry(1.05, 1.05, 0.25, 6), std("#ffcf33", { r: 0.4, e: "#ffb000", ei: 0.15 }), 0, 0, 0);
      hex.rotation.x = Math.PI / 2; hex.rotation.y = Math.PI / 6; sign.add(hex);
      var face = new T.Mesh(new T.CircleGeometry(0.82, 6), new T.MeshBasicMaterial({ map: textTexture(String(i + 1), { w: 128, h: 128, size: 84, color: "#3a2b28" }), transparent: true }));
      face.rotation.z = Math.PI / 6; face.position.z = -0.14; face.rotation.y = Math.PI; sign.add(face);
      var face2 = face.clone(); face2.position.z = 0.14; face2.rotation.y = 0; sign.add(face2);
      g.add(sign);
      var glow = new T.Sprite(new T.SpriteMaterial({ map: dotTex, color: "#ffe37a", transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending }));
      glow.scale.set(9, 9, 1); glow.position.y = 6.3; g.add(glow);
      level.root.add(g);
      level.stops.push({ d: d - 9, g: g, hex: hex, sign: sign, glow: glow, state: "ahead" });
    }
    level.anims.push(function (t) {
      level.stops.forEach(function (s, i) {
        s.sign.rotation.y = s.state === "done" ? t * 2 : Math.sin(t * 1.5 + i) * 0.25;
        s.glow.material.opacity = s.state === "active" ? 0.55 + Math.sin(t * 5) * 0.25 : s.state === "done" ? 0.35 : 0;
      });
    });
  }
  function setStopState(i, state) {
    var s = level && level.stops[i]; if (!s) return;
    s.state = state;
    if (state === "done") { s.hex.material.color.set("#5fe38a"); s.hex.material.emissive.set("#2fbf5f"); s.hex.material.emissiveIntensity = 0.5; s.glow.material.color.set("#9fffbf"); }
  }

  // ======================================================== THE TRAIN
  function buildTrain() {
    var red = std("#d8343f", { r: 0.32, m: 0.15 }), dark = std("#262a36", { r: 0.5, m: 0.4 }), gold = std("#ffc93c", { m: 0.85, r: 0.25 });
    var blue = std("#2f5fbf", { r: 0.35, m: 0.15 }), cream = std("#fff4dc", { r: 0.5 });
    function wheel(r, mat) {
      var w = new T.Group();
      var rim = mesh(new T.CylinderGeometry(r, r, 0.18, 28), mat); rim.rotation.z = Math.PI / 2; w.add(rim);
      var tyre = mesh(new T.TorusGeometry(r, 0.06, 8, 28), dark); tyre.rotation.y = Math.PI / 2; w.add(tyre);
      for (var k = 0; k < 4; k++) { var sp = mesh(new T.BoxGeometry(0.2, r * 1.8, 0.09), gold); sp.rotation.x = k * Math.PI / 4; w.add(sp); }
      var hub = mesh(new T.CylinderGeometry(r * 0.25, r * 0.25, 0.24, 14), gold); hub.rotation.z = Math.PI / 2; w.add(hub);
      return w;
    }
    // ---- locomotive (forward = +z)
    var loco = new T.Group(), wheels = [];
    loco.add(mesh(new T.BoxGeometry(1.9, 0.4, 6.6), dark, 0, 0.95, 0));
    var boiler = mesh(new T.CylinderGeometry(0.88, 0.88, 3.8, 32), red, 0, 1.95, 0.95); boiler.rotation.x = Math.PI / 2; loco.add(boiler);
    var smokebox = mesh(new T.CylinderGeometry(0.93, 0.93, 0.8, 32), dark, 0, 1.95, 3.2); smokebox.rotation.x = Math.PI / 2; loco.add(smokebox);
    var door = mesh(new T.CylinderGeometry(0.7, 0.7, 0.1, 32), dark, 0, 1.95, 3.62); door.rotation.x = Math.PI / 2; loco.add(door);
    put(loco, mesh(new T.TorusGeometry(0.72, 0.06, 8, 32), gold, 0, 1.95, 3.66));
    [-0.6, 0.4, 1.4, 2.6].forEach(function (z) { put(loco, mesh(new T.TorusGeometry(0.89, 0.06, 8, 32), gold, 0, 1.95, z)); });
    var chimney = mesh(new T.CylinderGeometry(0.26, 0.32, 1.1, 18), dark, 0, 3.2, 2.9); loco.add(chimney);
    loco.add(mesh(new T.CylinderGeometry(0.48, 0.28, 0.45, 18), dark, 0, 3.9, 2.9));
    loco.add(mesh(new T.TorusGeometry(0.47, 0.05, 8, 24), gold, 0, 4.1, 2.9)).children;
    loco.children[loco.children.length - 1].rotation.x = Math.PI / 2;
    loco.add(mesh(new T.SphereGeometry(0.42, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), gold, 0, 2.75, 1.4));
    loco.add(mesh(new T.SphereGeometry(0.3, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), gold, 0, 2.75, 0.3));
    // headlamp
    var lampB = mesh(new T.CylinderGeometry(0.28, 0.28, 0.45, 16), gold, 0, 3.05, 3.45); lampB.rotation.x = Math.PI / 2; loco.add(lampB);
    var lens = mesh(new T.CircleGeometry(0.22, 18), std("#fffbe0", { e: "#fff2b0", ei: 1.5 }), 0, 3.05, 3.69, false); loco.add(lens);
    var beam = new T.Sprite(new T.SpriteMaterial({ map: dotTex, color: "#fff6c8", transparent: true, opacity: 0.8, depthWrite: false, blending: T.AdditiveBlending }));
    beam.scale.set(3, 3, 1); beam.position.set(0, 3.05, 3.8); loco.add(beam);
    // cab
    loco.add(mesh(new T.BoxGeometry(2.15, 2.1, 2.1), red, 0, 2.2, -1.85));
    [-1, 1].forEach(function (s) { loco.add(mesh(new T.BoxGeometry(0.06, 0.8, 1.0), std("#9fd8ff", { r: 0.1, e: "#5f9fdf", ei: 0.2 }), 1.08 * s, 2.65, -1.85)); });
    loco.add(mesh(new T.BoxGeometry(1.4, 0.75, 0.06), std("#9fd8ff", { r: 0.1 }), 0, 2.65, -0.79));
    var roof = mesh(new T.CylinderGeometry(1.7, 1.7, 2.5, 24, 1, false, -0.7, 1.4), blue, 0, 1.75, -1.85); roof.rotation.z = Math.PI / 2; roof.rotation.y = Math.PI / 2; loco.add(roof);
    loco.add(mesh(new T.BoxGeometry(2.4, 0.12, 2.5), gold, 0, 3.32, -1.85));
    // cowcatcher
    var cc = mesh(new T.CylinderGeometry(0.05, 1.0, 0.9, 4, 1), red, 0, 0.6, 3.6); cc.rotation.x = Math.PI / 2 + 0.6; cc.rotation.y = Math.PI / 4; cc.scale.set(1, 1, 0.5); loco.add(cc);
    loco.add(mesh(new T.SphereGeometry(0.2, 12, 10), gold, 0, 2.95, 2.0));   // bell
    // wheels + rods
    [[-0.86, 1.6, 0.6], [-0.86, 0.3, 0.6], [-0.86, -1.0, 0.6], [0.86, 1.6, 0.6], [0.86, 0.3, 0.6], [0.86, -1.0, 0.6]].forEach(function (w) {
      var wh = wheel(w[2], red); wh.position.set(w[0], w[2] + 0.12, w[1]); loco.add(wh); wheels.push({ o: wh, r: w[2] });
    });
    [[-0.78, 2.75, 0.36], [0.78, 2.75, 0.36]].forEach(function (w) { var wh = wheel(w[2], dark); wh.position.set(w[0], w[2] + 0.1, w[1]); loco.add(wh); wheels.push({ o: wh, r: w[2] }); });
    var rods = [-1, 1].map(function (s) { var r = mesh(new T.BoxGeometry(0.07, 0.12, 2.7), SILVERish(), 1.0 * s, 0.72, 0.3); loco.add(r); return r; });
    function SILVERish() { return std("#dfe6ee", { m: 0.85, r: 0.25 }); }

    // ---- tender
    var tender = new T.Group();
    tender.add(mesh(new T.BoxGeometry(2.05, 1.5, 3.4), red, 0, 1.75, 0));
    tender.add(mesh(new T.BoxGeometry(2.15, 0.14, 3.5), gold, 0, 2.56, 0));
    for (var k = 0; k < 10; k++) tender.add(mesh(new T.DodecahedronGeometry(0.38, 0), std("#1c1c22", { r: 0.9, flat: true }), (k % 3 - 1) * 0.55, 2.6, (Math.floor(k / 3) - 1.5) * 0.75));
    tender.add(mesh(new T.BoxGeometry(1.9, 0.35, 3.6), dark, 0, 0.95, 0));
    [[-0.86, 1.0], [-0.86, -1.0], [0.86, 1.0], [0.86, -1.0]].forEach(function (w) { var wh = wheel(0.42, dark); wh.position.set(w[0], 0.52, w[1]); tender.add(wh); wheels.push({ o: wh, r: 0.42 }); });
    var tSign = new T.Mesh(new T.PlaneGeometry(2.6, 0.8), new T.MeshStandardMaterial({ map: textTexture("SPELLBOUND", { color: "#ffd86b", size: 76, bg: "#d8343f" }), roughness: 0.4 }));
    [-1, 1].forEach(function (s) { var sg = tSign.clone(); sg.position.set(1.035 * s, 1.75, 0); sg.rotation.y = Math.PI / 2 * s; tender.add(sg); });

    // ---- open observation car (the avatar rides here)
    var car = new T.Group();
    car.add(mesh(new T.BoxGeometry(2.2, 0.35, 4.6), dark, 0, 0.95, 0));
    car.add(mesh(new T.BoxGeometry(2.25, 0.2, 4.6), cream, 0, 1.22, 0));
    [-1, 1].forEach(function (s) {
      car.add(mesh(new T.BoxGeometry(0.14, 0.75, 4.6), blue, 1.06 * s, 1.68, 0));
      car.add(mesh(new T.BoxGeometry(0.18, 0.1, 4.7), gold, 1.06 * s, 2.08, 0));
    });
    [-1, 1].forEach(function (s) { car.add(mesh(new T.BoxGeometry(2.2, 0.75, 0.14), blue, 0, 1.68, 2.24 * s)); car.add(mesh(new T.BoxGeometry(2.3, 0.1, 0.18), gold, 0, 2.08, 2.24 * s)); });
    var bench = mesh(new T.BoxGeometry(1.5, 0.3, 0.9), std("#a35ce0", { r: 0.7 }), 0, 1.55, -0.6); car.add(bench);
    car.add(mesh(new T.BoxGeometry(1.5, 0.9, 0.25), std("#a35ce0", { r: 0.7 }), 0, 1.95, -1.05));
    // bunting
    var flagCols = ["#ef4f66", "#ffcf33", "#46c486", "#35a6dd", "#a35ce0", "#ff7cc3"];
    [-1.9, 1.9].forEach(function (z) {
      [-1, 1].forEach(function (s) { car.add(mesh(new T.CylinderGeometry(0.05, 0.05, 1.6, 6), gold, 1.0 * s, 2.8, z)); });
      for (var f = 0; f < 6; f++) { var fl = mesh(new T.ConeGeometry(0.13, 0.32, 3), std(flagCols[f], { r: 0.7 }), -0.82 + f * 0.33, 3.33, z); fl.rotation.x = Math.PI; car.add(fl); }
      car.add(mesh(new T.BoxGeometry(2.0, 0.03, 0.03), std("#ffffff"), 0, 3.5, z));
    });
    [[-0.9, 1.4], [-0.9, -1.4], [0.9, 1.4], [0.9, -1.4]].forEach(function (w) { var wh = wheel(0.42, dark); wh.position.set(w[0], 0.52, w[1]); car.add(wh); wheels.push({ o: wh, r: 0.42 }); });
    avatarSeat = new T.Group(); avatarSeat.position.set(0, 1.35, -0.45); car.add(avatarSeat);

    // ---- bee caboose
    var cab = new T.Group(), yel = std("#ffcf33", { r: 0.4 }), blk = std("#2a2420", { r: 0.5 });
    cab.add(mesh(new T.BoxGeometry(2.1, 0.35, 3.4), dark, 0, 0.95, 0));
    var body = mesh(new T.CylinderGeometry(1.15, 1.15, 3.2, 28), yel, 0, 2.15, 0); body.rotation.x = Math.PI / 2; cab.add(body);
    [-0.7, 0.4].forEach(function (z) { var st = mesh(new T.CylinderGeometry(1.17, 1.17, 0.45, 28), blk, 0, 2.15, z); st.rotation.x = Math.PI / 2; cab.add(st); });
    [-1, 1].forEach(function (s) { var w = mesh(new T.CircleGeometry(0.9, 24), std("#eaf7ff", { op: 0.65, ds: true, r: 0.1 }), 0.9 * s, 3.4, 0); w.rotation.set(0, Math.PI / 2, 0.5 * s); w.rotation.z = 0; w.position.y = 3.5; cab.add(w); w.userData.wing = s; cab.userData.wings = (cab.userData.wings || []).concat([w]); });
    [-1, 1].forEach(function (s) { var an = mesh(new T.CylinderGeometry(0.04, 0.04, 0.9, 6), blk, 0.4 * s, 3.5, 1.4); an.rotation.x = 0.5; cab.add(an); cab.add(mesh(new T.SphereGeometry(0.1, 10, 8), blk, 0.4 * s, 3.9, 1.65)); });
    [[-0.86, 1.0], [-0.86, -1.0], [0.86, 1.0], [0.86, -1.0]].forEach(function (w) { var wh = wheel(0.42, dark); wh.position.set(w[0], 0.52, w[1]); cab.add(wh); wheels.push({ o: wh, r: 0.42 }); });

    var cars = [{ o: loco, back: 0 }, { o: tender, back: 6.0 }, { o: car, back: 10.9 }, { o: cab, back: 16.2 }];
    cars.forEach(function (c) { c.o.traverse(function (m) { if (m.isMesh) m.castShadow = true; }); scene.add(c.o); });
    // couplings
    train = { cars: cars, wheels: wheels, rods: rods, s: 0, v: 0, target: 0, moving: false, dist: 0, chimney: new T.Vector3(0, 4.2, 2.9),
      loco: loco, car: car, caboose: cab, smoke: makeSmoke() };
  }
  function makeSmoke() {
    var pool = [];
    for (var i = 0; i < 60; i++) {
      var s = new T.Sprite(new T.SpriteMaterial({ map: dotTex, color: "#ffffff", transparent: true, opacity: 0, depthWrite: false }));
      s.visible = false; scene.add(s); pool.push({ s: s, life: 0, max: 1, vel: new T.Vector3() });
    }
    return { pool: pool, acc: 0 };
  }
  function puff(pos, big) {
    var p = train.smoke.pool.find(function (q) { return q.life <= 0; }); if (!p) return;
    p.s.position.copy(pos); p.life = p.max = 1.6 + Math.random() * 1.2;
    p.vel.set((Math.random() - 0.5) * 0.8, 2.2 + Math.random() * 1.2 + (big ? 1.5 : 0), (Math.random() - 0.5) * 0.8);
    p.s.visible = true; p.big = big;
  }
  function stepSmoke(dt) {
    var sm = train.smoke, wp = new T.Vector3();
    var rate = train.moving ? 6 + train.v * 0.9 : 2.2;
    sm.acc += dt * rate;
    while (sm.acc > 1) { sm.acc -= 1; wp.copy(train.chimney); train.loco.localToWorld(wp); puff(wp, train.moving); }
    sm.pool.forEach(function (p) {
      if (p.life <= 0) return;
      p.life -= dt;
      if (p.life <= 0) { p.s.visible = false; p.s.material.opacity = 0; return; }
      var k = 1 - p.life / p.max;
      p.s.position.addScaledVector(p.vel, dt);
      var sz = 0.7 + k * (p.big ? 2.8 : 2); p.s.scale.set(sz, sz, 1);
      p.s.material.opacity = Math.min(1, (1 - k) * 1.3) * 0.5 * Math.min(1, k * 8);
    });
  }
  function pointAt(d) {
    var u = Math.max(0, Math.min(1, d / level.L));
    return { p: level.curve.getPointAt(u), t: level.curve.getTangentAt(u) };
  }
  function placeTrain(dt) {
    var tmp = new T.Vector3();
    train.cars.forEach(function (c) {
      var d = train.s - c.back, a = pointAt(d), b = pointAt(d + 1.5);
      c.o.position.copy(a.p); c.o.position.y += 0.3;
      tmp.copy(b.p); tmp.y += 0.3; c.o.lookAt(tmp);
    });
    // wheels and rods
    train.dist += train.v * (train.dir || 1) * dt;
    train.wheels.forEach(function (w) { w.o.rotation.x = train.dist / w.r; });
    var ang = train.dist / 0.6;
    train.rods.forEach(function (r, i) { r.position.y = 0.72 + Math.sin(ang + i * Math.PI / 2) * 0.26; r.position.z = 0.3 + Math.cos(ang + i * Math.PI / 2) * 0.26; });
    if (train.caboose.userData.wings) train.caboose.userData.wings.forEach(function (w) { w.rotation.x = Math.sin(clock.elapsedTime * 20) * 0.5; });
  }
  function stepTrain(dt) {
    if (!level) return;
    // the train can also roll backwards (back to the station after 3 mistakes)
    var dist = Math.abs(train.target - train.s), maxV = train.dir < 0 ? 20 : 15, acc = 5.5, dec = 6.5;
    if (train.moving) {
      var vStop = Math.sqrt(Math.max(0, 2 * dec * dist));
      var want = Math.min(maxV, vStop);
      train.v = want > train.v ? Math.min(want, train.v + acc * dt) : want;
      train.s += train.v * train.dir * dt;
      if (dist < 0.05 || train.v < 0.02 && dist < 0.6) {
        train.s = train.target; train.v = 0; train.moving = false;
        emit("arrive", train.targetInfo);
      }
    }
    placeTrain(dt);
    stepSmoke(dt);
    emit("speed", train.v);
  }
  // public: send the train to the next stop (index) or to the castle (-1)
  function goTo(stopIndex) {
    var d = stopIndex >= 0 ? level.stops[stopIndex].d : level.L - 2;
    train.target = d; train.moving = true; train.dir = 1; train.targetInfo = { stop: stopIndex };
    if (stopIndex >= 0) setStopState(stopIndex, "active");
  }
  // roll back to the starting station
  function goBack() {
    train.target = 14; train.moving = true; train.dir = -1; train.targetInfo = { stop: "station" };
  }
  // every word gate back to its waiting colours
  function resetStops() {
    (level ? level.stops : []).forEach(function (s) {
      s.state = "ahead";
      s.hex.material.color.set("#ffcf33"); s.hex.material.emissive.set("#ffb000"); s.hex.material.emissiveIntensity = 0.15;
      s.glow.material.color.set("#ffe37a");
    });
  }

  // ======================================================== CAMERA
  var camTmp = new T.Vector3(), lookTmp = new T.Vector3(), camT = 0;
  function setCamera(mode) { camMode = mode; camT = 0; }
  function stepCamera(dt, t) {
    camT += dt;
    var want = camTmp, look = lookTmp, k = 1 - Math.exp(-dt * 2.4);
    if (!level) return;
    var C = level.castlePos;
    if (camMode === "title" || camMode === "menu") {
      var a = t * 0.05, mid = level.curve.getPointAt(camMode === "menu" ? 0.03 : 0.62);
      if (camMode === "menu") {
        // from the train's side, aimed ahead of it so the train sits right of the menu card
        var co = train.cars[2].o, lp = co.position, fm = new T.Vector3(0, 0, 1).applyQuaternion(co.quaternion), sm = new T.Vector3(fm.z, 0, -fm.x);
        var sway = Math.sin(a * 2) * 3;
        want.copy(lp).addScaledVector(sm, 27 + sway).addScaledVector(fm, 6); want.y += 8;
        look.copy(lp).addScaledVector(fm, 12); look.y += 2.5;
      } else {
        want.set(mid.x + Math.sin(a) * 160, mid.y + 70, mid.z + Math.cos(a) * 160);
        look.set(C.x * 0.6 + mid.x * 0.4, C.y + 12, C.z * 0.6 + mid.z * 0.4);
      }
    } else if (camMode === "chase") {
      var loco = train.cars[0].o, f = new T.Vector3(0, 0, 1).applyQuaternion(loco.quaternion), side = new T.Vector3(f.z, 0, -f.x);
      var carP = train.cars[2].o.position;
      want.copy(carP).addScaledVector(f, -13).addScaledVector(side, 7.5); want.y += 7.5;
      look.copy(loco.position).addScaledVector(f, 9); look.y += 1.5;
    } else if (camMode === "stop") {
      var cp = train.cars[2].o, f2 = new T.Vector3(0, 0, 1).applyQuaternion(cp.quaternion), s2 = new T.Vector3(f2.z, 0, -f2.x);
      want.copy(cp.position).addScaledVector(f2, 6.2).addScaledVector(s2, 6.2); want.y += 3.1;
      look.copy(cp.position).addScaledVector(f2, -0.4); look.y += 3.9;      // the rider sits low in the frame, under the question card
      k = 1 - Math.exp(-dt * 1.8);
    } else if (camMode === "castle") {
      var ang = camT * 0.09 - 0.5, F = level.castleFwd;
      var base = Math.atan2(-F.x, -F.z);
      want.set(C.x + Math.sin(base + ang) * 100, C.y + 44, C.z + Math.cos(base + ang) * 100);
      look.set(C.x, C.y + 30, C.z);
      k = 1 - Math.exp(-dt * 1.2);
    }
    camPos.lerp(want, k); camLook.lerp(look, k);
    camera.position.copy(camPos); camera.lookAt(camLook);
    // keep the camera above the ground
    var gh = heightAt(camera.position.x, camera.position.z) + 2.5;
    if (camera.position.y < gh) { camera.position.y = gh; camPos.y = gh; }
    // shadows follow the action
    var fp = camMode === "castle" ? C : train.cars[1].o.position, sd = level.theme.sunDir;
    sunTarget.position.copy(fp); sun.position.set(fp.x + sd[0] * 160, fp.y + sd[1] * 160, fp.z + sd[2] * 160);
    var sc = sun.shadow.camera, ext = camMode === "castle" ? 70 : 55;
    if (sc.right !== ext) { sc.left = sc.bottom = -ext; sc.right = sc.top = ext; sc.updateProjectionMatrix(); }
    sky.position.copy(camera.position); stars.position.copy(camera.position);
  }
  function snapCamera() { camPos.copy(camera.position); stepCamera(10, clock.elapsedTime); }

  // ======================================================== AVATAR SEAT
  function setAvatar(av) {
    if (avatar) avatarSeat.remove(avatar);
    avatar = av;
    if (av) { AVATAR.setPose(av, "sit"); av.scale.setScalar(0.92); avatarSeat.add(av); }
  }
  var avatarMode = "idle";
  function setAvatarMode(m) { avatarMode = m; }

  // ======================================================== FRAME LOOP
  function frame() {
    var dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime;
    if (level) {
      stepTrain(dt);
      level.anims.forEach(function (f) { f(t, dt); });
      stepCamera(dt, t);
      if (level.castle) level.castle.windows.forEach(function (w) { w.material.emissiveIntensity = 0.5 + (1 - sun.intensity) * 1.2; });
    }
    stepSky(dt);
    if (avatar) AVATAR.animate(avatar, t, avatarMode);
    frameHooks.forEach(function (f) { f(t, dt); });
    renderer.render(scene, camera);
  }
  function on(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); }
  function emit(ev, data) { (listeners[ev] || []).forEach(function (f) { f(data); }); }

  return {
    init: init, buildLevel: buildLevel, goTo: goTo, goBack: goBack, resetStops: resetStops, setStopState: setStopState, setCamera: setCamera, snapCamera: snapCamera,
    setAvatar: setAvatar, setAvatarMode: setAvatarMode, setSky: setSky, on: on, THEMES: THEMES, dotTex: dotTex,
    addHook: function (f) { frameHooks.push(f); }, removeHook: function (f) { frameHooks = frameHooks.filter(function (g) { return g !== f; }); },
    get scene() { return scene; }, get camera() { return camera; }, get level() { return level; }, get train() { return train; },
    get renderer() { return renderer; },
  };
})();
