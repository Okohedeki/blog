const score = document.querySelector('[data-score]');

if (score) {
  const button = document.querySelector('[data-score-toggle]');
  const reading = document.querySelector('[data-score-reading]');
  const rows = [...score.querySelectorAll('.staff')];
  const notes = [...score.querySelectorAll('.word-note')];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const beatLength = 1400;
  let paused = reduced.matches;
  let visible = true;
  let elapsed = 0;
  let previousTime = 0;
  let frame = 0;
  let active = -1;
  let positions = [];

  function measure() {
    positions = rows.map(row => {
      const box = row.getBoundingClientRect();
      return [...row.querySelectorAll('.word-note')].map(note => {
        const word = note.getBoundingClientRect();
        return word.left - box.left + word.width / 2;
      });
    });
    draw();
  }

  function draw() {
    const beat = elapsed / beatLength;
    const index = Math.floor(beat) % notes.length;
    const rowIndex = Math.floor(index / 5);
    const within = index % 5;
    if (active !== index) {
      notes.forEach((note, i) => note.classList.toggle('is-current', i === index));
      rows.forEach((row, i) => row.classList.toggle('is-current', i === rowIndex));
      active = index;
    }
    if (!positions[rowIndex]) return;
    const start = positions[rowIndex][within];
    const end = positions[rowIndex][within + 1] ?? rows[rowIndex].clientWidth - 5;
    const fraction = beat - Math.floor(beat);
    rows[rowIndex].querySelector('.score-cursor').style.left = `${start + (end - start) * fraction}px`;
  }

  function animate(time) {
    if (previousTime) elapsed = (elapsed + Math.min(time - previousTime, 100)) % (notes.length * beatLength);
    previousTime = time;
    draw();
    frame = requestAnimationFrame(animate);
  }

  function sync() {
    cancelAnimationFrame(frame);
    previousTime = 0;
    const running = !paused && visible && !document.hidden;
    score.dataset.running = String(running);
    button.textContent = paused ? 'Play motion' : 'Pause motion';
    if (running) frame = requestAnimationFrame(animate);
  }

  button.addEventListener('click', () => {
    paused = !paused;
    sync();
  });
  reading.addEventListener('toggle', () => {
    if (reading.open) {
      paused = true;
      sync();
    }
  });
  reduced.addEventListener('change', event => {
    if (event.matches) paused = true;
    sync();
  });
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('resize', measure);
  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(frame);
    score.dataset.running = 'false';
  });
  window.addEventListener('pageshow', sync);
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    sync();
  }).observe(score);
  button.hidden = false;
  measure();
  sync();
}
