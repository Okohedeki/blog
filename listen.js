const sample = document.querySelector('[data-listening-sample]');
const AudioEngine = window.AudioContext || window.webkitAudioContext;

if (sample && AudioEngine) {
  const play = sample.querySelector('[data-play]');
  const seek = sample.querySelector('[data-seek]');
  const clock = sample.querySelector('[data-clock]');
  const head = sample.querySelector('.playhead');
  const status = sample.querySelector('[data-status]');
  const choices = [...sample.querySelectorAll('[data-track]')];
  const labels = ['Full recording', 'Voice 01', 'Voice 02'];
  const urls = ['mix', 'voice-01', 'voice-02'].map(name => `assets/resonance-${name}.mp3`);
  let engine, buffers, source, loading;
  let track = 0, offset = 0, started = 0, playing = false, busy = false;
  const duration = 20;
  const position = () => Math.min(duration, offset + (playing ? engine.currentTime - started : 0));

  function paint() {
    const time = position();
    seek.value = time;
    seek.setAttribute('aria-valuetext', `${Math.floor(time)} of 20 seconds`);
    clock.textContent = `0:${String(Math.floor(time)).padStart(2, '0')} / 0:20`;
    head.style.left = `${time / duration * 100}%`;
    play.textContent = playing ? 'Ⅱ' : '▶';
    play.setAttribute('aria-label', playing ? 'Pause sample' : 'Play sample');
  }

  function stop() {
    offset = position();
    playing = false;
    if (source) {
      source.onended = null;
      source.stop();
      source.disconnect();
      source = null;
    }
  }

  function start() {
    if (offset >= duration) offset = 0;
    source = engine.createBufferSource();
    source.buffer = buffers[track];
    source.connect(engine.destination);
    started = engine.currentTime;
    playing = true;
    source.onended = () => {
      playing = false;
      offset = duration;
      source = null;
      status.textContent = 'Sample ended. Play to listen again.';
      paint();
    };
    source.start(0, offset, duration - offset);
    status.textContent = `Listening to ${labels[track].toLowerCase()}.`;
    paint();
  }

  async function prepare() {
    engine ||= new AudioEngine();
    await engine.resume();
    if (buffers) return;
    loading ||= Promise.all(urls.map(async url => {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Audio unavailable');
      return engine.decodeAudioData(await response.arrayBuffer());
    })).then(result => { buffers = result; }).catch(error => { loading = null; throw error; });
    await loading;
  }

  play.addEventListener('click', async () => {
    if (busy) return;
    if (playing) {
      stop();
      status.textContent = 'Paused. Switch voices or continue listening.';
      paint();
      return;
    }
    busy = true;
    play.setAttribute('aria-busy', 'true');
    status.textContent = 'Loading the listening sample…';
    try {
      await prepare();
      start();
    } catch {
      status.textContent = 'Audio could not load. Try Play again or open the audio files below.';
    } finally {
      busy = false;
      play.removeAttribute('aria-busy');
    }
  });

  choices.forEach((button, index) => button.addEventListener('click', () => {
    const resume = playing;
    if (resume) stop();
    track = index;
    choices.forEach((choice, i) => choice.setAttribute('aria-pressed', String(i === track)));
    if (resume) start();
    else status.textContent = `${labels[track]} selected. Press Play to listen.`;
  }));

  seek.addEventListener('input', () => {
    const resume = playing;
    const next = Number(seek.value);
    if (resume) stop();
    offset = next;
    if (resume && offset < duration) start();
    paint();
  });

  function tick() {
    if (playing) paint();
    requestAnimationFrame(tick);
  }
  window.addEventListener('pagehide', () => {
    if (playing) stop();
    engine?.suspend();
  });
  sample.classList.add('is-ready');
  paint();
  tick();
}
