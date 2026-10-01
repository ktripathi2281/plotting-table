// A soft harp. Notes come from a major pentatonic scale so anything you play sounds intended.
window.Harp = (function () {
  "use strict";
  var ctx = null, master = null, enabled = false;
  var SCALE = [0, 2, 4, 7, 9];

  function freq(n) {
    n = Math.max(0, n | 0);
    return 293.66 * Math.pow(2, (Math.floor(n / 5) * 12 + SCALE[n % 5]) / 12);
  }

  function init() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    var comp = ctx.createDynamicsCompressor();
    var verb = ctx.createConvolver(), wet = ctx.createGain();
    wet.gain.value = 0.38;
    var len = ctx.sampleRate * 2.6, buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var c = 0; c < 2; c++) {
      var d = buf.getChannelData(c);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    verb.buffer = buf;
    master.connect(comp); master.connect(verb); verb.connect(wet); wet.connect(comp); comp.connect(ctx.destination);
    return true;
  }

  function pluck(n, vel) {
    if (!enabled || !ctx) return;
    vel = vel == null ? 0.6 : vel;
    var t = ctx.currentTime, f = freq(n);
    [1, 0.42, 0.22, 0.1, 0.05].forEach(function (a, k) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f * (k + 1) * (1 + (k ? 0.0008 * k : 0));
      var dur = 2.4 / (1 + k * 0.9);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(a * vel * 0.28, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + dur + 0.05);
    });
  }

  function chord() {
    if (!enabled) return;
    var base = (Math.random() * 6 | 0) + 2;
    [0, 2, 4, 7].forEach(function (s, i) { setTimeout(function () { pluck(base + s, 0.55); }, i * 70); });
  }

  // A stable note for a name, so the same part of a drawing always sounds the same.
  function noteOf(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
    return 3 + (Math.abs(h) % 9);
  }

  function toggle() {
    if (!ctx && !init()) return null;
    enabled = !enabled;
    if (enabled) { ctx.resume(); chord(); }
    return enabled;
  }

  return { toggle: toggle, pluck: pluck, chord: chord, noteOf: noteOf, get on() { return enabled; } };
})();
