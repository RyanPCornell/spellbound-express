// ============================================================================
//  SPELLBOUND EXPRESS — 3D AVATAR + ITEMS
//  AVATAR.build(look, equipped) returns a THREE.Group: a rounded, big-headed
//  character made from smooth primitives (no model files), with poses
//  (stand / sit) and little animations (idle, wave, cheer). Items earned at
//  the castle attach to anchors: head, face, hand, back, neck, pet, shoes.
// ============================================================================
window.AVATAR = (function () {
  var T = THREE;

  var SKIN = ["#ffe3cc", "#f8cda8", "#eab48c", "#cf9467", "#a86c49", "#7d4b2f", "#583322"];
  var HAIR = ["#2a1c15", "#5b3621", "#8c5a2c", "#c98a40", "#ecc66b", "#f4e6bc", "#b9432d", "#ef74ad", "#5fa3ea", "#9a68e3", "#58c79a", "#f3f3f3"];
  var EYES = ["#5a3a1c", "#2f6fbf", "#3f9152", "#8158c7", "#4a4a52", "#c08a2a"];
  var CLOTH = ["#ef4f66", "#ff8a3d", "#ffcf33", "#46c486", "#35a6dd", "#5660dd", "#a35ce0", "#ff7cc3", "#f6f2ea", "#38384a", "#6fd8c8", "#c99f62"];
  var HAIR_STYLES = [
    { id: "short", name: "Short" }, { id: "bob", name: "Bob" }, { id: "long", name: "Long" },
    { id: "ponytail", name: "Ponytail" }, { id: "pigtails", name: "Pigtails" }, { id: "buns", name: "Space buns" },
    { id: "curly", name: "Curly" }, { id: "braid", name: "Braid" }, { id: "spiky", name: "Spiky" },
  ];
  var TOPS = [{ id: "tee", name: "T-shirt" }, { id: "hoodie", name: "Hoodie" }, { id: "dress", name: "Dress" },
    { id: "jacket", name: "Jacket" }, { id: "sweater", name: "Striped sweater" }];
  var BOTTOMS = [{ id: "pants", name: "Pants" }, { id: "shorts", name: "Shorts" }, { id: "skirt", name: "Skirt" }];
  var GLASSES = [{ id: "none", name: "None" }, { id: "round", name: "Round" }, { id: "square", name: "Square" },
    { id: "big", name: "Big round" }, { id: "cateye", name: "Cat-eye" }];
  // frame colours: lots of greens first, then the rest of the rainbow
  var GLASS_COLORS = ["#2fb35a", "#7ddc5a", "#1f6e3c", "#3fd6b0", "#3a2a22", "#ef4f66", "#ff7cc3", "#ff8a3d",
    "#ffcf33", "#35a6dd", "#2c3e7a", "#a35ce0", "#38384a", "#f6f2ea"];
  var LENSES = [{ id: "clear", name: "Clear" }, { id: "tinted", name: "Tinted" }];
  var MOUTHS = [{ id: "smile", name: "Smile" }, { id: "grin", name: "Big grin" }, { id: "open", name: "Happy" }];

  var DEFAULT = { glassesColor: 0, lenses: "clear", skin: 1, hair: "ponytail", hairColor: 1, eyes: 1, top: "hoodie", topColor: 6, bottom: "pants",
    bottomColor: 9, shoes: 0, glasses: "none", mouth: "smile" };

  // ---------------------------------------------------------------- helpers
  function std(color, o) {
    o = o || {};
    return new T.MeshStandardMaterial({ color: color, roughness: o.r != null ? o.r : 0.55, metalness: o.m || 0,
      emissive: o.e || "#000000", emissiveIntensity: o.ei != null ? o.ei : 1, transparent: !!o.op, opacity: o.op || 1,
      side: o.ds ? T.DoubleSide : T.FrontSide, flatShading: !!o.flat });
  }
  var GOLD = function () { return std("#ffc93c", { m: 0.85, r: 0.25 }); };
  var SILVER = function () { return std("#dfe6ee", { m: 0.85, r: 0.22 }); };
  function mesh(g, m, x, y, z) { var o = new T.Mesh(g, m); o.position.set(x || 0, y || 0, z || 0); o.castShadow = true; return o; }
  function put(g, o) { g.add(o); return o; }   // add, but return the child
  function group() { var g = new T.Group(); for (var i = 0; i < arguments.length; i++) g.add(arguments[i]); return g; }
  // smooth capsule along Y (LatheGeometry; r128 has no CapsuleGeometry)
  function capsule(r, len, seg) {
    var pts = [], n = 8, i, a;
    for (i = 0; i <= n; i++) { a = -Math.PI / 2 + (i / n) * Math.PI / 2; pts.push(new T.Vector2(Math.max(0.0001, r * Math.cos(a)), -len / 2 + r * Math.sin(a))); }
    for (i = 0; i <= n; i++) { a = (i / n) * Math.PI / 2; pts.push(new T.Vector2(Math.max(0.0001, r * Math.cos(a)), len / 2 + r * Math.sin(a))); }
    return new T.LatheGeometry(pts, seg || 20);
  }
  function sphere(r, w, h) { return new T.SphereGeometry(r, w || 24, h || 18); }
  function starShape(R, r, n) {
    var s = new T.Shape();
    for (var i = 0; i < n * 2; i++) {
      var a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r : R;
      if (i === 0) s.moveTo(Math.cos(a) * rr, -Math.sin(a) * rr); else s.lineTo(Math.cos(a) * rr, -Math.sin(a) * rr);
    }
    return s;
  }
  function heartShape(sz) {
    var s = new T.Shape(), k = sz;
    s.moveTo(0, -0.9 * k);
    s.bezierCurveTo(-1.2 * k, -0.1 * k, -0.9 * k, 0.9 * k, 0, 0.35 * k);
    s.bezierCurveTo(0.9 * k, 0.9 * k, 1.2 * k, -0.1 * k, 0, -0.9 * k);
    return s;
  }
  function extrude(shape, depth, bevel) {
    return new T.ExtrudeGeometry(shape, { depth: depth, bevelEnabled: !!bevel, bevelThickness: bevel || 0, bevelSize: bevel || 0, bevelSegments: 2, curveSegments: 10 });
  }

  // ---------------------------------------------------------------- the body
  function build(look, equipped) {
    look = Object.assign({}, DEFAULT, look || {});
    equipped = equipped || {};
    var skin = std(SKIN[look.skin] || SKIN[1], { r: 0.68 });
    var hairM = std(HAIR[look.hairColor] || HAIR[1], { r: 0.48 });
    var topM = std(CLOTH[look.topColor] || CLOTH[6], { r: 0.75 });
    var botM = std(CLOTH[look.bottomColor] || CLOTH[9], { r: 0.8 });
    var shoeM = std(CLOTH[look.shoes] || CLOTH[0], { r: 0.45 });
    var root = new T.Group(), P = {};
    root.userData.parts = P;

    // ---- legs (hip pivot → thigh, knee pivot → shin + shoe)
    function leg(side) {
      var hip = new T.Group(); hip.position.set(0.14 * side, 0.74, 0);
      var trousers = look.bottom === "pants";
      var thigh = mesh(capsule(0.125, 0.22), look.bottom === "skirt" ? skin : botM, 0, -0.18, 0);
      var knee = new T.Group(); knee.position.set(0, -0.36, 0);
      var shin = mesh(capsule(0.115, 0.2), trousers ? botM : skin, 0, -0.16, 0);
      var shoe = mesh(sphere(0.15), shoeM, 0, -0.33, 0.06); shoe.scale.set(0.95, 0.62, 1.35);
      var sole = mesh(new T.CylinderGeometry(0.14, 0.14, 0.03, 20), std("#f7f3ea", { r: 0.6 }), 0, -0.4, 0.06); sole.scale.set(1, 1, 1.4);
      knee.add(shin, shoe, sole);
      hip.add(thigh, knee);
      root.add(hip);
      return { hip: hip, knee: knee, shoe: shoe };
    }
    P.lLeg = leg(-1); P.rLeg = leg(1);

    // ---- torso + clothing
    var torso = new T.Group(); torso.position.y = 1.0; root.add(torso); P.torso = torso;
    var body = mesh(capsule(0.3, 0.26), topM, 0, 0.04, 0); body.scale.set(1.05, 1, 0.82); torso.add(body);
    var hips = mesh(sphere(0.29), look.bottom === "skirt" || look.top === "dress" ? (look.top === "dress" ? topM : botM) : botM, 0, -0.2, 0);
    hips.scale.set(1.08, 0.62, 0.85); torso.add(hips);
    if (look.top === "dress" || look.bottom === "skirt") {
      var skirt = mesh(new T.CylinderGeometry(0.27, look.top === "dress" ? 0.5 : 0.44, look.top === "dress" ? 0.42 : 0.3, 28, 1, true),
        look.top === "dress" ? topM : botM, 0, look.top === "dress" ? -0.36 : -0.3, 0);
      skirt.material = skirt.material.clone(); skirt.material.side = T.DoubleSide;
      torso.add(skirt);
    }
    if (look.top === "hoodie") {
      var hood = mesh(new T.TorusGeometry(0.2, 0.07, 10, 24), topM, 0, 0.3, -0.14); hood.rotation.x = Math.PI / 2.4; torso.add(hood);
      var pocket = mesh(new T.BoxGeometry(0.34, 0.12, 0.04), topM, 0, -0.06, 0.25); torso.add(pocket);
      [-0.06, 0.06].forEach(function (x) { torso.add(mesh(new T.CylinderGeometry(0.008, 0.008, 0.16, 6), std("#f6f2ea"), x, 0.14, 0.26)); });
    }
    if (look.top === "jacket") {
      torso.add(mesh(new T.BoxGeometry(0.025, 0.5, 0.03), SILVER(), 0, 0.02, 0.255));
      var col = mesh(new T.TorusGeometry(0.17, 0.05, 8, 20, Math.PI), topM, 0, 0.3, 0.02); col.rotation.x = -Math.PI / 2.3; torso.add(col);
    }
    if (look.top === "sweater") {
      var stripeM = std("#f6f2ea", { r: 0.8 });
      [-0.06, 0.12].forEach(function (y) { var st = mesh(new T.CylinderGeometry(0.315, 0.315, 0.06, 28), stripeM, 0, y, 0); st.scale.set(1.05, 1, 0.83); torso.add(st); });
    }
    // neck
    torso.add(mesh(new T.CylinderGeometry(0.09, 0.1, 0.14, 16), skin, 0, 0.38, 0));
    P.neck = new T.Group(); P.neck.position.set(0, 0.3, 0.2); torso.add(P.neck);
    P.back = new T.Group(); P.back.position.set(0, 0.08, -0.25); torso.add(P.back);

    // ---- arms (shoulder pivot → upper, elbow pivot → forearm + hand)
    function arm(side) {
      var sh = new T.Group(); sh.position.set(0.37 * side, 0.26, 0); torso.add(sh);
      var upper = mesh(capsule(0.095, 0.16), topM, 0, -0.13, 0); sh.add(upper);
      var elbow = new T.Group(); elbow.position.set(0, -0.28, 0); sh.add(elbow);
      var longSleeve = look.top !== "tee" && look.top !== "dress";
      elbow.add(mesh(capsule(0.085, 0.14), longSleeve ? topM : skin, 0, -0.11, 0));
      var hand = mesh(sphere(0.1), skin, 0, -0.27, 0.01); elbow.add(hand);
      var grip = new T.Group(); grip.position.set(0, -0.28, 0.06); elbow.add(grip);
      sh.rotation.z = 0.12 * side;
      return { sh: sh, elbow: elbow, grip: grip };
    }
    P.lArm = arm(-1); P.rArm = arm(1);

    // ---- head
    var head = new T.Group(); head.position.y = 1.86; root.add(head); P.head = head;
    var skull = mesh(sphere(0.43, 40, 30), skin); skull.scale.set(1, 0.95, 0.96); head.add(skull);
    [-1, 1].forEach(function (s) { var ear = mesh(sphere(0.09), skin, 0.42 * s, -0.02, 0); ear.scale.set(0.6, 1, 0.8); head.add(ear); });
    // eyes
    var white = std("#ffffff", { r: 0.25 }), iris = std(EYES[look.eyes] || EYES[1], { r: 0.25 }), pupil = std("#15121a", { r: 0.2 });
    var shine = new T.MeshBasicMaterial({ color: "#ffffff" });
    [-1, 1].forEach(function (s) {
      var e = new T.Group(); e.position.set(0.155 * s, 0.02, 0.36); e.rotation.y = 0.18 * s;
      var w = mesh(sphere(0.088), white); w.scale.set(1, 1.15, 0.55); e.add(w);
      var ir = mesh(sphere(0.064), iris, 0, -0.005, 0.032); ir.scale.set(1, 1.1, 0.5); e.add(ir);
      var pu = mesh(sphere(0.036), pupil, 0, -0.005, 0.05); pu.scale.set(1, 1.1, 0.5); e.add(pu);
      e.add(mesh(sphere(0.018, 10, 8), shine, 0.025, 0.03, 0.065));
      var brow = mesh(capsule(0.016, 0.08, 8), hairM, 0, 0.13, 0.03); brow.rotation.z = Math.PI / 2 + 0.12 * s; e.add(brow);
      head.add(e);
      var cheek = mesh(new T.CircleGeometry(0.06, 20), std("#ff8fa3", { op: 0.45, r: 1 }), 0.25 * s, -0.11, 0.355);
      cheek.rotation.y = 0.55 * s; head.add(cheek);
    });
    var nose = mesh(sphere(0.035), skin, 0, -0.07, 0.42); nose.scale.set(1.1, 0.8, 0.7); head.add(nose);
    var mouthM = std("#8e2b3a", { r: 0.5 });
    if (look.mouth === "open") {
      var mo = mesh(new T.CircleGeometry(0.07, 24, Math.PI, Math.PI), mouthM, 0, -0.17, 0.405); mo.rotation.x = -0.15; head.add(mo);
      var tongue = mesh(new T.CircleGeometry(0.035, 16, Math.PI, Math.PI), std("#ff7f8f"), 0, -0.21, 0.408); head.add(tongue);
    } else {
      var arc = mesh(new T.TorusGeometry(look.mouth === "grin" ? 0.085 : 0.06, 0.014, 8, 20, Math.PI), mouthM, 0, -0.14, 0.4);
      arc.rotation.z = Math.PI; arc.rotation.x = -0.25; head.add(arc);
    }
    buildHair(head, look.hair, hairM);
    if (look.glasses !== "none") head.add(buildGlasses(look.glasses, GLASS_COLORS[look.glassesColor] || GLASS_COLORS[0], look.lenses === "tinted"));
    P.face = new T.Group(); head.add(P.face);
    P.top = new T.Group(); P.top.position.y = 0.36; head.add(P.top);

    // pet floats beside the avatar
    P.pet = new T.Group(); P.pet.position.set(1.15, 1.6, 0.25); root.add(P.pet);

    // ---- equipped items
    Object.keys(equipped).forEach(function (slot) {
      var it = ITEM_BY_ID[equipped[slot]];
      if (!it || it.slot !== slot) return;
      if (slot === "shoes") { it.apply(P, look); return; }
      var anchor = { head: P.top, face: P.face, hand: P.rArm.grip, back: P.back, neck: P.neck, pet: P.pet }[slot];
      var obj = it.build(look);
      obj.userData.item = it.id;
      anchor.add(obj);
      if (slot === "head" && it.hidesHair) root.userData.hideHair = true;
    });
    if (equipped.hand && ITEM_BY_ID[equipped.hand]) {
      root.userData.holding = true;
      P.rArm.elbow.rotation.x = -0.9; P.rArm.sh.rotation.x = -0.15;
      P.rArm.grip.rotation.x = 1.05;          // held items stand upright in the bent hand
    }
    root.traverse(function (o) { if (o.isMesh) { o.castShadow = true; } });
    root.userData.look = look;
    return root;
  }

  // ---------------------------------------------------------------- hair
  function buildHair(head, style, m) {
    var r = 0.43;
    function cap(scale, thetaLen) {
      var c = mesh(new T.SphereGeometry(r * (scale || 1.07), 40, 24, 0, Math.PI * 2, 0, Math.PI * (thetaLen || 0.45)), m);
      c.scale.set(1.02, 1, 1.02); c.rotation.x = -0.18; return c;
    }
    function shell(scale, thetaLen) {   // goes around the back and sides, open at the face
      var g = new T.SphereGeometry(r * scale, 40, 24, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9, 0.15, Math.PI * thetaLen);
      var s = mesh(g, m); s.material = m.clone(); s.material.side = T.DoubleSide; return s;
    }
    function fringe() {
      var g = new T.Group();
      for (var i = -2; i <= 2; i++) {
        var b = mesh(sphere(0.11), m, i * 0.1, 0.25 - Math.abs(i) * 0.02, 0.31 - Math.abs(i) * 0.03);
        b.scale.set(1.1, 0.7, 0.8); g.add(b);
      }
      return g;
    }
    if (style === "curly") {
      var g = new T.Group();
      for (var i = 0; i < 70; i++) {
        var th = Math.acos(1 - Math.random() * 1.15), ph = Math.random() * Math.PI * 2;
        var x = Math.sin(th) * Math.cos(ph), z = Math.sin(th) * Math.sin(ph), y = Math.cos(th);
        if (z > 0.55 && y < 0.55) continue;           // keep the face clear
        g.add(mesh(sphere(0.13 + Math.random() * 0.05, 14, 10), m, x * 0.47, y * 0.47 + 0.04, z * 0.47 - 0.02));
      }
      head.add(g); return;
    }
    head.add(cap());
    if (style !== "spiky") head.add(fringe());
    if (style === "short") {
      var back = shell(1.07, 0.55); head.add(back);
    } else if (style === "bob") {
      var b = shell(1.12, 0.66); b.scale.set(1.04, 1, 1.04); head.add(b);
    } else if (style === "long") {
      var l = shell(1.12, 0.7); head.add(l);
      var curtain = mesh(capsule(0.3, 0.55), m, 0, -0.55, -0.2); curtain.scale.set(1.25, 1, 0.45); head.add(curtain);
    } else if (style === "ponytail") {
      head.add(shell(1.08, 0.58));
      var tie = mesh(new T.TorusGeometry(0.06, 0.025, 8, 16), std("#ff5c8a"), 0, 0.2, -0.43); head.add(tie);
      var tail = mesh(capsule(0.1, 0.38), m, 0, -0.08, -0.52); tail.rotation.x = 0.35; head.add(tail);
    } else if (style === "pigtails") {
      head.add(shell(1.08, 0.58));
      [-1, 1].forEach(function (s) {
        var t = mesh(capsule(0.1, 0.32), m, 0.46 * s, -0.25, -0.12); t.rotation.z = 0.35 * s; head.add(t);
        head.add(mesh(new T.TorusGeometry(0.055, 0.022, 8, 16), std("#ffd23f"), 0.43 * s, -0.03, -0.12));
      });
    } else if (style === "buns") {
      head.add(shell(1.08, 0.58));
      [-1, 1].forEach(function (s) { head.add(mesh(sphere(0.17), m, 0.27 * s, 0.36, -0.06)); });
    } else if (style === "braid") {
      head.add(shell(1.08, 0.6));
      for (var k = 0; k < 6; k++) {
        var seg = mesh(sphere(0.09 - k * 0.006), m, Math.sin(k) * 0.02, -0.05 - k * 0.13, -0.47 - k * 0.02);
        seg.scale.set(1, 1.15, 0.9); head.add(seg);
      }
      head.add(mesh(new T.TorusGeometry(0.045, 0.02, 8, 14), std("#35a6dd"), 0, -0.8, -0.57));
    } else if (style === "spiky") {
      head.add(shell(1.07, 0.55));
      for (var j = 0; j < 9; j++) {
        var a = (j / 9) * Math.PI * 2, sp = mesh(new T.ConeGeometry(0.09, 0.26, 10), m, Math.cos(a) * 0.22, 0.4, Math.sin(a) * 0.2 - 0.04);
        sp.rotation.z = -Math.cos(a) * 0.55; sp.rotation.x = Math.sin(a) * 0.55; head.add(sp);
      }
    }
  }

  function buildGlasses(kind, color, tinted) {
    var g = new T.Group(), frame = std(color, { r: 0.3, m: 0.1 });
    var lens = std(tinted ? color : "#bfe6ff", { op: tinted ? 0.55 : 0.25, r: 0.05 });
    var r = kind === "big" ? 0.13 : 0.1, tube = kind === "big" ? 0.022 : 0.018;
    [-1, 1].forEach(function (s) {
      var ring = kind === "square" ? new T.TorusGeometry(0.11, tube, 4, 4) : new T.TorusGeometry(r, tube, 10, 28);
      var o = mesh(ring, frame, 0.155 * s, 0.02, 0.43);
      if (kind === "square") o.rotation.z = Math.PI / 4;
      if (kind === "cateye") { o.scale.set(1.12, 0.82, 1); o.rotation.z = -0.25 * s; }
      g.add(o);
      var l = mesh(new T.CircleGeometry(r * 0.95, 24), lens, 0.155 * s, 0.02, 0.428);
      if (kind === "cateye") { l.scale.set(1.12, 0.82, 1); l.rotation.z = -0.25 * s; }
      g.add(l);
      if (kind === "cateye") { var wing = mesh(new T.ConeGeometry(0.035, 0.09, 8), frame, 0.27 * s, 0.09, 0.42); wing.rotation.z = -1.0 * s; g.add(wing); }
      var arm = mesh(new T.BoxGeometry(0.014, 0.014, 0.36), frame, (kind === "big" ? 0.285 : 0.255) * s, 0.03, 0.26); g.add(arm);
    });
    put(g, mesh(new T.CylinderGeometry(0.013, 0.013, kind === "big" ? 0.06 : 0.1, 6), frame, 0, 0.04, 0.44)).rotation.z = Math.PI / 2;
    return g;
  }

  // ---------------------------------------------------------------- poses
  function setPose(av, pose) {
    var P = av.userData.parts;
    var sit = pose === "sit";
    [P.lLeg, P.rLeg].forEach(function (L) { L.hip.rotation.x = sit ? -Math.PI / 2 : 0; L.knee.rotation.x = sit ? Math.PI / 2 : 0; });
    av.userData.pose = pose;
  }
  // idle breathing / looking around; "wave" (right arm); "cheer" (both arms, bouncing)
  function animate(av, t, mode) {
    var P = av.userData.parts;
    if (!P) return;
    var holding = !!(av.userData.holding);
    P.torso.scale.y = 1 + Math.sin(t * 2.2) * 0.012;
    P.head.rotation.y = Math.sin(t * 0.7) * 0.18;
    P.head.rotation.z = Math.sin(t * 1.1) * 0.04;
    var lz = 0.12, rz = -0.12, lx = 0, rx = holding ? -0.15 : 0, rEl = holding ? -0.9 : 0, lEl = 0, bounce = 0;
    if (mode === "wave") { rz = -2.5 + Math.sin(t * 9) * 0.35; rEl = -0.4; rx = 0; }
    if (mode === "cheer") {
      lz = 2.15 + Math.sin(t * 10) * 0.25; rz = -2.15 - Math.sin(t * 10) * 0.25; rEl = lEl = 0; rx = 0;
      bounce = Math.abs(Math.sin(t * 6)) * 0.18;
    }
    P.lArm.sh.rotation.set(lx, 0, lz); P.rArm.sh.rotation.set(rx, 0, rz);
    P.lArm.elbow.rotation.x = lEl; P.rArm.elbow.rotation.x = rEl;
    if (av.userData.pose !== "sit") av.position.y = (av.userData.baseY || 0) + bounce;
    // wings flap, pet bobs and circles
    P.back.children.forEach(function (c) {
      if (c.userData.flap) c.children.forEach(function (w, i) { w.rotation.y = (w.position.x > 0 ? 1 : -1) * (0.45 + Math.sin(t * 6) * 0.25); });
    });
    P.pet.position.y = 1.6 + Math.sin(t * 2.4) * 0.1;
    P.pet.rotation.y = Math.sin(t * 0.8) * 0.5;
    av.traverse(function (o) { if (o.userData.spin) o.rotation[o.userData.spinAxis || "y"] += o.userData.spin; });
  }

  // ======================================================== THE ITEM CATALOG
  // Each: {id, name, slot, cat, build(look) → Group in the anchor's space}
  var CATS = { clothes: "👕 Clothes", fun: "🎈 Fun", science: "🔬 Science", math: "📐 Math", magic: "✨ Magic" };
  var ITEMS = [];
  function item(id, name, slot, cat, build, extra) { ITEMS.push(Object.assign({ id: id, name: name, slot: slot, cat: cat, build: build }, extra || {})); }

  // ---- HEAD (anchored at the top of the head)
  item("crown", "Golden Crown", "head", "magic", function () {
    var g = group(mesh(new T.CylinderGeometry(0.24, 0.26, 0.12, 24, 1, true), Object.assign(GOLD(), { side: T.DoubleSide })));
    for (var i = 0; i < 6; i++) {
      var a = i / 6 * Math.PI * 2;
      g.add(mesh(new T.ConeGeometry(0.05, 0.14, 8), GOLD(), Math.cos(a) * 0.24, 0.12, Math.sin(a) * 0.24));
      g.add(mesh(sphere(0.03, 10, 8), std(["#ff3f6c", "#3fd0ff", "#7bff6a"][i % 3], { m: 0.3, r: 0.1 }), Math.cos(a) * 0.25, 0.01, Math.sin(a) * 0.25));
    }
    g.position.y = 0.06; g.rotation.x = -0.12; return g;
  });
  item("wizard", "Wizard Hat", "head", "magic", function () {
    var m = std("#4b2c9a", { r: 0.7 });
    var cone = mesh(new T.ConeGeometry(0.32, 0.8, 28), m, 0, 0.42, 0); cone.rotation.z = 0.12;
    var brim = mesh(new T.CylinderGeometry(0.55, 0.55, 0.04, 32), m, 0, 0.02, 0);
    var band = mesh(new T.CylinderGeometry(0.31, 0.32, 0.08, 28), std("#ffd23f", { m: 0.4 }), 0, 0.08, 0);
    var g = group(brim, band, cone);
    for (var i = 0; i < 5; i++) { var st = mesh(extrude(starShape(0.05, 0.022, 5), 0.01), std("#ffe37a", { e: "#ffd23f", ei: 0.6 }), Math.cos(i) * 0.2, 0.25 + i * 0.1, 0.24 - i * 0.03); g.add(st); }
    g.rotation.x = -0.1; return g;
  });
  item("tophat", "Top Hat", "head", "clothes", function () {
    var m = std("#202028", { r: 0.4 });
    return group(mesh(new T.CylinderGeometry(0.5, 0.5, 0.04, 32), m, 0, 0.02, 0), mesh(new T.CylinderGeometry(0.28, 0.3, 0.5, 28), m, 0, 0.28, 0),
      mesh(new T.CylinderGeometry(0.305, 0.305, 0.08, 28), std("#e94f64"), 0, 0.1, 0));
  });
  item("party", "Party Hat", "head", "fun", function () {
    var c = mesh(new T.ConeGeometry(0.22, 0.5, 24), std("#ff7cc3", { r: 0.6 }), 0, 0.26, 0);
    var g = group(c, mesh(sphere(0.07), std("#ffd23f"), 0, 0.53, 0));
    [0.12, 0.26, 0.4].forEach(function (y, i) { var r = 0.22 * (1 - (y + 0.0) / 0.5) + 0.02; put(g, mesh(new T.TorusGeometry(r, 0.018, 6, 20), std(["#35a6dd", "#ffd23f", "#46c486"][i]), 0, y + 0.01, 0)).rotation.x = Math.PI / 2; });
    g.rotation.z = -0.25; g.position.x = 0.08; return g;
  });
  item("propeller", "Propeller Beanie", "head", "fun", function () {
    var g = new T.Group();
    var dome = mesh(new T.SphereGeometry(0.4, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), std("#35a6dd", { r: 0.7 }), 0, -0.12, 0);
    g.add(dome);
    for (var i = 0; i < 4; i++) { var seg = mesh(new T.SphereGeometry(0.405, 8, 16, i * Math.PI / 2, Math.PI / 4, 0, Math.PI / 2), std(["#ef4f66", "#ffcf33"][i % 2], { r: 0.7 }), 0, -0.12, 0); g.add(seg); }
    g.add(mesh(new T.CylinderGeometry(0.02, 0.02, 0.12, 8), SILVER(), 0, 0.33, 0));
    var prop = new T.Group(); prop.position.y = 0.4;
    [0, 1].forEach(function (k) { var bl = mesh(new T.BoxGeometry(0.5, 0.02, 0.09), std(["#ef4f66", "#46c486"][k]), 0, 0, 0); bl.rotation.y = k * Math.PI / 2; prop.add(bl); });
    prop.userData.spin = 0.25; g.add(prop); return g;
  });
  item("gradcap", "Graduation Cap", "head", "math", function () {
    var m = std("#1d2140", { r: 0.6 });
    var g = group(mesh(new T.CylinderGeometry(0.3, 0.32, 0.16, 24), m, 0, 0.04, 0), mesh(new T.BoxGeometry(0.72, 0.035, 0.72), m, 0, 0.14, 0));
    g.children[1].rotation.y = Math.PI / 4;
    g.add(mesh(sphere(0.03), GOLD(), 0, 0.17, 0));
    var tas = mesh(new T.CylinderGeometry(0.012, 0.012, 0.32, 6), GOLD(), 0.36, 0.0, 0); g.add(tas);
    g.add(mesh(new T.ConeGeometry(0.035, 0.09, 8), GOLD(), 0.36, -0.18, 0));
    return g;
  });
  item("flowercrown", "Flower Crown", "head", "clothes", function () {
    var g = group(mesh(new T.TorusGeometry(0.33, 0.025, 8, 40), std("#5aa645"), 0, 0, 0));
    g.children[0].rotation.x = Math.PI / 2;
    var cols = ["#ff7cc3", "#ffd23f", "#ffffff", "#a35ce0", "#ff8a3d"];
    for (var i = 0; i < 12; i++) {
      var a = i / 12 * Math.PI * 2, f = new T.Group(); f.position.set(Math.cos(a) * 0.33, 0.02, Math.sin(a) * 0.33);
      for (var p = 0; p < 5; p++) { var pa = p / 5 * Math.PI * 2; f.add(mesh(sphere(0.035, 10, 8), std(cols[i % 5]), Math.cos(pa) * 0.04, 0.03, Math.sin(pa) * 0.04)); }
      f.add(mesh(sphere(0.025, 10, 8), std("#ffcf33"), 0, 0.05, 0));
      g.add(f);
    }
    g.position.y = -0.03; g.rotation.x = -0.15; return g;
  });
  item("chef", "Chef's Hat", "head", "fun", function () {
    var w = std("#fbfbf7", { r: 0.85 });
    var g = group(mesh(new T.CylinderGeometry(0.3, 0.3, 0.2, 24), w, 0, 0.06, 0));
    [[0, 0.32, 0, 0.26], [-0.16, 0.26, 0.05, 0.18], [0.16, 0.26, 0.05, 0.18], [0, 0.27, -0.15, 0.18]].forEach(function (b) { g.add(mesh(sphere(b[3]), w, b[0], b[1], b[2])); });
    return g;
  });
  item("cowboy", "Cowboy Hat", "head", "clothes", function () {
    var m = std("#a8693a", { r: 0.75 });
    var brim = mesh(new T.CylinderGeometry(0.62, 0.62, 0.035, 40), m, 0, 0.02, 0); brim.scale.set(1, 1, 0.82);
    var crown = mesh(sphere(0.3), m, 0, 0.18, 0); crown.scale.set(1, 0.8, 0.9);
    return group(brim, crown, mesh(new T.CylinderGeometry(0.3, 0.3, 0.06, 24), std("#3a2316"), 0, 0.08, 0));
  });
  item("bunnyears", "Bunny Ears", "head", "fun", function () {
    var g = new T.Group(), w = std("#fbfbf7", { r: 0.8 }), pink = std("#ffb3c7", { r: 0.8 });
    g.add(mesh(new T.TorusGeometry(0.36, 0.025, 8, 30, Math.PI), std("#ff7cc3"), 0, -0.05, 0));
    [-1, 1].forEach(function (s) {
      var e = mesh(capsule(0.08, 0.36), w, 0.16 * s, 0.3, 0); e.scale.z = 0.5; e.rotation.z = -0.18 * s; g.add(e);
      var inner = mesh(capsule(0.045, 0.3), pink, 0.16 * s, 0.3, 0.035); inner.scale.z = 0.3; inner.rotation.z = -0.18 * s; g.add(inner);
    });
    return g;
  });
  item("headphones", "Headphones", "head", "fun", function () {
    var m = std("#5660dd", { r: 0.35 });
    var band = mesh(new T.TorusGeometry(0.46, 0.04, 10, 30, Math.PI), m, 0, -0.32, 0);
    var g = group(band);
    [-1, 1].forEach(function (s) { var c = mesh(new T.CylinderGeometry(0.12, 0.12, 0.09, 24), std("#ffcf33", { r: 0.35 }), 0.46 * s, -0.36, 0); c.rotation.z = Math.PI / 2; g.add(c); });
    return g;
  });
  item("helmet", "Astronaut Helmet", "head", "science", function () {
    var glass = new T.MeshPhysicalMaterial({ color: "#cfefff", roughness: 0.05, metalness: 0, transparent: true, opacity: 0.28, clearcoat: 1 });
    var g = group(mesh(sphere(0.62, 40, 30), glass, 0, -0.38, 0.02));
    var ring = mesh(new T.TorusGeometry(0.42, 0.06, 12, 36), SILVER(), 0, -0.88, 0); ring.rotation.x = Math.PI / 2; g.add(ring);
    g.add(mesh(sphere(0.05), std("#ef4f66", { e: "#ef4f66", ei: 0.8 }), 0.3, -0.05, 0.45));
    return g;
  });

  // ---- FACE (anchored at the head centre)
  item("starglasses", "Star Glasses", "face", "fun", function () {
    var g = new T.Group(), m = std("#ffcf33", { r: 0.3, m: 0.3 });
    [-1, 1].forEach(function (s) { var st = mesh(extrude(starShape(0.13, 0.06, 5), 0.02), m, 0.16 * s, 0.02, 0.43); g.add(st); });
    g.add(mesh(new T.BoxGeometry(0.08, 0.02, 0.02), m, 0, 0.05, 0.44));
    return g;
  });
  item("heartglasses", "Heart Glasses", "face", "fun", function () {
    var g = new T.Group(), m = std("#ff3f7f", { r: 0.25 });
    [-1, 1].forEach(function (s) { var h = mesh(extrude(heartShape(0.12), 0.02), m, 0.16 * s, 0.03, 0.43); g.add(h); });
    g.add(mesh(new T.BoxGeometry(0.08, 0.02, 0.02), m, 0, 0.06, 0.44));
    return g;
  });
  item("goggles", "Lab Goggles", "face", "science", function () {
    var g = new T.Group(), band = std("#46c486", { r: 0.6 });
    var strap = mesh(new T.CylinderGeometry(0.44, 0.44, 0.07, 32, 1, true), Object.assign(band, { side: T.DoubleSide }), 0, 0.05, 0); g.add(strap);
    [-1, 1].forEach(function (s) {
      var rim = mesh(new T.CylinderGeometry(0.12, 0.12, 0.08, 24), std("#2c3340", { r: 0.4 }), 0.15 * s, 0.03, 0.41); rim.rotation.x = Math.PI / 2; g.add(rim);
      var l = mesh(new T.CircleGeometry(0.1, 24), std("#9ff3ff", { op: 0.5, r: 0.05, e: "#5fe3ff", ei: 0.2 }), 0.15 * s, 0.03, 0.455); g.add(l);
    });
    return g;
  });
  item("monocle", "Monocle", "face", "clothes", function () {
    var g = group(mesh(new T.TorusGeometry(0.1, 0.014, 10, 28), GOLD(), 0.155, 0.02, 0.43),
      mesh(new T.CircleGeometry(0.09, 24), std("#e6f6ff", { op: 0.3 }), 0.155, 0.02, 0.428));
    var chain = mesh(new T.TorusGeometry(0.18, 0.006, 6, 30, Math.PI * 0.7), GOLD(), 0.25, -0.15, 0.38); chain.rotation.z = -1.9; g.add(chain);
    return g;
  });
  item("3dglasses", "3-D Glasses", "face", "science", function () {
    var g = new T.Group(), fr = std("#f6f2ea", { r: 0.6 });
    g.add(mesh(new T.BoxGeometry(0.58, 0.16, 0.03), fr, 0, 0.03, 0.43));
    g.add(mesh(new T.BoxGeometry(0.2, 0.11, 0.035), std("#ff3a3a", { op: 0.75, r: 0.1 }), -0.15, 0.03, 0.44));
    g.add(mesh(new T.BoxGeometry(0.2, 0.11, 0.035), std("#2fa7ff", { op: 0.75, r: 0.1 }), 0.15, 0.03, 0.44));
    return g;
  });

  // ---- HAND (held in the right hand)
  item("wand", "Magic Wand", "hand", "magic", function () {
    var g = group(mesh(new T.CylinderGeometry(0.018, 0.022, 0.5, 10), std("#3a2316", { r: 0.5 }), 0, 0.2, 0));
    var st = mesh(extrude(starShape(0.1, 0.045, 5), 0.03, 0.01), std("#ffe37a", { e: "#ffd23f", ei: 1.2 }), 0, 0.5, -0.015); g.add(st);
    st.userData.spin = 0.04; st.userData.spinAxis = "y";
    return g;
  }, { glow: "#ffe37a" });
  item("beaker", "Bubbling Beaker", "hand", "science", function () {
    var glass = new T.MeshPhysicalMaterial({ color: "#e8fbff", roughness: 0.05, transparent: true, opacity: 0.35, clearcoat: 1, side: T.DoubleSide });
    var pts = [new T.Vector2(0.001, 0), new T.Vector2(0.13, 0), new T.Vector2(0.13, 0.02), new T.Vector2(0.06, 0.18), new T.Vector2(0.05, 0.3), new T.Vector2(0.065, 0.32)];
    var g = group(mesh(new T.LatheGeometry(pts, 28), glass, 0, 0, 0));
    var lp = [new T.Vector2(0.001, 0.01), new T.Vector2(0.12, 0.01), new T.Vector2(0.07, 0.15), new T.Vector2(0.001, 0.15)];
    g.add(mesh(new T.LatheGeometry(lp, 24), std("#5dff8f", { e: "#2bdc6a", ei: 0.9, op: 0.85 }), 0, 0, 0));
    for (var i = 0; i < 4; i++) { var b = mesh(sphere(0.025 + i * 0.006, 10, 8), std("#b6ffd0", { e: "#5dff8f", ei: 0.6, op: 0.8 }), (i % 2 ? 0.02 : -0.02), 0.36 + i * 0.07, 0); g.add(b); }
    return g;
  });
  item("testtube", "Test Tube", "hand", "science", function () {
    var glass = new T.MeshPhysicalMaterial({ color: "#e8fbff", roughness: 0.05, transparent: true, opacity: 0.35, clearcoat: 1 });
    return group(mesh(capsule(0.045, 0.34), glass, 0, 0.17, 0), mesh(capsule(0.04, 0.16), std("#ff5ab0", { e: "#ff2f9a", ei: 0.7 }), 0, 0.06, 0),
      mesh(new T.TorusGeometry(0.05, 0.012, 8, 16), SILVER(), 0, 0.37, 0)).rotateX(Math.PI / 2 - 0.2);
  });
  item("telescope", "Telescope", "hand", "science", function () {
    var g = new T.Group();
    var a = mesh(new T.CylinderGeometry(0.07, 0.09, 0.45, 20), std("#2f6fbf", { r: 0.35 }), 0, 0.2, 0); g.add(a);
    g.add(mesh(new T.CylinderGeometry(0.05, 0.06, 0.25, 20), GOLD(), 0, -0.1, 0));
    put(g, mesh(new T.TorusGeometry(0.09, 0.015, 8, 20), GOLD(), 0, 0.42, 0)).rotation.x = Math.PI / 2;
    g.rotation.x = -1.1; return g;
  });
  item("magnifier", "Magnifying Glass", "hand", "science", function () {
    var g = group(mesh(new T.CylinderGeometry(0.03, 0.035, 0.24, 12), std("#7b4a2a", { r: 0.5 }), 0, 0.1, 0));
    g.add(mesh(new T.TorusGeometry(0.13, 0.025, 12, 32), GOLD(), 0, 0.36, 0));
    g.add(mesh(new T.CircleGeometry(0.12, 28), new T.MeshPhysicalMaterial({ color: "#dff6ff", transparent: true, opacity: 0.35, roughness: 0, clearcoat: 1, side: T.DoubleSide }), 0, 0.36, 0));
    return g;
  });
  item("microscope", "Microscope", "hand", "science", function () {
    var w = std("#f6f2ea", { r: 0.4 }), d = std("#2c3340", { r: 0.4 });
    var g = group(mesh(new T.BoxGeometry(0.22, 0.04, 0.16), d, 0, 0, 0), mesh(new T.BoxGeometry(0.05, 0.28, 0.05), w, -0.06, 0.15, 0),
      mesh(new T.BoxGeometry(0.16, 0.02, 0.12), d, 0.02, 0.1, 0));
    var tube = mesh(new T.CylinderGeometry(0.035, 0.045, 0.22, 16), w, 0.02, 0.28, 0); tube.rotation.z = -0.35; g.add(tube);
    g.add(mesh(new T.CylinderGeometry(0.02, 0.02, 0.05, 12), SILVER(), 0.08, 0.15, 0));
    g.position.y = 0.05; return g;
  });
  item("calculator", "Calculator", "hand", "math", function () {
    var g = group(mesh(new T.BoxGeometry(0.22, 0.3, 0.04), std("#38384a", { r: 0.4 }), 0, 0.12, 0));
    g.add(mesh(new T.BoxGeometry(0.17, 0.07, 0.01), std("#9be8a2", { e: "#6fd07a", ei: 0.4 }), 0, 0.21, 0.025));
    for (var r = 0; r < 4; r++) for (var c = 0; c < 3; c++) g.add(mesh(new T.BoxGeometry(0.04, 0.03, 0.015), std(c === 2 ? "#ff8a3d" : "#e8e4dc"), -0.055 + c * 0.055, 0.14 - r * 0.045, 0.025));
    g.rotation.x = -0.6; return g;
  });
  item("ruler", "Rainbow Ruler", "hand", "math", function () {
    var g = new T.Group(), cols = ["#ef4f66", "#ff8a3d", "#ffcf33", "#46c486", "#35a6dd", "#a35ce0"];
    cols.forEach(function (c, i) { g.add(mesh(new T.BoxGeometry(0.08, 0.1, 0.012), std(c, { r: 0.4 }), 0, 0.05 + i * 0.1, 0)); });
    for (var t = 0; t < 12; t++) g.add(mesh(new T.BoxGeometry(t % 2 ? 0.02 : 0.04, 0.006, 0.014), std("#1d2140"), 0.03, 0.03 + t * 0.05, 0.002));
    return g;
  });
  item("protractor", "Protractor", "hand", "math", function () {
    var g = group(mesh(new T.CircleGeometry(0.2, 32, 0, Math.PI), std("#7fd6ff", { op: 0.6, r: 0.1, ds: true }), 0, 0.1, 0));
    for (var i = 0; i <= 18; i++) { var a = i / 18 * Math.PI; put(g, mesh(new T.BoxGeometry(0.006, i % 3 ? 0.025 : 0.05, 0.004), std("#1d2140"), Math.cos(a) * 0.18, 0.1 + Math.sin(a) * 0.18, 0.003)).rotation.z = a - Math.PI / 2; }
    return g;
  });
  item("pencil", "Giant Pencil", "hand", "math", function () {
    var g = group(mesh(new T.CylinderGeometry(0.045, 0.045, 0.5, 6), std("#ffcf33", { r: 0.5 }), 0, 0.25, 0),
      mesh(new T.ConeGeometry(0.045, 0.1, 6), std("#f1d0a3"), 0, 0.55, 0), mesh(new T.ConeGeometry(0.016, 0.035, 6), std("#2c2c34"), 0, 0.59, 0),
      mesh(new T.CylinderGeometry(0.047, 0.047, 0.05, 12), SILVER(), 0, -0.02, 0), mesh(new T.CylinderGeometry(0.045, 0.045, 0.06, 12), std("#ff8fb0"), 0, -0.07, 0));
    return g;
  });
  item("balloon", "Heart Balloon", "hand", "fun", function () {
    var g = group(mesh(new T.CylinderGeometry(0.004, 0.004, 0.9, 4), std("#ffffff"), 0, 0.45, 0));
    var h = mesh(extrude(heartShape(0.22), 0.14, 0.05), std("#ff3f7f", { r: 0.25 }), 0, 1.08, -0.07); g.add(h);
    return g;
  });
  item("icecream", "Ice-Cream Cone", "hand", "fun", function () {
    var c = mesh(new T.ConeGeometry(0.09, 0.26, 16), std("#d9a35a", { r: 0.8 }), 0, 0.05, 0); c.rotation.x = Math.PI;
    return group(c, mesh(sphere(0.1), std("#ffb3d1", { r: 0.7 }), 0, 0.2, 0), mesh(sphere(0.085), std("#8fd6ff", { r: 0.7 }), 0, 0.33, 0),
      mesh(sphere(0.03), std("#e8203a"), 0, 0.43, 0));
  });
  item("lollipop", "Swirl Lollipop", "hand", "fun", function () {
    var g = group(mesh(new T.CylinderGeometry(0.012, 0.012, 0.35, 8), std("#ffffff"), 0, 0.17, 0));
    var disk = mesh(new T.CylinderGeometry(0.16, 0.16, 0.04, 32), std("#ff7cc3", { r: 0.25 }), 0, 0.45, 0); disk.rotation.x = Math.PI / 2; g.add(disk);
    for (var i = 1; i <= 3; i++) g.add(mesh(new T.TorusGeometry(i * 0.045, 0.012, 6, 28), std(["#ffffff", "#ffcf33", "#35a6dd"][i - 1]), 0, 0.45, 0.022));
    return g;
  });
  item("rocket", "Toy Rocket", "hand", "science", function () {
    var w = std("#f6f2ea", { r: 0.35 }), red = std("#ef4f66", { r: 0.35 });
    var g = group(mesh(capsule(0.08, 0.22), w, 0, 0.2, 0), mesh(new T.ConeGeometry(0.08, 0.16, 20), red, 0, 0.42, 0),
      mesh(new T.CircleGeometry(0.04, 16), std("#35a6dd", { e: "#35a6dd", ei: 0.4 }), 0, 0.24, 0.081));
    for (var i = 0; i < 3; i++) { var a = i / 3 * Math.PI * 2, f = mesh(new T.BoxGeometry(0.015, 0.1, 0.09), red, Math.cos(a) * 0.08, 0.06, Math.sin(a) * 0.08); f.rotation.y = -a; g.add(f); }
    put(g, mesh(new T.ConeGeometry(0.05, 0.12, 12), std("#ffb03a", { e: "#ff8a1a", ei: 1.3 }), 0, -0.02, 0)).rotation.x = Math.PI;
    return g;
  });
  item("net", "Butterfly Net", "hand", "fun", function () {
    var g = group(mesh(new T.CylinderGeometry(0.015, 0.015, 0.8, 8), std("#c99f62"), 0, 0.3, 0));
    g.add(mesh(new T.TorusGeometry(0.14, 0.012, 8, 24), SILVER(), 0, 0.82, 0));
    var bag = mesh(new T.ConeGeometry(0.14, 0.25, 20, 1, true), std("#f6f2ea", { op: 0.55, ds: true }), 0, 0.82, -0.12); bag.rotation.x = Math.PI / 2; g.add(bag);
    return g;
  });
  item("paintbrush", "Paintbrush", "hand", "fun", function () {
    return group(mesh(new T.CylinderGeometry(0.02, 0.028, 0.42, 10), std("#2f6fbf", { r: 0.4 }), 0, 0.15, 0), mesh(new T.CylinderGeometry(0.03, 0.026, 0.06, 10), SILVER(), 0, 0.38, 0),
      mesh(new T.ConeGeometry(0.035, 0.12, 10), std("#ef4f66", { r: 0.6 }), 0, 0.47, 0));
  });

  // ---- BACK
  item("cape", "Hero Cape", "back", "clothes", function () {
    var g = new T.PlaneGeometry(0.75, 1.05, 6, 8), pos = g.attributes.position;
    for (var i = 0; i < pos.count; i++) { var y = pos.getY(i); pos.setX(i, pos.getX(i) * (0.75 + (0.5 - y) * 0.5)); pos.setZ(i, -Math.pow(0.5 - y, 2) * 0.25); }
    g.computeVertexNormals();
    var c = mesh(g, std("#e8203a", { ds: true, r: 0.6 }), 0, -0.4, -0.02);
    return group(c, mesh(new T.TorusGeometry(0.26, 0.03, 8, 24, Math.PI), GOLD(), 0, 0.12, 0.12));
  });
  item("galaxycape", "Galaxy Cape", "back", "magic", function () {
    var g = new T.PlaneGeometry(0.8, 1.1, 6, 8), pos = g.attributes.position;
    for (var i = 0; i < pos.count; i++) { var y = pos.getY(i); pos.setX(i, pos.getX(i) * (0.75 + (0.5 - y) * 0.5)); pos.setZ(i, -Math.pow(0.5 - y, 2) * 0.25); }
    g.computeVertexNormals();
    var grp = group(mesh(g, std("#2b1d6e", { ds: true, r: 0.5, e: "#3a1f8a", ei: 0.3 }), 0, -0.42, -0.02));
    for (var s = 0; s < 14; s++) grp.add(mesh(sphere(0.014, 6, 5), new T.MeshBasicMaterial({ color: ["#ffffff", "#ffe37a", "#9fd8ff"][s % 3] }), (Math.random() - 0.5) * 0.6, -0.1 - Math.random() * 0.75, -0.09 - Math.random() * 0.05));
    return grp;
  });
  item("fairywings", "Fairy Wings", "back", "magic", function () {
    var g = new T.Group(), m = std("#ffb3e6", { op: 0.55, ds: true, r: 0.1, e: "#ff9ad8", ei: 0.25 });
    [-1, 1].forEach(function (s) {
      var up = mesh(new T.CircleGeometry(0.34, 24), m, 0.3 * s, 0.18, -0.05); up.scale.set(0.8, 1.15, 1); up.rotation.set(0, 0.5 * s, -0.5 * s); g.add(up);
      var lo = mesh(new T.CircleGeometry(0.22, 24), m, 0.24 * s, -0.22, -0.04); lo.rotation.set(0, 0.5 * s, 0.6 * s); g.add(lo);
    });
    g.userData.flap = true; return g;
  });
  item("dragonwings", "Dragon Wings", "back", "magic", function () {
    var g = new T.Group(), m = std("#46c486", { ds: true, r: 0.5 });
    [-1, 1].forEach(function (s) {
      var sh = new T.Shape(); sh.moveTo(0, 0); sh.lineTo(0.75, 0.45); sh.lineTo(0.62, 0.1); sh.lineTo(0.7, -0.15); sh.lineTo(0.48, -0.08); sh.lineTo(0.45, -0.35); sh.lineTo(0.25, -0.15); sh.lineTo(0, -0.2); sh.lineTo(0, 0);
      var w = mesh(new T.ShapeGeometry(sh), m, 0.05 * s, 0.15, -0.05); w.scale.x = s; w.rotation.y = 0.4 * s; g.add(w);
    });
    g.userData.flap = true; return g;
  });
  item("jetpack", "Jetpack", "back", "science", function () {
    var m = SILVER(), g = new T.Group();
    [-1, 1].forEach(function (s) {
      g.add(mesh(capsule(0.1, 0.3), m, 0.12 * s, 0, -0.05));
      put(g, mesh(new T.ConeGeometry(0.08, 0.12, 16), std("#38384a"), 0.12 * s, -0.33, -0.05)).rotation.x = Math.PI;
      var fl = mesh(new T.ConeGeometry(0.06, 0.25, 12), std("#ffb03a", { e: "#ff7a1a", ei: 1.5, op: 0.9 }), 0.12 * s, -0.5, -0.05); fl.rotation.x = Math.PI; g.add(fl);
    });
    g.add(mesh(new T.BoxGeometry(0.12, 0.18, 0.08), std("#ef4f66"), 0, 0.05, -0.05));
    return g;
  });
  item("beepack", "Bee Backpack", "back", "fun", function () {
    var y = std("#ffcf33", { r: 0.6 }), k = std("#2a2420", { r: 0.6 });
    var b = mesh(sphere(0.25), y, 0, -0.05, -0.08); b.scale.set(1, 1.15, 0.65);
    var g = group(b);
    [-0.07, 0.1].forEach(function (yy) { var st = mesh(new T.CylinderGeometry(0.26, 0.26, 0.06, 24), k, 0, yy, -0.08); st.scale.set(0.97, 1, 0.64); g.add(st); });
    [-1, 1].forEach(function (s) { var w = mesh(new T.CircleGeometry(0.14, 20), std("#e6f6ff", { op: 0.6, ds: true }), 0.18 * s, 0.22, -0.16); w.rotation.z = -0.6 * s; g.add(w); });
    return g;
  });

  // ---- NECK / CHEST
  item("medal", "Gold Medal", "neck", "clothes", function () {
    var g = new T.Group();
    var rib = mesh(new T.TorusGeometry(0.2, 0.025, 6, 24, Math.PI), std("#35a6dd"), 0, 0.05, -0.05); rib.rotation.z = Math.PI; rib.rotation.x = 0.25; g.add(rib);
    var m = mesh(new T.CylinderGeometry(0.08, 0.08, 0.025, 24), GOLD(), 0, -0.17, 0.05); m.rotation.x = Math.PI / 2; g.add(m);
    g.add(mesh(extrude(starShape(0.045, 0.02, 5), 0.01), std("#fff3b0", { m: 0.6, r: 0.3 }), 0, -0.17, 0.065));
    return g;
  });
  item("bowtie", "Bow Tie", "neck", "clothes", function () {
    var m = std("#ef4f66", { r: 0.5 }), g = new T.Group();
    [-1, 1].forEach(function (s) { var c = mesh(new T.ConeGeometry(0.07, 0.13, 4), m, 0.065 * s, 0.05, 0.02); c.rotation.z = -Math.PI / 2 * s; g.add(c); });
    g.add(mesh(sphere(0.035), m, 0, 0.05, 0.04));
    return g;
  });
  item("scarf", "Cozy Scarf", "neck", "clothes", function () {
    var m = std("#ff8a3d", { r: 0.85 }), g = new T.Group();
    var ring = mesh(new T.TorusGeometry(0.17, 0.07, 10, 24), m, 0, 0.1, -0.18); ring.rotation.x = Math.PI / 2; g.add(ring);
    var end = mesh(new T.BoxGeometry(0.12, 0.32, 0.05), m, 0.1, -0.08, 0.02); end.rotation.z = 0.15; g.add(end);
    [-0.02, -0.18].forEach(function (yy) { put(g, mesh(new T.BoxGeometry(0.125, 0.04, 0.055), std("#fff3e0"), 0.1 + yy * -0.15, yy + 0.0, 0.02)).rotation.z = 0.15; });
    return g;
  });
  item("pibadge", "π Badge", "neck", "math", function () {
    var c = mesh(new T.CylinderGeometry(0.1, 0.1, 0.03, 28), std("#5660dd", { r: 0.35 }), 0, -0.08, 0.06); c.rotation.x = Math.PI / 2;
    var g = group(c, mesh(new T.BoxGeometry(0.1, 0.02, 0.012), std("#ffffff"), 0, -0.04, 0.08));
    [-1, 1].forEach(function (s) { g.add(mesh(new T.BoxGeometry(0.018, 0.08, 0.012), std("#ffffff"), 0.027 * s, -0.085, 0.08)); });
    return g;
  });
  item("atombadge", "Atom Badge", "neck", "science", function () {
    var g = group(mesh(sphere(0.03), std("#ff3f7f", { e: "#ff3f7f", ei: 0.5 }), 0, -0.08, 0.07));
    for (var i = 0; i < 3; i++) { var o = mesh(new T.TorusGeometry(0.09, 0.008, 6, 28), std("#35a6dd", { e: "#35a6dd", ei: 0.4 }), 0, -0.08, 0.06); o.rotation.z = i * Math.PI / 3; o.scale.y = 0.4; g.add(o); }
    return g;
  });

  // ---- PETS (float beside the avatar)
  item("beebuddy", "Bee Buddy", "pet", "fun", function () {
    var y = std("#ffcf33", { r: 0.5 }), k = std("#2a2420", { r: 0.5 });
    var b = mesh(sphere(0.16), y); b.scale.set(1.15, 1, 1);
    var g = group(b);
    [-0.05, 0.06].forEach(function (x) { var s = mesh(new T.CylinderGeometry(0.162, 0.162, 0.04, 20), k, x, 0, 0); s.rotation.z = Math.PI / 2; s.scale.set(1, 1, 0.98); g.add(s); });
    [-1, 1].forEach(function (s) {
      g.add(mesh(sphere(0.03), std("#ffffff"), 0.15, 0.04, 0.06 * s));
      g.add(mesh(sphere(0.017), k, 0.175, 0.04, 0.06 * s));
      var w = mesh(new T.CircleGeometry(0.1, 20), std("#e6f6ff", { op: 0.6, ds: true }), -0.02, 0.17, 0.07 * s); w.rotation.x = Math.PI / 2 - 0.4 * s; g.add(w);
    });
    g.rotation.y = -Math.PI / 2; return g;
  });
  item("owl", "Owl Friend", "pet", "magic", function () {
    var br = std("#9a6b45", { r: 0.7 });
    var b = mesh(sphere(0.18), br); b.scale.set(1, 1.2, 0.95);
    var g = group(b, mesh(sphere(0.12), std("#f3e2c4"), 0, -0.04, 0.11));
    [-1, 1].forEach(function (s) {
      g.add(mesh(sphere(0.065), std("#ffffff"), 0.07 * s, 0.09, 0.14)); g.add(mesh(sphere(0.035), std("#2a2420"), 0.07 * s, 0.09, 0.19));
      put(g, mesh(new T.ConeGeometry(0.04, 0.09, 6), br, 0.11 * s, 0.24, 0)).rotation.z = -0.3 * s;
    });
    put(g, mesh(new T.ConeGeometry(0.025, 0.06, 6), std("#ffb03a"), 0, 0.03, 0.2)).rotation.x = Math.PI / 2 + 0.6;
    return g;
  });
  item("robot", "Robot Pal", "pet", "science", function () {
    var m = SILVER(), g = new T.Group();
    var head = mesh(new T.BoxGeometry(0.28, 0.22, 0.22), m, 0, 0, 0); g.add(head);
    g.add(mesh(new T.BoxGeometry(0.2, 0.08, 0.01), std("#1d2140"), 0, 0.01, 0.115));
    [-1, 1].forEach(function (s) { g.add(mesh(sphere(0.025), std("#5fe3ff", { e: "#5fe3ff", ei: 1.2 }), 0.05 * s, 0.01, 0.12)); });
    g.add(mesh(new T.CylinderGeometry(0.01, 0.01, 0.12, 6), m, 0, 0.17, 0));
    g.add(mesh(sphere(0.03), std("#ef4f66", { e: "#ef4f66", ei: 1 }), 0, 0.24, 0));
    put(g, mesh(new T.ConeGeometry(0.1, 0.14, 20), std("#35a6dd"), 0, -0.18, 0)).rotation.x = Math.PI;
    return g;
  });
  item("babydragon", "Baby Dragon", "pet", "magic", function () {
    var m = std("#a35ce0", { r: 0.5 }), g = new T.Group();
    var b = mesh(sphere(0.15), m); b.scale.set(1, 0.9, 1.2); g.add(b);
    var h = mesh(sphere(0.12), m, 0, 0.13, 0.13); g.add(h);
    [-1, 1].forEach(function (s) {
      g.add(mesh(sphere(0.03), std("#ffffff"), 0.05 * s, 0.17, 0.23)); g.add(mesh(sphere(0.016), std("#1d2140"), 0.05 * s, 0.17, 0.25));
      g.add(mesh(new T.ConeGeometry(0.025, 0.08, 6), std("#ffcf33"), 0.06 * s, 0.26, 0.1));
      var w = mesh(new T.CircleGeometry(0.13, 3), std("#ff7cc3", { ds: true }), 0.14 * s, 0.08, -0.02); w.rotation.set(0, 0.4 * s, 0.8 * s); g.add(w);
    });
    var tail = mesh(new T.ConeGeometry(0.06, 0.25, 10), m, 0, -0.05, -0.22); tail.rotation.x = -Math.PI / 2 - 0.3; g.add(tail);
    return g;
  });
  item("saturn", "Pocket Planet", "pet", "science", function () {
    var p = mesh(sphere(0.15, 32, 20), std("#f0b56b", { r: 0.5 }));
    var ring = mesh(new T.TorusGeometry(0.25, 0.025, 4, 48), std("#f7e0b0", { r: 0.4 }), 0, 0, 0); ring.rotation.x = Math.PI / 2 - 0.4; ring.scale.z = 0.25;
    var g = group(p, ring); p.userData.spin = 0.02; return g;
  });
  item("kitty", "Star Kitty", "pet", "fun", function () {
    var m = std("#ff9e57", { r: 0.7 }), g = new T.Group();
    var b = mesh(sphere(0.16), m); g.add(b);
    [-1, 1].forEach(function (s) {
      put(g, mesh(new T.ConeGeometry(0.05, 0.1, 4), m, 0.09 * s, 0.15, 0)).rotation.z = -0.3 * s;
      g.add(mesh(sphere(0.026), std("#2a2420"), 0.055 * s, 0.03, 0.14));
    });
    g.add(mesh(sphere(0.02), std("#ff7c9c"), 0, -0.01, 0.16));
    g.add(mesh(extrude(starShape(0.05, 0.02, 5), 0.01), std("#ffe37a", { e: "#ffd23f", ei: 0.8 }), 0, -0.12, 0.13));
    return g;
  });

  // ---- SHOES (restyle the avatar's shoes)
  function shoeItem(id, name, cat, color, glow) {
    ITEMS.push({ id: id, name: name, slot: "shoes", cat: cat,
      apply: function (P) {
        [P.lLeg, P.rLeg].forEach(function (L) {
          L.shoe.material = std(color, { r: 0.35, e: glow || "#000000", ei: glow ? 0.7 : 1 });
          if (glow) { var f = mesh(new T.ConeGeometry(0.07, 0.22, 12), std("#ffb03a", { e: "#ff7a1a", ei: 1.4, op: 0.85 }), 0, -0.52, 0.02); f.rotation.x = Math.PI; L.knee.add(f); }
        });
      },
      build: function () {
        var g = new T.Group();
        [-1, 1].forEach(function (s) {
          var sh = mesh(sphere(0.15), std(color, { r: 0.35, e: glow || "#000000", ei: glow ? 0.7 : 1 }), 0.17 * s, 0, 0); sh.scale.set(0.95, 0.62, 1.35); g.add(sh);
          put(g, mesh(new T.CylinderGeometry(0.14, 0.14, 0.03, 20), std("#f7f3ea"), 0.17 * s, -0.07, 0)).scale.set(1, 1, 1.4);
        });
        return g;
      } });
  }
  shoeItem("rainbowkicks", "Rainbow Sneakers", "clothes", "#ff7cc3");
  shoeItem("rocketboots", "Rocket Boots", "science", "#dfe6ee", "#ff8a1a");
  shoeItem("goldshoes", "Golden Slippers", "magic", "#ffcf33");

  var ITEM_BY_ID = {};
  ITEMS.forEach(function (it) { ITEM_BY_ID[it.id] = it; });

  // ======================================================= item thumbnails
  // One small offscreen renderer draws each item once; cached as data URLs.
  var thumbR = null, thumbCache = {};
  function thumb(id, size) {
    if (thumbCache[id]) return thumbCache[id];
    var it = ITEM_BY_ID[id]; if (!it) return "";
    size = size || 220;
    if (!thumbR) {
      thumbR = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      thumbR.setSize(size, size); thumbR.outputEncoding = T.sRGBEncoding; thumbR.toneMapping = T.ACESFilmicToneMapping; thumbR.toneMappingExposure = 1.1;
    }
    var sc = new T.Scene();
    sc.add(new T.HemisphereLight("#ffffff", "#8a7fb0", 0.9));
    var d = new T.DirectionalLight("#ffffff", 1.1); d.position.set(2, 3, 4); sc.add(d);
    var obj = it.build(DEFAULT);
    sc.add(obj);
    var box = new T.Box3().setFromObject(obj), c = box.getCenter(new T.Vector3()), s = box.getSize(new T.Vector3());
    var r = Math.max(s.x, s.y, s.z) || 0.5;
    var cam = new T.PerspectiveCamera(32, 1, 0.01, 50);
    cam.position.set(c.x + r * 1.15, c.y + r * 0.55, c.z + r * 1.9); cam.lookAt(c);
    thumbR.setClearColor(0x000000, 0);
    thumbR.render(sc, cam);
    thumbCache[id] = thumbR.domElement.toDataURL("image/png");
    return thumbCache[id];
  }

  return {
    build: build, setPose: setPose, animate: animate, thumb: thumb,
    ITEMS: ITEMS, ITEM_BY_ID: ITEM_BY_ID, CATS: CATS, DEFAULT: DEFAULT,
    SKIN: SKIN, HAIR: HAIR, EYES: EYES, CLOTH: CLOTH,
    HAIR_STYLES: HAIR_STYLES, TOPS: TOPS, BOTTOMS: BOTTOMS, GLASSES: GLASSES, GLASS_COLORS: GLASS_COLORS, LENSES: LENSES, MOUTHS: MOUTHS,
    SLOTS: ["head", "face", "hand", "back", "neck", "pet", "shoes"],
    SLOT_NAMES: { head: "Hats", face: "Eyewear", hand: "In your hand", back: "On your back", neck: "Neck & badges", pet: "Pets", shoes: "Shoes" },
  };
})();
