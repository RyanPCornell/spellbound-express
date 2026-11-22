// ============================================================================
//  SPELLBOUND EXPRESS — COLOUR MANAGEMENT
//  Every colour in the code is written as an ordinary hex/CSS colour (sRGB).
//  The renderer works in linear light and outputs sRGB, so colours are
//  converted on the way in: they look exactly as written, and lighting and
//  shadows blend naturally.
// ============================================================================
(function () {
  var C = THREE.Color.prototype, setStyle = C.setStyle, setHex = C.setHex;
  C.setStyle = function (s) { setStyle.call(this, s); return this.convertSRGBToLinear(); };
  C.setHex = function (h) { setHex.call(this, h); return this.convertSRGBToLinear(); };
})();
