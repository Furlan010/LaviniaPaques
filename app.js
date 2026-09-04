(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const intro = $('#intro');
  const gate = $('#gate');
  const experience = $('#experience');
  const toast = $('#toast');
  const state = {
    unlocked: false,
    fragments: [null, null, null, null],
    hairDone: false,
    shoppingDone: false,
    etecDone: false,
    timelineDone: false,
    memoryDone: false,
  };

  // -------- tiny helpers --------
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const normalize = (s = '') => s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');

  function showToast(message, duration = 2300) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.t);
    showToast.t = setTimeout(() => toast.classList.remove('show'), duration);
  }

  function reveal(el) {
    if (!el) return;
    el.classList.remove('is-hidden');
    el.classList.add('reveal-in');
  }

  function smoothTo(el) {
    if (!el) return;
    setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 90);
  }

  // -------- ambient particles --------
  const canvas = $('#ambient');
  const ctx = canvas.getContext('2d');
  let particles = [];
  let width = 0, height = 0, dpr = 1;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resizeCanvas() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    width = innerWidth;
    height = innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.max(18, Math.min(42, Math.floor(width / 13)));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.25 + .25,
      a: Math.random() * .23 + .05,
      vy: Math.random() * .12 + .025,
      vx: (Math.random() - .5) * .06,
    }));
  }

  function drawAmbient() {
    if (reduced) return;
    ctx.clearRect(0, 0, width, height);
    particles.forEach(p => {
      p.y -= p.vy; p.x += p.vx;
      if (p.y < -8) { p.y = height + 8; p.x = Math.random() * width; }
      if (p.x < -8) p.x = width + 8;
      if (p.x > width + 8) p.x = -8;
      ctx.beginPath();
      ctx.fillStyle = `rgba(210, 105, 125, ${p.a})`;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    requestAnimationFrame(drawAmbient);
  }
  resizeCanvas();
  addEventListener('resize', resizeCanvas, { passive: true });
  if (!reduced) requestAnimationFrame(drawAmbient);

  // -------- music (only appears if user adds the file) --------
  const music = $('#bgMusic');
  const musicControl = $('#musicControl');
  musicControl.classList.add('is-hidden');

  async function detectMusic() {
    if (location.protocol === 'file:') return;
    try {
      const res = await fetch('nossa-musica.mp3', { method: 'HEAD', cache: 'no-store' });
      if (res.ok) musicControl.classList.remove('is-hidden');
    } catch (_) {}
  }
  detectMusic();

  musicControl.addEventListener('click', async () => {
    try {
      if (music.paused) {
        await music.play();
        musicControl.classList.add('playing');
        $('.music-label').textContent = '♪ pausAR';
      } else {
        music.pause();
        musicControl.classList.remove('playing');
        $('.music-label').textContent = '♪ nossa música';
      }
    } catch (_) {
      showToast('a música ainda não foi adicionada :)');
    }
  });

  // -------- intro & gate --------
  $('#startBtn').addEventListener('click', () => {
    intro.classList.add('is-hidden');
    reveal(gate);
    $('#passwordInput').focus({ preventScroll: true });
  });
  $('#backToIntro').addEventListener('click', () => {
    gate.classList.add('is-hidden');
    reveal(intro);
  });

  // -------- password puzzle --------
  const password = 'lala do gu';
  const letters = [...password];
  let hintLevel = 0;
  let wrongAttempts = 0;
  const revealSets = [[], [0], [0, 2, 9], [0, 1, 2, 3, 8, 9]];
  const hints = [
    'não é uma data. é um apelido que só faz sentido do nosso jeito.',
    'começa com a mesma letra do seu nome.',
    'tem uma parte sua e uma parte minha na mesma resposta.'
  ];

  function renderPasswordSlots() {
    const wrap = $('#passwordSlots');
    wrap.innerHTML = '';
    letters.forEach((ch, i) => {
      const s = document.createElement('span');
      if (ch === ' ') {
        s.className = 'slot space';
      } else {
        const show = revealSets[hintLevel]?.includes(i);
        s.className = `slot${show ? ' revealed' : ''}`;
        s.textContent = show ? ch.toUpperCase() : '•';
      }
      wrap.appendChild(s);
    });
  }
  renderPasswordSlots();

  $('#hintBtn').addEventListener('click', () => {
    if (hintLevel >= 3) {
      showToast('agora eu já ajudei demais 😭');
      return;
    }
    hintLevel += 1;
    const item = document.createElement('div');
    item.className = 'hint-item reveal-in';
    item.textContent = hints[hintLevel - 1];
    $('#hintList').appendChild(item);
    $('#hintCount').textContent = `${hintLevel}/3`;
    renderPasswordSlots();
    if (hintLevel === 3) $('#hintBtn').textContent = 'última dica liberada';
  });

  const wrongMessages = [
    'nem ferrando que você esqueceu 😭',
    'pensa em como EU te chamo.',
    'tá mais perto do que parece.',
    'eu sei que você sabe essa, vai.',
  ];

  async function submitPassword() {
    const input = $('#passwordInput');
    const feedback = $('#passwordFeedback');
    if (!input.value.trim()) {
      feedback.textContent = 'digita alguma coisa primeiro, né?';
      feedback.className = 'feedback error';
      return;
    }
    if (normalize(input.value) === password) {
      feedback.textContent = 'sabia que você ia lembrar.';
      feedback.className = 'feedback success';
      state.unlocked = true;
      localStorage.setItem('lavinia-unlocked', '1');
      input.blur();
      await sleep(1050);
      gate.classList.add('is-hidden');
      reveal(experience);
      scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    wrongAttempts += 1;
    feedback.textContent = wrongMessages[(wrongAttempts - 1) % wrongMessages.length];
    feedback.className = 'feedback error';
    input.select();
    if (wrongAttempts === 2 && hintLevel < 1) $('#hintBtn').click();
    if (wrongAttempts === 4 && hintLevel < 2) $('#hintBtn').click();
  }
  $('#submitPassword').addEventListener('click', submitPassword);
  $('#passwordInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') submitPassword(); });

  // -------- fragment logic --------
  function collectFragment(index, value) {
    if (state.fragments[index] !== null) return;
    state.fragments[index] = value;
    localStorage.setItem('lavinia-fragments', JSON.stringify(state.fragments));
    $('#fragmentCount').textContent = state.fragments.filter(v => v !== null).length;
    const row = $$('#fragmentRow span');
    row.forEach((el, i) => { if (state.fragments[i] !== null) el.textContent = state.fragments[i]; });
  }

  // -------- chapter 1 envelope + quiz --------
  $('#openEnvelope').addEventListener('click', async () => {
    const env = $('#openEnvelope');
    if (env.classList.contains('open')) return;
    env.classList.add('open');
    await sleep(850);
    reveal($('#chapter1Quiz'));
    smoothTo($('#chapter1Quiz'));
  });

  $$('[data-question="hair"] .choice').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (state.hairDone) return;
      const fb = $('#hairFeedback');
      if (btn.dataset.answer !== 'cabelo') {
        btn.classList.add('wrong');
        setTimeout(() => btn.classList.remove('wrong'), 420);
        fb.textContent = 'essa eu esperava que você acertasse de primeira KKK';
        fb.className = 'feedback error';
        return;
      }
      state.hairDone = true;
      btn.classList.add('correct');
      fb.textContent = 'essa foi fácil. e foi literalmente onde tudo começou.';
      fb.className = 'feedback success';
      await sleep(650);
      reveal($('#hairReveal'));
      reveal($('#chapter2'));
      collectFragment(0, '2');
      smoothTo($('#hairReveal'));
    });
  });

  // -------- chapter 2 --------
  $$('[data-question="shopping"] .choice').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (state.shoppingDone) return;
      const fb = $('#shoppingFeedback');
      if (btn.dataset.answer !== 'shopping') {
        btn.classList.add('wrong');
        setTimeout(() => btn.classList.remove('wrong'), 420);
        fb.textContent = 'não, não, não… pensa naquele nervoso todo.';
        fb.className = 'feedback error';
        return;
      }
      state.shoppingDone = true;
      btn.classList.add('correct');
      fb.textContent = 'shopping. e os dois tentando fingir que tavam tranquilos.';
      fb.className = 'feedback success';
      await sleep(550);
      reveal($('#shoppingReveal'));
      reveal($('#chapter3'));
      collectFragment(1, '0');
      smoothTo($('#shoppingReveal'));
    });
  });

  const scrub = $('#memoryScrub');
  const scrubOverlay = $('#scrubOverlay');
  const scrubLine = $('#scrubLine');
  scrub.addEventListener('input', () => {
    const v = Number(scrub.value);
    scrubOverlay.style.width = `${v}%`;
    scrubLine.style.left = `${v}%`;
  }, { passive: true });

  // -------- chapter 3 result --------
  $('#revealResult').addEventListener('click', async () => {
    if (state.etecDone) return;
    state.etecDone = true;
    const terminal = $('#resultTerminal');
    const display = $('#resultDisplay');
    const status = $('#resultStatus');
    const btn = $('#revealResult');
    terminal.classList.add('loading');
    btn.disabled = true;
    btn.style.opacity = '.55';
    const words = ['procurando…', 'conferindo chamada…', 'quase lá…'];
    for (const word of words) {
      display.querySelector('strong').textContent = word;
      await sleep(620);
    }
    terminal.classList.remove('loading');
    display.querySelector('strong').textContent = 'última chamada';
    status.textContent = 'aprovado';
    status.style.color = '#cfe0c9';
    await sleep(500);
    reveal($('#etecReveal'));
    reveal($('#timelineGame'));
    collectFragment(2, '2');
    smoothTo($('#etecReveal'));
  });

  // -------- timeline game --------
  const timelineItems = [
    { id: 'story', order: 1, label: 'o story', img: '10-selfie-muro.jpeg' },
    { id: 'talk', order: 2, label: 'as conversas', img: '02-azul.jpeg' },
    { id: 'shopping', order: 3, label: 'o shopping', img: '06-shopping.jpeg' },
    { id: 'etec', order: 4, label: 'a ETEC', img: '03-espelho.jpeg' },
    { id: 'daily', order: 5, label: 'começar a se ver todo dia', img: '07-elevador.jpeg' },
    { id: 'us', order: 6, label: 'virar nós de verdade', img: '08-abraco.jpeg' },
  ];
  let timelineSelection = [];

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function renderTimeline() {
    timelineSelection = [];
    $('#selectionTrack').innerHTML = '';
    const grid = $('#timelineChoices');
    grid.innerHTML = '';
    shuffle(timelineItems).forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'timeline-option';
      btn.type = 'button';
      btn.dataset.id = item.id;
      btn.innerHTML = `<img src="${item.img}" alt="" loading="lazy"><span>${item.label}</span>`;
      btn.addEventListener('click', () => chooseTimeline(item, btn));
      grid.appendChild(btn);
    });
    $('#timelineFeedback').textContent = '';
  }

  async function chooseTimeline(item, btn) {
    if (state.timelineDone || btn.classList.contains('selected')) return;
    timelineSelection.push(item);
    btn.classList.add('selected');
    const chip = document.createElement('span');
    chip.className = 'selection-chip';
    chip.textContent = `${timelineSelection.length}. ${item.label}`;
    $('#selectionTrack').appendChild(chip);

    if (timelineSelection.length === timelineItems.length) {
      const ok = timelineSelection.every((x, i) => x.order === i + 1);
      if (!ok) {
        $('#timelineFeedback').textContent = 'quase. mas nossa história ficou meio bagunçada aí KKK';
        $('#timelineFeedback').className = 'feedback error';
        await sleep(850);
        renderTimeline();
        return;
      }
      state.timelineDone = true;
      $('#timelineFeedback').textContent = 'agora sim. na ordem que foi virando a gente.';
      $('#timelineFeedback').className = 'feedback success';
      await sleep(500);
      reveal($('#timelineSuccess'));
      reveal($('#memoryGame'));
      collectFragment(3, '5');
      smoothTo($('#timelineSuccess'));
    }
  }

  $('#resetTimeline').addEventListener('click', renderTimeline);
  renderTimeline();

  // -------- memory game --------
  const memoryImages = [
    '01-fullsize.jpeg',
    '04-colo.jpeg',
    '07-elevador.jpeg',
    '09-selfie-oculos.jpeg',
  ];
  let flipped = [];
  let matched = 0;
  let lockMemory = false;

  function renderMemory() {
    const deck = shuffle(memoryImages.flatMap((img, i) => [
      { pair: i, img, uid: `${i}-a` },
      { pair: i, img, uid: `${i}-b` },
    ]));
    const grid = $('#memoryGrid');
    grid.innerHTML = '';
    flipped = []; matched = 0; lockMemory = false;
    deck.forEach(card => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'memory-card';
      btn.dataset.pair = String(card.pair);
      btn.dataset.uid = card.uid;
      btn.setAttribute('aria-label', 'Carta fechada');
      btn.innerHTML = `<span class="memory-inner"><span class="memory-face memory-front"></span><span class="memory-face memory-back"><img src="${card.img}" alt="" loading="lazy"></span></span>`;
      btn.addEventListener('click', () => flipMemory(btn));
      grid.appendChild(btn);
    });
  }

  async function flipMemory(card) {
    if (lockMemory || card.classList.contains('flipped') || card.classList.contains('matched')) return;
    card.classList.add('flipped');
    flipped.push(card);
    if (flipped.length < 2) return;
    lockMemory = true;
    const [a, b] = flipped;
    if (a.dataset.pair === b.dataset.pair) {
      await sleep(360);
      a.classList.add('matched'); b.classList.add('matched');
      matched += 1;
      $('#memoryFeedback').textContent = `${matched}/4 pares encontrados`;
      $('#memoryFeedback').className = 'feedback success';
      flipped = [];
      lockMemory = false;
      if (matched === memoryImages.length) {
        state.memoryDone = true;
        await sleep(500);
        reveal($('#memoryComplete'));
        reveal($('#gallery'));
        smoothTo($('#memoryComplete'));
      }
    } else {
      await sleep(820);
      a.classList.remove('flipped'); b.classList.remove('flipped');
      flipped = [];
      lockMemory = false;
    }
  }
  renderMemory();

  // -------- gallery lightbox --------
  const lightbox = $('#lightbox');
  const lightboxImage = $('#lightboxImage');
  $$('.photo-card').forEach(card => {
    card.addEventListener('click', () => {
      lightboxImage.src = card.dataset.full;
      lightbox.classList.remove('is-hidden');
      document.body.style.overflow = 'hidden';
    });
  });
  function closeLightbox() {
    lightbox.classList.add('is-hidden');
    lightboxImage.src = '';
    document.body.style.overflow = '';
  }
  $('#lightboxClose').addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !lightbox.classList.contains('is-hidden')) closeLightbox(); });

  // -------- vault --------
  $('#wantKnow').addEventListener('click', () => {
    reveal($('#vault'));
    const row = $$('#fragmentRow span');
    row.forEach((el, i) => {
      const val = state.fragments[i];
      el.textContent = val ?? '?';
      if (val !== null) {
        el.animate([{ transform:'translateY(8px)', opacity:.2 }, { transform:'none', opacity:1 }], { duration:420, delay:i*140, fill:'both' });
      }
    });
    smoothTo($('#vault'));
  });

  async function unlockVault() {
    const input = $('#vaultInput');
    const fb = $('#vaultFeedback');
    if (state.fragments.some(v => v === null)) {
      fb.textContent = 'você pulou alguma coisa. faltam fragmentos.';
      fb.className = 'feedback error';
      return;
    }
    if (normalize(input.value) !== '2025') {
      fb.textContent = 'olha pros quatro fragmentos na ordem que você encontrou.';
      fb.className = 'feedback error';
      input.select();
      return;
    }
    fb.textContent = 'aberto.';
    fb.className = 'feedback success';
    input.blur();
    await sleep(700);
    reveal($('#finalLetter'));
    smoothTo($('#finalLetter'));
  }
  $('#unlockVault').addEventListener('click', unlockVault);
  $('#vaultInput').addEventListener('keydown', e => { if (e.key === 'Enter') unlockVault(); });

  // -------- scroll progress + subtle reveals --------
  function updateProgress() {
    if (experience.classList.contains('is-hidden')) return;
    const doc = document.documentElement;
    const max = doc.scrollHeight - innerHeight;
    const ratio = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    $('#progressBar').style.width = `${ratio * 100}%`;
  }
  addEventListener('scroll', updateProgress, { passive: true });
  addEventListener('resize', updateProgress, { passive: true });

  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal-in');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: .12, rootMargin: '0px 0px -8% 0px' });
  $$('.chapter-copy, .question-card, .result-terminal, .editorial-grid, .quiet-question').forEach(el => revealObserver.observe(el));

  // -------- resume only the gate, not the story answers --------
  if (new URLSearchParams(location.search).get('reset') === '1') {
    localStorage.removeItem('lavinia-unlocked');
    localStorage.removeItem('lavinia-fragments');
  } else {
    try {
      const savedFragments = JSON.parse(localStorage.getItem('lavinia-fragments') || 'null');
      if (Array.isArray(savedFragments) && savedFragments.length === 4) {
        state.fragments = savedFragments;
        $('#fragmentCount').textContent = state.fragments.filter(v => v !== null).length;
      }
    } catch (_) {}
  }
})();
