// Procedural sound: no audio files, everything is synthesized with WebAudio —
// an engine hum that follows speed, a two-tone police siren, gunshots, pickup
// blips and a soft radio bassline. Starts on the first user gesture.

export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let radioTimer = null;
  let started = false;

  function start() {
    if (started) return;
    started = true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0.0;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(ctx.destination);
      engineOsc.start();

      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 720;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0.0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(ctx.destination);
      sirenOsc.start();
      let high = false;
      window.setInterval(() => {
        if (!ctx || !sirenOsc) return;
        high = !high;
        sirenOsc.frequency.setTargetAtTime(high ? 960 : 720, ctx.currentTime, 0.05);
      }, 420);

      // Radio: a lazy sunset bassline, one note every half second.
      const notes = [55, 65.4, 49, 58.3, 55, 65.4, 73.4, 65.4];
      let step = 0;
      radioTimer = window.setInterval(() => {
        if (!ctx) return;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = notes[step % notes.length];
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.05, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
        step += 1;
      }, 500);
    } catch {
      ctx = null;
    }
  }

  function setEngine(speed, inCar) {
    if (!ctx || !engineOsc || !engineGain) return;
    const target = inCar ? 0.045 + Math.min(0.05, Math.abs(speed) * 0.0012) : 0.0;
    engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.1);
    engineOsc.frequency.setTargetAtTime(50 + Math.abs(speed) * 2.4, ctx.currentTime, 0.1);
  }

  function setSiren(wanted) {
    if (!ctx || !sirenGain) return;
    sirenGain.gain.setTargetAtTime(wanted > 0 ? 0.028 : 0.0, ctx.currentTime, 0.2);
  }

  function blip(freq, dur, vol) {
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch {
      // Sound is garnish; never let it break the game.
    }
  }

  function shot() {
    if (!ctx) return;
    try {
      const len = ctx.sampleRate * 0.12;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.value = 0.25;
      src.connect(g);
      g.connect(ctx.destination);
      src.start();
    } catch {
      // Ignore.
    }
  }

  return { start, setEngine, setSiren, blip, shot };
}
