// ============================================================================
//  SPELLBOUND EXPRESS — GAME FLOW
//  Title → player → menu (avatar, settings) → ride. The train stops at a word
//  gate; a correct spelling sends it on to the next one. Level n needs
//  8 + 2n correct words (10, 12, 14 …, up to 30). At the castle: a
//  celebration that is different every time, then a reward item to keep.
//  Players are saved on this device (localStorage), one profile per name.
// ============================================================================
(function () {
  var KEY = "spellbound-express-v1";
  var DB = { profiles: {}, last: "" };
  try { DB = Object.assign(DB, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
  var P = null;                 // the current player
  function save() { try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) {} }
  function slug(n) { return n.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "player"; }
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function show(id, on) { $(id).classList.toggle("on", on !== false); }
  function wordsNeeded(level) { return Math.min(30, 8 + 2 * level); }

  function newProfile(name) {
    return { name: name, look: Object.assign({}, AVATAR.DEFAULT), equipped: {}, owned: [], level: 1, stats: {}, history: [], wins: 0,
      settings: { tier: "one", mix: { one: 50, two: 30, three: 20 }, types: { flash: true, listen: true, gaps: true, choose: true }, flashSec: 3, sound: true } };
  }

  // ---- spelling helpers (shared with Critter Quest): shuffling, fill-in-the-
  //      blank gaps, and believable misspellings that are never real words
  function shuffled(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  // How many letters to hide: short words 1–2, medium 2, long words only 2–3
  // (a long word with half its letters gone was too hard). Gaps are never
  // side by side, so every missing letter has letters around it.
  function gapWord(w) {
    var idx = [], L = w.length;
    for (var i = 1; i < L; i++) if (/[a-z]/i.test(w[i])) idx.push(i);
    var want = L <= 5 ? Math.max(1, Math.round(idx.length * 0.4)) : L <= 8 ? 2 : 2 + Math.floor(Math.random() * 2);
    var hide = [];
    shuffled(idx).forEach(function (i) {
      if (hide.length < want && hide.indexOf(i - 1) === -1 && hide.indexOf(i + 1) === -1) hide.push(i);
    });
    return w.split("").map(function (ch, i) { return hide.indexOf(i) !== -1 ? "_" : ch; }).join("");
  }
  // Believable misspellings: the slips real spellers make (a doubled or
  // dropped letter, a swapped vowel, ie/ei, a sound-alike), never another
  // real word from the Bee list.
  var VOWEL_SWAP = { a: "e", e: "i", i: "e", o: "u", u: "o" };
  // [pattern, replacement]: each only where the sounds really do match
  var SOUND_ALIKE = [[/ph/, "f"], [/tion/, "sion"], [/sion/, "tion"], [/ous/, "us"], [/ck/, "k"], [/ie/, "ei"], [/ei/, "ie"],
    [/c(?=[aoulr])/, "k"], [/s(?=[eiy])/, "c"], [/ce/, "se"], [/y$/, "ie"], [/er/, "ur"], [/or/, "er"], [/al$/, "le"],
    [/ent/, "ant"], [/ant/, "ent"], [/(..)ee/, "$1ea"], [/(..)ea/, "$1ee"], [/([^aeiou])e$/, "$1"]];
  function misspellOnce(w, loose) {
    var i, kind = Math.floor(Math.random() * 5), L = w.length, V = /[aeiouy]/;
    if (kind === 0) {                                     // double a middle consonant
      i = 1 + Math.floor(Math.random() * Math.max(1, L - 2));
      if (i < L - 1 && /[bcdfglmnprstz]/.test(w[i]) && V.test(w[i - 1]) && V.test(w[i + 1])) return w.slice(0, i) + w[i] + w.slice(i);
    } else if (kind === 1) {                              // undouble a double
      var m = w.match(/([a-z])\1/);
      if (m) return w.slice(0, m.index) + w.slice(m.index + 1);
    } else if (kind === 2) {                              // wrong vowel
      i = 1 + Math.floor(Math.random() * (L - 1));
      if (VOWEL_SWAP[w[i]]) return w.slice(0, i) + VOWEL_SWAP[w[i]] + w.slice(i + 1);
    } else if (kind === 3) {                              // sound-alike (never the first letter)
      var opts = SOUND_ALIKE.filter(function (p) { return p[0].test(w.slice(1)); });
      if (opts.length) { var p = opts[Math.floor(Math.random() * opts.length)];
        return w[0] + w.slice(1).replace(p[0], p[1]); }
    } else if (kind === 4 && L > 5) {                     // drop a consonant from a cluster
      i = 1 + Math.floor(Math.random() * (L - 2));
      if (/[a-z]/.test(w[i]) && !V.test(w[i]) && (/[b-df-hj-np-tv-z]/.test(w[i - 1]) || /[b-df-hj-np-tv-z]/.test(w[i + 1])) && w[i] !== w[i - 1])
        return w.slice(0, i) + w.slice(i + 1);
    } else {                                              // (fallback, short words) a stray e,
      if (/[^aeiouy]$/.test(w)) return w + "e";            // a doubled last letter, or a
      if (/[^aeiou]e$/.test(w)) return w.slice(0, -1);     // swapped pair of vowels
      var vv = w.search(/[aeiou][aeiou]/);
      if (vv > 0 && w[vv] !== w[vv + 1]) return w.slice(0, vv) + w[vv + 1] + w[vv] + w.slice(vv + 2);
      return /y$/.test(w) ? w.slice(0, -1) + "ey" : w + w[L - 1];
    }
    return null;
  }
  var REAL_WORDS = null;   // every word in every spelling bank: a "misspelling" must not be one
  function misspellings(w, n) {
    if (!REAL_WORDS) {
      REAL_WORDS = {};
      WORDS.forEach(function (x) { REAL_WORDS[x] = 1; });
      ["pear", "thirty", "heard", "hart", "pomp", "trick", "bear", "beer", "deer", "dear", "here", "hear", "peach", "reach",
       "still", "stile", "rich", "ditch", "mosey", "drank", "sweeter", "even", "oven", "fear", "fair", "clews", "pier", "per", "pimp", "clams"].forEach(function (x) { REAL_WORDS[x] = 1; });
    }
    var bank = REAL_WORDS, out = [];
    for (var tries = 0; out.length < n && tries < 300; tries++) {
      var m = misspellOnce(w, tries >= 200);              // realistic slips first
      if (m && m !== w && out.indexOf(m) === -1 && !bank[m]) out.push(m);
    }
    // last resort for very short words: a stray final e, or a doubled last letter
    [w + "e", w + w[w.length - 1]].forEach(function (m) { if (out.length < n && out.indexOf(m) === -1 && !bank[m]) out.push(m); });
    return out;
  }


  // ====================================================== AVATAR STAGE
  // One small renderer for the avatar preview, moved between the menu, the
  // editor and the reward screen.
  var stage = null;
  function makeStage() {
    var r = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.shadowMap.enabled = true;
    r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.1;
    var sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    sc.add(new THREE.HemisphereLight("#ffffff", "#9a8fd0", 0.85));
    var key = new THREE.DirectionalLight("#fff4e0", 0.95); key.position.set(3, 5, 4); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); sc.add(key);
    var rim = new THREE.DirectionalLight("#b9a8ff", 0.5); rim.position.set(-4, 3, -3); sc.add(rim);
    var ped = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.32, 0.22, 48), new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.35 }));
    ped.position.y = -0.11; ped.receiveShadow = true; sc.add(ped);
    var ring = new THREE.Mesh(new THREE.TorusGeometry(1.26, 0.04, 8, 64), new THREE.MeshStandardMaterial({ color: "#ffcf3f", emissive: "#ffb000", emissiveIntensity: 0.6 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.0; sc.add(ring);
    var holder = new THREE.Group(); sc.add(holder);
    var st = { r: r, sc: sc, cam: cam, holder: holder, av: null, spin: 0.4, drag: null, mode: "idle", modeUntil: 0, t0: performance.now() };
    var el = r.domElement;
    el.addEventListener("pointerdown", function (e) { st.drag = e.clientX; el.setPointerCapture(e.pointerId); });
    el.addEventListener("pointermove", function (e) { if (st.drag != null) { holder.rotation.y += (e.clientX - st.drag) * 0.012; st.drag = e.clientX; } });
    el.addEventListener("pointerup", function () { st.drag = null; });
    function loop() {
      requestAnimationFrame(loop);
      if (!el.parentNode || !el.offsetWidth) return;
      var w = el.parentNode.clientWidth, h = el.parentNode.clientHeight;
      if (el.width !== Math.round(w * r.getPixelRatio()) || el.height !== Math.round(h * r.getPixelRatio())) { r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
      var t = (performance.now() - st.t0) / 1000;
      if (st.drag == null) holder.rotation.y += 0.004;
      var fit = cam.aspect < 0.8 ? 1.25 : 1;
      cam.position.set(0, 1.45, 7.4 * fit); cam.lookAt(0, 1.2, 0);
      if (st.av) AVATAR.animate(st.av, t, performance.now() < st.modeUntil ? st.mode : "idle");
      r.render(sc, cam);
    }
    loop();
    return st;
  }
  function stageShow(containerId, look, equipped, mode) {
    if (!stage) stage = makeStage();
    var c = $(containerId);
    if (stage.r.domElement.parentNode !== c) c.insertBefore(stage.r.domElement, c.firstChild);
    if (stage.av) stage.holder.remove(stage.av);
    stage.av = AVATAR.build(look, equipped);
    stage.av.position.y = 0.0;
    stage.holder.add(stage.av);
    if (mode) { stage.mode = mode; stage.modeUntil = performance.now() + 2200; }
  }
  function rideAvatar() { WORLD.setAvatar(AVATAR.build(P.look, P.equipped)); }

  // ====================================================== TITLE / PROFILES
  function renderProfiles() {
    var box = $("profiles"), names = Object.keys(DB.profiles);
    box.innerHTML = names.length ? names.map(function (k) {
      var p = DB.profiles[k];
      return '<button data-k="' + esc(k) + '">' + esc(p.name) + "<small>Level " + p.level + " · " + p.owned.length + " treasures</small></button>";
    }).join("") : "";
    box.style.display = names.length ? "" : "none";
    box.querySelectorAll("button").forEach(function (b) { b.onclick = function () { AUDIO.click(); enter(DB.profiles[b.getAttribute("data-k")]); }; });
    if (DB.last && DB.profiles[DB.last]) $("nameIn").placeholder = "…or a new player's name";
  }
  $("playBtn").onclick = function () {
    var n = $("nameIn").value.trim();
    if (!n) { if (DB.last && DB.profiles[DB.last]) return enter(DB.profiles[DB.last]); $("nameIn").focus(); return; }
    var k = slug(n);
    if (!DB.profiles[k]) DB.profiles[k] = newProfile(n);
    enter(DB.profiles[k]);
  };
  $("nameIn").addEventListener("keydown", function (e) { if (e.key === "Enter") $("playBtn").click(); });
  function enter(p) {
    P = p; DB.last = slug(p.name); save();
    AUDIO.set(P.settings.sound !== false); $("soundBtn").textContent = AUDIO.on ? "🔊" : "🔈";
    show("title", false);
    openMenu(true);
  }

  // ====================================================== MENU
  function openMenu(rebuild) {
    FX.stop();
    show("hud", false); show("go", false); show("q", false); show("banner", false); $("rewardBtn").style.display = "none";
    if (rebuild !== false) buildLevel();
    WORLD.setCamera("menu");
    $("menuName").textContent = P.name;
    $("menuLevel").textContent = "Level " + P.level;
    $("startBtn").textContent = "🚂 Start Level " + P.level;
    var right = Object.keys(P.stats).filter(function (w) { return P.stats[w].r; }).length;
    $("menuInfo").textContent = right + " of 450 words spelled · " + P.owned.length + " treasures · " + tierLabel();
    show("menu");
    stageShow("menuStage", P.look, P.equipped, "wave");
  }
  function tierLabel() {
    var s = P.settings;
    if (s.tier !== "mix") return TIER_NAMES[s.tier] + " words";
    return "Mix " + s.mix.one + "/" + s.mix.two + "/" + s.mix.three;
  }
  var levelInfo = null;
  function buildLevel() {
    levelInfo = WORLD.buildLevel(P.level, wordsNeeded(P.level), (Date.now() & 0xffff) + P.level * 101);
    rideAvatar();
    WORLD.setAvatarMode("idle");
  }
  $("switchBtn").onclick = function () { show("menu", false); renderProfiles(); show("title"); WORLD.setCamera("title"); };
  $("startBtn").onclick = function () { AUDIO.click(); startLevel(); };
  $("avatarBtn").onclick = function () { AUDIO.click(); openEditor("menu"); };
  $("settingsBtn").onclick = function () { AUDIO.click(); openSettings(); };

  // ====================================================== RIDE
  var ride = null;
  function startLevel() {
    show("menu", false);
    var need = wordsNeeded(P.level);
    ride = { need: need, done: 0, stop: 0, used: {}, retry: [] };
    $("hudLevel").textContent = "Level " + P.level;
    var dots = "";
    for (var i = 0; i < need; i++) dots += '<span class="dot" style="left:' + ((i + 1) / (need + 1.15) * 100) + '%"></span>';
    $("pDots").innerHTML = dots;
    updateHud();
    show("hud");
    $("goTitle").textContent = "Level " + P.level + " · " + levelInfo.theme.name;
    $("goSub").textContent = "Spell " + need + " words to reach the castle!";
    show("go");
    WORLD.setCamera("chase");
    WORLD.setAvatarMode("wave");
  }
  function updateHud() {
    var f = ride.done / ride.need;
    $("pFill").style.width = (f * 100) + "%";
    $("pTrain").style.left = (ride.done / (ride.need + 1.15) * 100) + "%";
    $("hudCount").textContent = ride.done + " / " + ride.need;
    [].forEach.call($("pDots").children, function (d, i) { d.classList.toggle("done", i < ride.done); });
  }
  $("aboardBtn").onclick = function () {
    show("go", false);
    AUDIO.whistle();
    WORLD.setAvatarMode("idle");
    setTimeout(function () { WORLD.goTo(0); }, 400);
  };
  WORLD.on("arrive", function (info) {
    if (!ride) return;
    if (info.stop >= 0) {
      AUDIO.brake();
      WORLD.setCamera("stop");
      setTimeout(function () { ask(); }, 650);
    } else {
      arriveCastle();
    }
  });
  WORLD.addHook(function (t, dt) { if (WORLD.train) AUDIO.tick(dt, WORLD.train.v); });
  $("homeBtn").onclick = function () { if (confirm("Leave this ride and go back to the menu?")) { ride = null; openMenu(true); } };
  $("soundBtn").onclick = function () { AUDIO.set(!AUDIO.on); if (P) { P.settings.sound = AUDIO.on; save(); } $("soundBtn").textContent = AUDIO.on ? "🔊" : "🔈"; };

  // ====================================================== WORD CHOICE
  function pickTier() {
    var s = P.settings;
    if (s.tier !== "mix") return s.tier;
    var tot = s.mix.one + s.mix.two + s.mix.three || 1, r = Math.random() * tot;
    return r < s.mix.one ? "one" : r < s.mix.one + s.mix.two ? "two" : "three";
  }
  function nextWord() {
    if (ride.retry.length && ride.retry[0].after <= ride.done) return ride.retry.shift().w;
    var tier = pickTier(), pool = TIERS[tier].filter(function (w) { return !ride.used[w]; });
    if (!pool.length) pool = TIERS[tier];
    var fresh = pool.filter(function (w) { return !(P.stats[w] && P.stats[w].r); });
    var from = fresh.length && Math.random() < 0.75 ? fresh : pool;
    var w = from[Math.floor(Math.random() * from.length)];
    ride.used[w] = 1;
    return w;
  }
  function pickMode() {
    var t = P.settings.types, on = Object.keys(t).filter(function (k) { return t[k]; });
    if (!on.length) on = ["flash"];
    return on[Math.floor(Math.random() * on.length)];
  }
  function stat(w) { return P.stats[w] || (P.stats[w] = { s: 0, r: 0, m: 0 }); }

  // ====================================================== QUESTIONS
  var Q = null;
  function ask(word) {
    var w = word || nextWord(), mode = pickMode();
    Q = { w: w, mode: mode, locked: false };
    stat(w).s++;
    var card = $("qCard"), tier = tierOf(w);
    var head = '<div class="qhead"><span class="qmode">' + { flash: "✨ Look, then spell", listen: "🔊 Listen and spell", gaps: "🧩 Fill in the blanks", choose: "✅ Pick the right spelling" }[mode] +
      '</span><span class="tier ' + tier + '">' + TIER_NAMES[tier] + "</span></div>";
    var input = '<div class="answer"><input class="field" id="ans" autocomplete="off" autocapitalize="off" spellcheck="false" autocorrect="off" placeholder="type the word"><button class="btn gold" id="ansGo">Go!</button></div>';
    if (mode === "flash") {
      card.innerHTML = head + '<div class="word" id="qw">' + esc(w) + '</div><div class="timer"><i id="qt"></i></div><div id="ansRow" style="visibility:hidden">' + input + '</div><div class="fb" id="fb"></div>';
      var ms = (P.settings.flashSec || 3) * 1000, bar = $("qt");
      bar.style.transition = "transform " + ms + "ms linear"; requestAnimationFrame(function () { bar.style.transform = "scaleX(0)"; });
      setTimeout(function () {
        if (!Q || Q.w !== w || Q.mode !== "flash") return;
        $("qw").textContent = "• • •"; $("qw").classList.add("hidden");
        $("ansRow").style.visibility = ""; $("ans").focus();
      }, ms);
    } else if (mode === "listen") {
      card.innerHTML = head + '<div class="listen"><button class="btn violet" id="hear">🔊 Hear the word</button><button class="linkbtn" id="mean">📖 What does it mean?</button><div class="def" id="defBox" style="display:none"></div></div>' + input + '<div class="fb" id="fb"></div>';
      var hear = function () { SAY.speak(w).then(function (how) { if (how === "none") { $("defBox").style.display = ""; $("defBox").textContent = "No sound on this device — ask a grown-up to read the word."; } }); };
      $("hear").onclick = hear; setTimeout(hear, 350);
      $("mean").onclick = function () { var b = $("defBox"); b.style.display = ""; b.textContent = "Looking it up…"; SAY.meaning(w).then(function (d) { b.textContent = d ? "📖 " + d : "No meaning found for this one."; }); };
    } else if (mode === "gaps") {
      card.innerHTML = head + '<div class="word gaps">' + esc(gapWord(w)) + '</div><div class="def" id="defBox">📖 <i>Looking up what it means…</i></div>' + input + '<div class="fb" id="fb"></div>';
      SAY.meaning(w).then(function (d) { var b = $("defBox"); if (!b || !Q || Q.w !== w) return; if (d) b.textContent = "📖 " + d; else b.style.display = "none"; });
    } else {
      var opts = shuffled([w].concat(misspellings(w, 2)));
      card.innerHTML = head + '<div class="choices">' + opts.map(function (o) { return '<button data-w="' + esc(o) + '">' + esc(o) + "</button>"; }).join("") + '</div><div class="fb" id="fb"></div>';
      card.querySelectorAll(".choices button").forEach(function (b) {
        b.onclick = function () { if (Q.locked) return; var pick = b.getAttribute("data-w"); if (pick !== w) b.classList.add("bad"); grade(pick === w, pick); };
      });
    }
    show("q");
    if (mode !== "choose") {
      var go = function () { var v = $("ans").value; if (!v.trim() || Q.locked) return; grade(spellMatch(v, w), v.trim()); };
      $("ansGo").onclick = go;
      $("ans").addEventListener("keydown", function (e) { if (e.key === "Enter") go(); });
      if (mode !== "flash") setTimeout(function () { var a = $("ans"); if (a) a.focus(); }, 120);
    }
  }
  function grade(ok, answer) {
    var w = Q.w, card = $("qCard");
    Q.locked = true;
    if (ok) {
      stat(w).r++; save();
      AUDIO.ding(); AUDIO.sparkle();
      card.innerHTML = '<div class="qmode" style="margin-bottom:6px">🎉 That\'s right!</div><div class="bigword">' + esc(w) + '</div>';
      WORLD.setAvatarMode("cheer");
      ride.done++;
      WORLD.setStopState(ride.stop, "done");
      updateHud();
      setTimeout(function () {
        show("q", false); WORLD.setAvatarMode("idle");
        ride.stop++;
        WORLD.setCamera("chase");
        AUDIO.whistle();
        WORLD.goTo(ride.stop < ride.need ? ride.stop : -1);
      }, 2300);
    } else {
      stat(w).m++; save();
      AUDIO.wrong();
      ride.retry.push({ w: w, after: ride.done + 2 });     // it comes back a couple of stops later
      var fb = $("fb"); fb.className = "fb bad"; fb.textContent = Q.mode === "choose" ? "Oops, “" + answer + "” is misspelled." : "Not quite! You wrote “" + answer + "”.";
      setTimeout(function () {
        card.innerHTML = '<div class="fix">Here’s how it’s spelled. Type it once, just like this:</div><div class="fixword">' + esc(w) + '</div>' +
          '<div class="answer"><input class="field" id="ans" autocomplete="off" autocapitalize="off" spellcheck="false" autocorrect="off" placeholder="copy it"><button class="btn gold" id="ansGo">Got it</button></div><div class="fb" id="fb"></div>';
        var go = function () {
          if (spellMatch($("ans").value, w)) { AUDIO.click(); $("fb").className = "fb good"; $("fb").textContent = "👍 Great. Here's a new word…"; setTimeout(function () { ask(); }, 900); }
          else { $("fb").className = "fb bad"; $("fb").textContent = "Copy it letter by letter."; $("ans").value = ""; $("ans").focus(); }
        };
        $("ansGo").onclick = go; $("ans").addEventListener("keydown", function (e) { if (e.key === "Enter") go(); });
        setTimeout(function () { $("ans").focus(); }, 80);
      }, 1500);
    }
  }

  // ====================================================== CASTLE
  function arriveCastle() {
    var lvl = P.level, need = ride.need;
    WORLD.setCamera("castle");
    WORLD.setAvatarMode("cheer");
    AUDIO.brake();
    var cel = FX.celebrate(P.history);
    P.history.push(cel.key); if (P.history.length > 8) P.history.shift();
    P.wins++; P.level++; save();
    setTimeout(function () { AUDIO.fanfare(P.wins); }, 900);
    var lines = ["You made it to the castle!", "Spellbinding! The castle is yours tonight.", "The whole kingdom is cheering for you!", "What a magical ride!", "Every word, spelled true!", "The castle lights up just for you!"];
    setTimeout(function () {
      $("bn").innerHTML = '<div class="t1">Level ' + lvl + ' Complete!</div><div class="t2">' + lines[P.wins % lines.length] + '</div><div class="t3">' +
        need + " words spelled · " + cel.combo.map(function (c) { return FX.NAMES[c]; }).join(" · ") + " · " + cel.sky + "</div>";
      show("banner");
    }, 1400);
    setTimeout(function () { $("rewardBtn").style.display = "block"; }, 6500);
    ride = null;
  }
  $("rewardBtn").onclick = function () { AUDIO.click(); $("rewardBtn").style.display = "none"; show("banner", false); openReward(); };

  function openReward() {
    var owned = P.owned, left = AVATAR.ITEMS.filter(function (it) { return owned.indexOf(it.id) === -1; });
    var offers = [], cats = {};
    shuffled(left).forEach(function (it) { if (offers.length < 3 && !cats[it.cat]) { offers.push(it); cats[it.cat] = 1; } });
    shuffled(left).forEach(function (it) { if (offers.length < 3 && offers.indexOf(it) === -1) offers.push(it); });
    if (!offers.length) {
      $("offers").innerHTML = '<div class="empty" style="grid-column:1/-1">You own every treasure in the kingdom! 👑</div>';
      $("rewardSub").innerHTML = '<button class="btn gold" id="rwNext">Next level ▶</button>';
      $("rwNext").onclick = function () { show("reward", false); openMenu(true); };
    } else {
      $("rewardSub").textContent = "Choose one to keep. It goes straight onto your avatar.";
      $("offers").innerHTML = offers.map(function (it) {
        return '<button class="offer" data-id="' + it.id + '"><img src="' + AVATAR.thumb(it.id) + '" alt=""><b>' + esc(it.name) + "</b><span>" + AVATAR.CATS[it.cat] + " · " + AVATAR.SLOT_NAMES[it.slot] + "</span></button>";
      }).join("");
      $("offers").querySelectorAll(".offer").forEach(function (b) {
        b.onclick = function () {
          var it = AVATAR.ITEM_BY_ID[b.getAttribute("data-id")];
          P.owned.push(it.id); P.equipped[it.slot] = it.id; save();
          AUDIO.sparkle();
          show("reward", false);
          rideAvatar();
          openEditor("reward", it.id);
        };
      });
    }
    show("reward");
  }

  // ====================================================== AVATAR EDITOR
  var editorFrom = "menu", tab = "look";
  function openEditor(from, newItem) {
    editorFrom = from; tab = newItem ? "items" : "look";
    show("menu", false);
    show("editor");
    renderTabs(); renderPanel(newItem);
    stageShow("editStage", P.look, P.equipped, newItem ? "cheer" : "wave");
    $("editDone").textContent = from === "reward" ? "Next level ▶" : "Done ✓";
  }
  $("editDone").onclick = function () { AUDIO.click(); show("editor", false); save(); rideAvatar(); openMenu(editorFrom === "reward"); };
  var TABS = [["look", "🙂 Face"], ["hair", "💇 Hair"], ["clothes", "👕 Clothes"], ["items", "🎒 Treasures"]];
  function renderTabs() {
    $("tabs").innerHTML = TABS.map(function (t) { return '<button data-t="' + t[0] + '" class="' + (tab === t[0] ? "on" : "") + '">' + t[1] + "</button>"; }).join("");
    $("tabs").querySelectorAll("button").forEach(function (b) { b.onclick = function () { tab = b.getAttribute("data-t"); renderTabs(); renderPanel(); }; });
  }
  function swatches(key, list) {
    return '<div class="swatches">' + list.map(function (c, i) { return '<button class="sw' + (P.look[key] === i ? " on" : "") + '" data-k="' + key + '" data-v="' + i + '" style="background:' + c + '"></button>'; }).join("") + "</div>";
  }
  function options(key, list) {
    return '<div class="opts">' + list.map(function (o) { return '<button class="opt' + (P.look[key] === o.id ? " on" : "") + '" data-k="' + key + '" data-s="' + o.id + '">' + o.name + "</button>"; }).join("") + "</div>";
  }
  function renderPanel(highlight) {
    var A = AVATAR, h = "";
    if (tab === "look") h = "<h4>Skin</h4>" + swatches("skin", A.SKIN) + "<h4>Eyes</h4>" + swatches("eyes", A.EYES) + "<h4>Smile</h4>" + options("mouth", A.MOUTHS) + "<h4>Glasses</h4>" + options("glasses", A.GLASSES);
    else if (tab === "hair") h = "<h4>Hair style</h4>" + options("hair", A.HAIR_STYLES) + "<h4>Hair colour</h4>" + swatches("hairColor", A.HAIR);
    else if (tab === "clothes") h = "<h4>Top</h4>" + options("top", A.TOPS) + "<h4>Top colour</h4>" + swatches("topColor", A.CLOTH) +
      "<h4>Bottoms</h4>" + options("bottom", A.BOTTOMS) + "<h4>Bottoms colour</h4>" + swatches("bottomColor", A.CLOTH) + "<h4>Shoes</h4>" + swatches("shoes", A.CLOTH);
    else {
      if (!P.owned.length) h = '<div class="empty">No treasures yet! Reach the castle at the end of a level to choose one. 🏰</div>';
      A.SLOTS.forEach(function (slot) {
        var mine = A.ITEMS.filter(function (it) { return it.slot === slot && P.owned.indexOf(it.id) !== -1; });
        if (!mine.length) return;
        h += "<h4>" + A.SLOT_NAMES[slot] + '</h4><div class="items">' + mine.map(function (it) {
          return '<button class="it' + (P.equipped[slot] === it.id ? " on" : "") + '" data-item="' + it.id + '"' + (highlight === it.id ? ' style="border-color:#ffcf3f;box-shadow:0 0 0 4px #ffe9a0"' : "") +
            '><img src="' + A.thumb(it.id) + '" alt="">' + esc(it.name) + "</button>";
        }).join("") + "</div>";
      });
      var total = A.ITEMS.length;
      h += '<div class="empty" style="margin-top:12px">' + P.owned.length + " of " + total + " treasures collected. Tap one to wear it; tap again to take it off.</div>";
    }
    $("panel").innerHTML = h;
    $("panel").querySelectorAll("[data-k]").forEach(function (b) {
      b.onclick = function () {
        var k = b.getAttribute("data-k");
        P.look[k] = b.hasAttribute("data-s") ? b.getAttribute("data-s") : +b.getAttribute("data-v");
        AUDIO.click(); save(); renderPanel(); stageShow("editStage", P.look, P.equipped);
      };
    });
    $("panel").querySelectorAll("[data-item]").forEach(function (b) {
      b.onclick = function () {
        var it = AVATAR.ITEM_BY_ID[b.getAttribute("data-item")];
        if (P.equipped[it.slot] === it.id) delete P.equipped[it.slot]; else P.equipped[it.slot] = it.id;
        AUDIO.click(); save(); renderPanel(); stageShow("editStage", P.look, P.equipped, "cheer");
      };
    });
  }

  // ====================================================== SETTINGS
  function openSettings() {
    var s = P.settings;
    function paint() {
      document.querySelectorAll("#tierSeg button").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-t") === s.tier); });
      $("mixBox").classList.toggle("on", s.tier === "mix");
      document.querySelectorAll("#mixBox input").forEach(function (i) { var k = i.getAttribute("data-k"); i.value = s.mix[k]; document.querySelector('[data-v="' + k + '"]').textContent = s.mix[k] + "%"; });
      $("tierNote").textContent = s.tier === "mix" ? "Each word is picked from the three lists using these percentages." :
        { one: "Words 1–150 on the study list (the easiest).", two: "Words 151–300 on the study list.", three: "Words 301–450 on the study list (the hardest)." }[s.tier];
      document.querySelectorAll("[data-type]").forEach(function (c) { c.checked = !!s.types[c.getAttribute("data-type")]; });
      $("flashIn").value = s.flashSec; $("flashV").textContent = s.flashSec + " s";
      $("soundIn").checked = s.sound !== false;
    }
    document.querySelectorAll("#tierSeg button").forEach(function (b) { b.onclick = function () { s.tier = b.getAttribute("data-t"); AUDIO.click(); paint(); }; });
    // the three percentages always add up to 100: moving one rescales the other two
    document.querySelectorAll("#mixBox input").forEach(function (inp) {
      inp.oninput = function () {
        var k = inp.getAttribute("data-k"), v = +inp.value, others = ["one", "two", "three"].filter(function (x) { return x !== k; });
        var rest = 100 - v, cur = s.mix[others[0]] + s.mix[others[1]];
        var a = cur ? Math.round(rest * s.mix[others[0]] / cur) : Math.round(rest / 2);
        s.mix[k] = v; s.mix[others[0]] = a; s.mix[others[1]] = rest - a;
        paint();
      };
    });
    document.querySelectorAll("[data-type]").forEach(function (c) {
      c.onchange = function () {
        s.types[c.getAttribute("data-type")] = c.checked;
        if (!Object.keys(s.types).some(function (k) { return s.types[k]; })) { s.types.flash = true; }
        paint();
      };
    });
    $("flashIn").oninput = function () { s.flashSec = +this.value; paint(); };
    $("soundIn").onchange = function () { s.sound = this.checked; AUDIO.set(s.sound); $("soundBtn").textContent = AUDIO.on ? "🔊" : "🔈"; };
    paint();
    show("settings");
  }
  $("setDone").onclick = function () { AUDIO.click(); save(); show("settings", false); if (P && $("menu").classList.contains("on")) openMenu(false); };

  // ====================================================== BOOT
  WORLD.init($("scene"));
  WORLD.buildLevel(1 + Math.floor(Math.random() * 4), 10, Date.now() & 0xffff);
  WORLD.setCamera("title"); WORLD.snapCamera();
  renderProfiles();
  if (DB.last && DB.profiles[DB.last]) $("nameIn").value = "";
  window.__sbe = { get P() { return P; }, get ride() { return ride; }, get Q() { return Q; }, ask: ask, grade: grade, openReward: openReward, arrive: arriveCastle, save: save };
})();
