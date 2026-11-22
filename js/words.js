// ============================================================================
//  SPELLBOUND EXPRESS — THE WORD LIST
//  The 2026–27 School Spelling Bee study list (450 words), in the list's own
//  order: 1–150 are One Bee, 151–300 Two Bee, 301–450 Three Bee. Lowercase;
//  accents are kept but never required when typing.
// ============================================================================
(function () {
  var W = [
    // ---- One Bee (words 1–150) ----
    "ran","wind","leg","dirt","rod","good","most","hurt","shy","bunny",
    "down","steps","drink","silly","sick","path","mist","stars","truck","fire",
    "still","hello","bush","late","pump","shell","yarn","wings","sharp","easy",
    "body","house","rich","shift","heart","tusk","shoot","seal","even","dive",
    "claws","crack","come","fine","winter","apple","sound","mossy","yellow","shine",
    "chips","beans","mouth","spray","year","truth","paper","rabbit","feed","tallest",
    "inside","frozen","speak","cliffs","whale","market","flock","crunch","lizard","beware",
    "sparkle","sweater","nurse","wrong","hopped","money","cabin","darkness","always","sprout",
    "carve","shadows","morning","alive","earth","friend","lovely","return","half","swift",
    "grandfather","footprints","fear","thirsty","peer","gentle","riddle","voice","peach","pancake",
    "illness","lead","groan","sloth","knit","cloak","parade","whistle","total","indoors",
    "trouble","relax","finish","holiday","safety","stout","spiders","entire","library","guide",
    "hospital","mustard","company","ginger","narrow","medium","pennies","hiking","foolish","afraid",
    "remember","result","charming","source","pearls","tangy","beasts","shivering","barge","grumpily",
    "smoothly","cottage","humble","seventy","dangle","distance","breeze","soared","frazzled","bamboo",
    // ---- Two Bee (words 151–300) ----
    "buttons","cuddle","puffy","tiptoed","clever","basement","burlap","wetlands","invite","butterflies",
    "kelp","property","carefully","sniffling","beneath","tractor","permit","awning","fickle","relief",
    "lunar","boycotting","molten","elite","woven","proclaim","thimble","custody","granola","warrior",
    "rigid","fierce","laughter","salary","disappear","hurdler","lounge","jovial","inferior","december",
    "duration","dictionary","business","reinstate","examine","versus","lullaby","opposite","tissues","marlin",
    "halloween","compliment","compromise","incident","japanese","investment","bifocals","cutlery","chisel","fundraiser",
    "geologist","bellowed","organism","quail","atmosphere","disappointment","truant","pamphlet","helium","suggested",
    "chimpanzees","desperate","annoyance","interruption","concentrate","piñata","territory","stragglers","albino","ridiculous",
    "monorail","exploratory","indigo","bratwurst","alphabetical","integrity","oregon","rebuttal","prejudice","solidarity",
    "calico","sputnik","cartridge","segregation","tortillas","civilian","fertilizer","apprentice","synthetic","caesar",
    "sorceress","glamorous","salamanders","suspension","singularity","fictitious","convertible","snarkiness","battalion","collateral",
    "initiation","mascara","perimeter","precedent","materialize","magnesium","meticulous","haddock","hypothermia","optometrist",
    "megahertz","cosmodrome","arthritis","schnauzer","insurrection","regolith","pentathlete","persnickety","fascism","pheasants",
    "predecessor","senegal","reservoir","duende","conscious","polaroid","carrion","matrilineal","piteously","arnica",
    "elliptical","glaucoma","iridium","adrenaline","cemetery","staccato","rendezvous","romerillo","dachshund","aeolus",
    // ---- Three Bee (words 301–450) ----
    "newt","thrummed","embankment","lapels","generosity","burnished","mortar","unrelenting","wallowing","imperial",
    "persistent","arsonists","mewling","generator","dominion","authority","panoramic","doberman","lemmings","decisively",
    "gauntlets","inanimate","frequency","auditory","appetizing","sentinels","blithely","self-sufficient","prospective","subscription",
    "tenuous","conspicuous","preconception","procession","saxophone","perpendicular","hemisphere","seminal","canter","torrential",
    "reluctance","consulate","cuisine","sauntered","propeller","modish","influenza","juniper","settee","unconscious",
    "odorant","palazzo","finesse","foliage","crocheted","irrelevant","curriculum","quizzically","apologetic","diplomatically",
    "enigmatic","increments","delaware","calibrate","hypothesis","reassurance","undulating","credenza","comprehensible","protectorate",
    "brazier","phenomenon","trenchant","pulmonary","phantasmal","alleviate","despondent","approximation","arachnid","legation",
    "echolocation","censers","affinities","diffidence","conflagration","pathologically","embodiment","butane","thermotaxis","glycerin",
    "porpoises","cataract","inaugurate","alabaster","psychological","quiche","bioluminescence","arugula","assemblage","euphemism",
    "chickadee","vibrometer","leprosy","acolyte","asymmetric","mayonnaise","eureka","innocuous","shar-pei","sputum",
    "annelids","tripoli","endothermy","cerulean","kerosene","neurological","éclair","cul-de-sac","pennsylvania","mysticetes",
    "irascibility","electrolytes","ampulla","eritrea","a cappella","ototoxic","sensilla","forsythia","amharic","aphrodite",
    "eponymous","salicylic acid","gloucester","bogong moth","presbyterian","stomatopods","prosciutto","yakuza","sierra leone","frankincense",
    "chitinous","krio","vibrissae","solenodon","trichobothria","addis ababa","bildungsroman","lactobacillus","cappadocia","spes phthisica",
  ];
  window.WORDS = W;
  window.TIERS = { one: W.slice(0, 150), two: W.slice(150, 300), three: W.slice(300, 450) };
  window.TIER_NAMES = { one: "One Bee", two: "Two Bee", three: "Three Bee" };
  window.tierOf = function (w) { var i = W.indexOf(w); return i < 150 ? "one" : i < 300 ? "two" : "three"; };

  // Alternate spellings the list also accepts ("OR …"; ** preferred, * British)
  var ALTS = { brazier: ["brasier"], glycerin: ["glycerine"], kerosene: ["kerosine"],
    fertilizer: ["fertiliser"], materialize: ["materialise"], odorant: ["odourant"] };
  function plain(w) {
    return String(w).normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
  }
  // Case, extra spaces and accents (piñata / pinata) don't matter.
  window.spellMatch = function (typed, word) {
    var t = plain(typed);
    return t === plain(word) || (ALTS[word] || []).some(function (a) { return t === plain(a); });
  };
})();
