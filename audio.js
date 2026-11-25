(function (root) {
  'use strict';

  // Suara dibangkitkan langsung oleh Web Audio API, tanpa file audio dan tanpa internet.
  // Default mati. Pilihan pemain disimpan di localStorage dan boleh gagal tanpa merusak game.
  var PREF = 'kuis-hantu-sound-v1';
  var AudioCtor = root.AudioContext || root.webkitAudioContext;
  var doc = root.document;

  var ctx = null;
  var master = null;
  var analyser = null;
  var noiseBuffer = null;
  var enabled = false;
  var gestured = false;
  var wantAmbience = false;
  var amb = null;
  var eventTimer = 0;
  var stageIndex = 0;
  var BASE = [55, 58.27, 51.91, 61.74, 49, 46.25];

  function readPref() {
    try { return root.localStorage.getItem(PREF) === 'on'; } catch (_) { return false; }
  }
  function writePref(on) {
    try { root.localStorage.setItem(PREF, on ? 'on' : 'off'); } catch (_) { /* abaikan */ }
  }

  function ensure() {
    if (!AudioCtor) return null;
    if (!ctx) {
      ctx = new AudioCtor();
      master = ctx.createGain();
      master.gain.value = 0.55;
      analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      master.connect(analyser);
      analyser.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') {
      try { ctx.resume(); } catch (_) { /* abaikan */ }
    }
    return ctx;
  }

  function noise() {
    if (!noiseBuffer) {
      var length = ctx.sampleRate * 2;
      noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
      var data = noiseBuffer.getChannelData(0);
      for (var i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
  }

  function envelope(gain, time, peak, attack, decay) {
    gain.gain.cancelScheduledValues(time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(peak, time + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + attack + decay);
  }

  function tone(freq, o) {
    o = o || {};
    var attack = o.attack || 0.01;
    var decay = o.decay || 0.3;
    var t = ctx.currentTime + (o.at || 0);
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, t + attack + decay);
    envelope(gain, t, o.vol || 0.2, attack, decay);
    if (o.lowpass) {
      var filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = o.lowpass;
      osc.connect(filter);
      filter.connect(gain);
    } else {
      osc.connect(gain);
    }
    gain.connect(o.dest || master);
    osc.start(t);
    osc.stop(t + attack + decay + 0.05);
  }

  function burst(o) {
    o = o || {};
    var attack = o.attack || 0.01;
    var decay = o.decay || 0.2;
    var t = ctx.currentTime + (o.at || 0);
    var src = ctx.createBufferSource();
    src.buffer = noise();
    var filter = ctx.createBiquadFilter();
    filter.type = o.filter || 'bandpass';
    filter.frequency.setValueAtTime(o.freq || 1000, t);
    if (o.sweepTo) filter.frequency.exponentialRampToValueAtTime(o.sweepTo, t + attack + decay);
    filter.Q.value = o.q || 1;
    var gain = ctx.createGain();
    envelope(gain, t, o.vol || 0.2, attack, decay);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(o.dest || master);
    src.start(t, Math.random());
    src.stop(t + attack + decay + 0.05);
  }

  var SOUNDS = {
    on: function () {
      tone(220, { vol: 0.15, decay: 0.7 });
      tone(277.2, { at: 0.12, vol: 0.12, decay: 0.7 });
    },
    paper: function () {
      burst({ freq: 3500, filter: 'highpass', vol: 0.12, decay: 0.14 });
      burst({ at: 0.08, freq: 2500, filter: 'highpass', vol: 0.08, decay: 0.1 });
    },
    hint: function () {
      tone(440, { vol: 0.12, decay: 0.9 });
      tone(523.25, { at: 0.15, vol: 0.1, decay: 0.9 });
      tone(622.25, { at: 0.3, vol: 0.08, decay: 1 });
    },
    correct: function () {
      tone(196, { type: 'triangle', vol: 0.18, decay: 0.5, lowpass: 900 });
      tone(294, { at: 0.12, type: 'triangle', vol: 0.15, decay: 0.6, lowpass: 1200 });
      tone(1175, { at: 0.2, vol: 0.05, decay: 0.5 });
      burst({ freq: 4000, filter: 'highpass', vol: 0.06, decay: 0.05 });
    },
    wrong: function () {
      tone(110, { type: 'sawtooth', vol: 0.16, decay: 0.55, lowpass: 500 });
      tone(116.5, { type: 'sawtooth', vol: 0.14, decay: 0.55, lowpass: 500 });
      burst({ freq: 150, filter: 'lowpass', vol: 0.18, decay: 0.3 });
    },
    reset: function () {
      tone(300, { type: 'sawtooth', vol: 0.18, decay: 1, slideTo: 45, lowpass: 700 });
      burst({ freq: 900, sweepTo: 80, filter: 'lowpass', vol: 0.25, decay: 0.9 });
    },
    door: function () {
      tone(70, { type: 'sawtooth', vol: 0.12, attack: 0.05, decay: 0.9, slideTo: 180, lowpass: 420 });
      burst({ freq: 600, q: 6, vol: 0.07, attack: 0.1, decay: 0.9 });
      tone(60, { at: 0.95, vol: 0.3, decay: 0.4 });
    },
    scrap: function () {
      SOUNDS.paper();
      tone(1318.5, { at: 0.1, vol: 0.07, decay: 0.8 });
    },
    scare: function () {
      burst({ freq: 5000, sweepTo: 180, filter: 'lowpass', vol: 0.35, attack: 0.005, decay: 0.7 });
      tone(55, { vol: 0.45, attack: 0.005, decay: 0.9 });
      tone(233, { type: 'sawtooth', vol: 0.12, decay: 0.6, lowpass: 1400 });
      tone(247, { type: 'sawtooth', vol: 0.12, decay: 0.6, lowpass: 1400 });
      tone(311, { type: 'sawtooth', vol: 0.08, decay: 0.5, lowpass: 1400 });
    },
    sign: function () {
      for (var i = 0; i < 4; i += 1) burst({ at: i * 0.09, freq: 2400, q: 3, vol: 0.07, decay: 0.08 });
    },
    lift: function () {
      tone(880, { vol: 0.15, decay: 1.2 });
      tone(1320, { at: 0.02, vol: 0.07, decay: 1.2 });
      burst({ at: 0.4, freq: 120, filter: 'lowpass', vol: 0.2, attack: 0.2, decay: 0.8 });
    },
    ending: function () {
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
        tone(f, { at: i * 0.18, vol: 0.12, decay: 1.2 });
      });
    },
    start: function () {
      tone(70, { vol: 0.3, decay: 0.5 });
      burst({ freq: 300, sweepTo: 2500, filter: 'bandpass', vol: 0.15, attack: 0.4, decay: 0.15 });
    },
    tick: function () {
      tone(1300, { type: 'triangle', vol: 0.1, attack: 0.002, decay: 0.05 });
    },
    win: function () {
      [392, 493.88, 587.33, 783.99].forEach(function (f, i) {
        tone(f, { at: i * 0.12, vol: 0.12, decay: 1 });
      });
    },
    timeup: function () {
      tone(110, { vol: 0.3, attack: 0.01, decay: 1.8 });
      tone(164.8, { vol: 0.15, decay: 1.6 });
      burst({ freq: 200, filter: 'lowpass', vol: 0.15, decay: 1 });
    }
  };

  function play(name) {
    if (!enabled || !gestured) return;
    if (!ensure()) return;
    var fn = SOUNDS[name];
    if (!fn) return;
    try { fn(); } catch (_) { /* suara tidak boleh merusak game */ }
  }

  function ambientEvent() {
    if (!amb || !enabled) return;
    var pick = Math.random();
    try {
      if (pick < 0.4) {
        tone(80, { type: 'sawtooth', vol: 0.04, attack: 0.15, decay: 0.8, slideTo: 130, lowpass: 300 });
      } else if (pick < 0.75) {
        tone(90, { vol: 0.1, decay: 0.15 });
        tone(90, { at: 0.24, vol: 0.08, decay: 0.15 });
      } else {
        burst({ freq: 3000, sweepTo: 6000, filter: 'bandpass', q: 4, vol: 0.03, attack: 0.6, decay: 0.8 });
      }
    } catch (_) { /* abaikan */ }
    eventTimer = root.setTimeout(ambientEvent, 7000 + Math.random() * 9000);
  }

  function startAmbience() {
    wantAmbience = true;
    if (!enabled || !gestured || amb) return;
    if (!ensure()) return;
    var base = BASE[stageIndex] || BASE[0];
    var out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, ctx.currentTime);
    out.gain.exponentialRampToValueAtTime(0.9, ctx.currentTime + 3);
    out.connect(master);

    var lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 220;
    lowpass.connect(out);

    var saw = ctx.createGain();
    saw.gain.value = 0.05;
    saw.connect(lowpass);
    var o1 = ctx.createOscillator();
    var o2 = ctx.createOscillator();
    o1.type = 'sawtooth';
    o2.type = 'sawtooth';
    o1.frequency.value = base;
    o2.frequency.value = base * 1.0145;
    o1.connect(saw);
    o2.connect(saw);

    var sub = ctx.createOscillator();
    var subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.value = base / 2;
    subGain.gain.value = 0.09;
    sub.connect(subGain);
    subGain.connect(out);

    var lfo = ctx.createOscillator();
    var lfoGain = ctx.createGain();
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = 90;
    lfo.connect(lfoGain);
    lfoGain.connect(lowpass.frequency);

    var wind = ctx.createBufferSource();
    wind.buffer = noise();
    wind.loop = true;
    var windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 380;
    windFilter.Q.value = 0.8;
    var windGain = ctx.createGain();
    windGain.gain.value = 0.035;
    wind.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(out);
    var lfo2 = ctx.createOscillator();
    var lfo2Gain = ctx.createGain();
    lfo2.frequency.value = 0.11;
    lfo2Gain.gain.value = 0.025;
    lfo2.connect(lfo2Gain);
    lfo2Gain.connect(windGain.gain);

    [o1, o2, sub, lfo, wind, lfo2].forEach(function (node) { node.start(); });
    amb = { out: out, o1: o1, o2: o2, sub: sub, nodes: [o1, o2, sub, lfo, wind, lfo2] };
    eventTimer = root.setTimeout(ambientEvent, 4000 + Math.random() * 4000);
  }

  function stopAmbience() {
    wantAmbience = false;
    root.clearTimeout(eventTimer);
    if (!amb) return;
    var current = amb;
    amb = null;
    try {
      current.out.gain.cancelScheduledValues(ctx.currentTime);
      current.out.gain.setValueAtTime(Math.max(current.out.gain.value, 0.0001), ctx.currentTime);
      current.out.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
    } catch (_) { /* abaikan */ }
    root.setTimeout(function () {
      current.nodes.forEach(function (node) { try { node.stop(); } catch (_) { /* sudah berhenti */ } });
    }, 900);
  }

  function setStage(index) {
    stageIndex = Math.max(0, Math.min(BASE.length - 1, index | 0));
    if (!amb) return;
    var base = BASE[stageIndex];
    var t = ctx.currentTime;
    amb.o1.frequency.setTargetAtTime(base, t, 1.5);
    amb.o2.frequency.setTargetAtTime(base * 1.0145, t, 1.5);
    amb.sub.frequency.setTargetAtTime(base / 2, t, 1.5);
  }

  function updateButtons() {
    var buttons = doc.querySelectorAll('[data-sound-toggle]');
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].setAttribute('aria-pressed', String(enabled));
      buttons[i].textContent = enabled ? 'Suara: nyala' : 'Suara: mati';
    }
    var tip = doc.getElementById('sound-tip');
    if (tip) tip.hidden = enabled;
  }

  function setEnabled(on) {
    enabled = on;
    writePref(on);
    if (on) {
      gestured = true;
      ensure();
      play('on');
      if (wantAmbience) startAmbience();
    } else {
      var keep = wantAmbience;
      stopAmbience();
      wantAmbience = keep;
    }
    updateButtons();
  }

  function level() {
    if (!analyser) return 0;
    var data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);
    var sum = 0;
    for (var i = 0; i < data.length; i += 1) {
      var v = (data[i] - 128) / 128;
      sum += v * v;
    }
    return Math.sqrt(sum / data.length);
  }

  function init() {
    enabled = readPref() && !!AudioCtor;
    wantAmbience = !!(doc.body && doc.body.hasAttribute('data-ambience'));
    updateButtons();

    var buttons = doc.querySelectorAll('[data-sound-toggle]');
    for (var i = 0; i < buttons.length; i += 1) {
      if (!AudioCtor) {
        buttons[i].disabled = true;
        buttons[i].textContent = 'Suara tidak tersedia';
        continue;
      }
      buttons[i].addEventListener('click', function () { setEnabled(!enabled); });
    }

    function firstGesture() {
      gestured = true;
      doc.removeEventListener('pointerdown', firstGesture, true);
      doc.removeEventListener('keydown', firstGesture, true);
      if (enabled) {
        ensure();
        if (wantAmbience) startAmbience();
      }
    }
    doc.addEventListener('pointerdown', firstGesture, true);
    doc.addEventListener('keydown', firstGesture, true);

    doc.addEventListener('visibilitychange', function () {
      if (!ctx) return;
      try {
        if (doc.hidden) ctx.suspend();
        else if (enabled) ctx.resume();
      } catch (_) { /* abaikan */ }
    });
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();

  root.KuisAudio = {
    play: play,
    startAmbience: startAmbience,
    stopAmbience: stopAmbience,
    setStage: setStage,
    isEnabled: function () { return enabled; },
    level: level
  };
}(window));
