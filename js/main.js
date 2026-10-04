import { createParticles } from './particles.js';

const { gsap, ScrollTrigger } = window;
gsap.registerPlugin(ScrollTrigger);

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

const isTouch = matchMedia('(hover: none), (pointer: coarse)').matches;
const isMobile = () => window.innerWidth <= 900;

/* =========================================================
   Scroll suave (Lenis)
   ========================================================= */
let lenis = null;
if (window.Lenis) {
  lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}
history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

function scrollToTarget(el) {
  if (lenis) lenis.scrollTo(el, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else el.scrollIntoView({ behavior: 'smooth' });
}

/* =========================================================
   Partículas (WebGL)
   ========================================================= */
let gl = null;
try {
  gl = createParticles($('.webgl'), { count: isMobile() ? 6400 : 12100, mobile: isMobile() });
} catch (err) {
  console.warn('WebGL indisponível:', err);
  $('.webgl')?.remove();
}

/*
  Segmentos de scroll → propriedades das partículas.
  Para cada propriedade, vale o ÚLTIMO segmento (na ordem do documento) que já começou.
  Assim, pular direto para qualquer âncora sempre resulta no estado certo.
  `from`/`to` podem ser números ou funções (valor calculado na hora).
*/
const segments = [];
function segment(st, prop, from, to) {
  const s = { st, prop, from, to };
  segments.push(s);
  return () => segments.splice(segments.indexOf(s), 1);
}
const val = (v) => (typeof v === 'function' ? v() : v);
const defaults = () => (isMobile()
  ? { morph: 0, opacity: 1, x: 0, y: 1.45, scale: 0.6 }
  : { morph: 0, opacity: 1, x: 1.55, y: 0.5, scale: 1 });

gsap.ticker.add(() => {
  if (!gl) return;
  const v = defaults();
  for (const s of segments) {
    const p = s.st.progress;
    if (p > 0) {
      const a = val(s.from), b = val(s.to);
      v[s.prop] = a + (b - a) * p;
    }
  }
  Object.assign(gl.target, v);
});

/* =========================================================
   Split de texto
   ========================================================= */
function splitWords(el, cls = 'w') {
  const frag = document.createDocumentFragment();
  [...el.childNodes].forEach((node) => {
    if (node.nodeType !== Node.TEXT_NODE) { frag.append(node.cloneNode(true)); return; }
    node.textContent.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) { frag.append(' '); return; }
      if (cls === 'w') {
        const w = document.createElement('span'); w.className = 'w';
        const wi = document.createElement('span'); wi.className = 'wi'; wi.textContent = part;
        w.append(wi); frag.append(w);
      } else {
        const w = document.createElement('span'); w.className = cls; w.textContent = part;
        frag.append(w);
      }
    });
  });
  el.textContent = '';
  el.append(frag);
}

$$('[data-split]').forEach((el) => splitWords(el));
$$('[data-reveal-words]').forEach((el) => splitWords(el, 'rw'));
gsap.set('[data-split] .wi', { yPercent: 115 });

/* =========================================================
   Preloader
   ========================================================= */
function runPreloader() {
  const pre = $('.preloader');
  const text = $('.preloader__text');
  const count = $('.count');
  const words = ['Olá', 'Hola', 'Hello', 'Bonjour', 'Ciao', 'Hallo', 'Olá'];

  return new Promise((resolve) => {
    const tl = gsap.timeline();
    const counter = { v: 0 };
    tl.to(counter, {
      v: 100, duration: 2.2, ease: 'power2.inOut',
      onUpdate: () => { count.textContent = Math.round(counter.v); },
    }, 0);
    words.forEach((w, i) => tl.call(() => { text.textContent = w; }, null, i === 0 ? 0 : 0.5 + i * 0.26));
    tl.to('.preloader__word, .preloader__count', { opacity: 0, y: -30, duration: 0.4, ease: 'power2.in' }, 2.35);
    tl.to(pre, { yPercent: -100, duration: 1.0, ease: 'power4.inOut' }, 2.6);
    tl.to('.preloader__curve path', { attr: { d: 'M0 0 Q500 0 1000 0 Z' }, duration: 1.0, ease: 'power4.inOut' }, 2.6);
    tl.call(resolve, null, 2.95); // libera a intro enquanto a cortina sobe
    tl.call(() => pre.remove(), null, 3.7);
  });
}

function intro() {
  document.body.classList.remove('is-loading');
  lenis?.start();

  if (gl) gsap.to(gl.uniforms.uIntro, { value: 1, duration: 3, ease: 'power2.out' });

  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.from('.hero__marquee .marquee__track', { yPercent: 100, duration: 1.6 }, 0)
    .to('.hero__title .wi', { yPercent: 0, duration: 1.4, stagger: 0.05 }, 0.1)
    .from('.header > *', { y: -30, opacity: 0, duration: 1.2, stagger: 0.1 }, 0.2)
    .from('.hero__meta > *, .hero__scroll', { y: 20, opacity: 0, duration: 1.2, stagger: 0.07 }, 0.35);
}

runPreloader().then(intro);

/* =========================================================
   Nome no hero
   - Com várias cópias no HTML: letreiro em movimento (direção acompanha o scroll)
   - Com uma cópia só: fica parado, ocupando a largura da tela
   ========================================================= */
(() => {
  const wrap = $('.hero__marquee');
  const track = $('.marquee__track', wrap);
  if (!track) return;

  if (track.children.length < 2) {
    wrap.classList.add('is-static');
    const name = track.firstElementChild;
    const fit = () => {
      name.style.fontSize = '100px';
      const pad = parseFloat(getComputedStyle(track).paddingLeft) * 2;
      // 92% da largura útil (sem a barra de rolagem) para as letras não encostarem na borda
      const width = (document.documentElement.clientWidth - pad) * 0.92;
      name.style.fontSize = `${(100 * width) / name.offsetWidth}px`;
    };
    fit();
    document.fonts?.ready.then(fit);
    window.addEventListener('resize', fit);
  } else {
    let x = 0, dir = -1, boost = 0;
    lenis?.on('scroll', (e) => {
      if (e.direction) dir = e.direction === 1 ? -1 : 1;
      boost = Math.min(Math.abs(e.velocity) * 0.04, 1.2);
    });
    const step = 100 / track.children.length;
    gsap.ticker.add((_, delta) => {
      x += dir * (0.0045 + boost * 0.012) * delta;
      boost *= 0.94;
      if (x <= -step) x += step;
      if (x > 0) x -= step;
      gsap.set(track, { xPercent: x });
    });
  }

  // parallax de saída do hero
  gsap.to(wrap, { yPercent: -40, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__top', { y: -80, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: '70% top', scrub: true } });
})();

/* =========================================================
   Letreiros infinitos (logos e competências)
   O HTML lista cada item uma vez; aqui repetimos até cobrir a tela
   e duplicamos tudo, para o CSS andar 50% e fechar o loop sem emenda.
   ========================================================= */
function fillMarquee(track) {
  const originals = [...track.children];
  const cloneSet = () => originals.forEach((el) => {
    const c = el.cloneNode(true);
    c.setAttribute('aria-hidden', 'true');
    if (c.tagName === 'IMG') c.alt = '';
    track.append(c);
  });
  let guard = 0;
  while (track.scrollWidth < window.innerWidth * 1.1 && guard++ < 20) cloneSet();
  [...track.children].forEach((el) => {
    const c = el.cloneNode(true);
    c.setAttribute('aria-hidden', 'true');
    if (c.tagName === 'IMG') c.alt = '';
    track.append(c);
  });
}
window.addEventListener('load', () => $$('[data-marquee]').forEach(fillMarquee));

/* =========================================================
   Animações de scroll
   ========================================================= */
// Títulos com máscara
$$('[data-split]').forEach((el) => {
  if (el.closest('.hero')) return;
  gsap.to($$('.wi', el), {
    yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: 0.06,
    scrollTrigger: { trigger: el, start: 'top 88%' },
  });
});

// Frase do "Sobre": cada palavra vai do cinza ao branco com o scroll e fica branca
$$('[data-reveal-words]').forEach((el) => {
  gsap.to($$('.rw', el), {
    opacity: 1, stagger: 0.1, ease: 'none',
    scrollTrigger: { trigger: el, start: 'top 85%', end: 'bottom 60%', scrub: 0.6 },
  });
});

// Foto com parallax
gsap.fromTo('.about__photo img', { yPercent: 0 }, {
  yPercent: -16, ease: 'none',
  scrollTrigger: { trigger: '.about__photo', start: 'top bottom', end: 'bottom top', scrub: true },
});
gsap.from('.about__photo', {
  clipPath: 'inset(100% 0 0 0)', duration: 1.6, ease: 'expo.out',
  scrollTrigger: { trigger: '.about__photo', start: 'top 85%' },
});

// Elementos que sobem ao entrar
const fadeEls = '.about__text > *, .job, .tool, .course, .ai__lead, .ai__item, .plist, .quotes, .quotes__nav, .contact__pills, .footer__col';
gsap.set(fadeEls, { y: 50, opacity: 0 });
ScrollTrigger.batch(fadeEls, {
  start: 'top 92%',
  onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, duration: 1.1, ease: 'expo.out', stagger: 0.08, overwrite: true, clearProps: 'transform,opacity' }),
});

// Círculo de contato com leve parallax
gsap.from('.contact__circle', {
  y: 120, ease: 'none',
  scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'center center', scrub: true },
});

/* =========================================================
   Partículas por seção
   ========================================================= */
const mm = gsap.matchMedia();

mm.add({ desktop: '(min-width: 901px)', mobile: '(max-width: 900px)' }, (ctx) => {
  const { desktop } = ctx.conditions;
  const cleanups = [];
  const st = (vars) => {
    const t = ScrollTrigger.create(vars);
    cleanups.push(() => t.kill());
    return t;
  };

  // Hero → Sobre: galáxia centraliza e dissolve em "dados brutos"
  const d = defaults();
  const toCenter = st({ trigger: '.about', start: 'top bottom', end: 'top 20%' });
  cleanups.push(
    segment(toCenter, 'x', d.x, 0),
    segment(toCenter, 'y', d.y, 0),
    segment(toCenter, 'scale', d.scale, desktop ? 1 : 0.7),
  );
  const toChaos = st({ trigger: '.about', start: 'top 60%', end: 'bottom 70%' });
  cleanups.push(segment(toChaos, 'morph', 0, 1));
  const dimAbout = st({ trigger: '.about__photo-wrap', start: 'top 85%', end: 'top 40%' });
  cleanups.push(segment(dimAbout, 'opacity', 1, 0.45));

  // Processo: a forma muda conforme o scroll atravessa a seção
  const enterProcess = st({ trigger: '.process', start: 'top 80%', end: 'top 30%' });
  cleanups.push(segment(enterProcess, 'opacity', 0.45, 1));
  if (desktop) {
    // forma 3D à direita/acima, deixando espaço para o título e os cards
    cleanups.push(
      segment(enterProcess, 'x', 0, 1.45),
      segment(enterProcess, 'y', 0, 0.42),
      segment(enterProcess, 'scale', 1, 0.82),
    );
  }
  const inProcess = st({ trigger: '.process', start: 'top 70%', end: 'bottom 40%' });
  cleanups.push(segment(inProcess, 'morph', 1, 5));

  // Seções de leitura: partículas viram barras e recuam
  const dim = st({ trigger: '.experience', start: 'top 85%', end: 'top 25%' });
  cleanups.push(segment(dim, 'opacity', 1, 0.28));
  const shift = st({ trigger: '.experience', start: 'top bottom', end: 'top top' });
  cleanups.push(
    segment(shift, 'x', desktop ? 1.45 : 0, desktop ? 1.7 : 0),
    segment(shift, 'y', desktop ? 0.42 : 0, 0),
  );

  // Contato: barras viram onda e voltam a brilhar
  const toWave = st({ trigger: '.contact', start: 'top bottom', end: 'top 25%' });
  cleanups.push(
    segment(toWave, 'morph', 5, 6),
    segment(toWave, 'opacity', 0.28, 1),
    segment(toWave, 'x', desktop ? 1.7 : 0, 0),
    segment(toWave, 'y', 0, desktop ? -0.2 : -0.6),
    segment(toWave, 'scale', desktop ? 0.82 : 0.7, desktop ? 1 : 0.7),
  );

  // Botão de menu aparece depois do hero (desktop)
  const menuBtn = $('.menu-btn');
  if (desktop) {
    gsap.set(menuBtn, { scale: 0 });
    st({
      trigger: '.hero', start: 'bottom 85%',
      onEnter: () => gsap.to(menuBtn, { scale: 1, duration: 0.5, ease: 'back.out(2)' }),
      onLeaveBack: () => { if (!menuBtn.classList.contains('is-open')) gsap.to(menuBtn, { scale: 0, duration: 0.4, ease: 'power3.in' }); },
    });
  } else {
    gsap.set(menuBtn, { scale: 1 });
  }

  return () => cleanups.forEach((fn) => fn());
});

/* =========================================================
   Menu
   ========================================================= */
const menuBtn = $('.menu-btn');
const menu = $('.menu');
function setMenu(open) {
  menu.classList.toggle('is-open', open);
  menuBtn.classList.toggle('is-open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-hidden', String(!open));
  if (open) {
    gsap.fromTo('.menu__links a', { x: 80, opacity: 0 }, { x: 0, opacity: 1, duration: 1, ease: 'expo.out', stagger: 0.05, delay: 0.2 });
  } else if (!isMobile() && window.scrollY < window.innerHeight * 0.8) {
    gsap.to(menuBtn, { scale: 0, duration: 0.4, ease: 'power3.in' });
  }
}
menuBtn.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));

// Âncoras com scroll suave
$$('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    const el = id.length > 1 && $(id);
    if (!el) return;
    e.preventDefault();
    setMenu(false);
    scrollToTarget(el);
  });
});

/* =========================================================
   Cursor + magnetismo
   ========================================================= */
if (!isTouch) {
  const dot = $('.cursor-dot');
  const big = $('.cursor');
  const label = $('.cursor__label');
  gsap.set(big, { scale: 0 });

  const dx = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3' });
  const dy = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3' });
  const bx = gsap.quickTo(big, 'x', { duration: 0.55, ease: 'power3' });
  const by = gsap.quickTo(big, 'y', { duration: 0.55, ease: 'power3' });

  window.addEventListener('pointermove', (e) => { dx(e.clientX); dy(e.clientY); bx(e.clientX); by(e.clientY); });

  document.addEventListener('pointerover', (e) => {
    const labelled = e.target.closest('[data-cursor]');
    const hov = e.target.closest('a, button, summary, [data-magnetic]');
    if (labelled) {
      label.textContent = labelled.dataset.cursor;
      gsap.to(big, { scale: 1, duration: 0.45, ease: 'expo.out' });
      gsap.to(dot, { scale: 0, duration: 0.2 });
    } else {
      gsap.to(big, { scale: 0, duration: 0.35, ease: 'power3.out' });
      gsap.to(dot, { scale: 1, duration: 0.2 });
    }
    dot.classList.toggle('is-hover', !!hov && !labelled);
  });

  $$('[data-magnetic]').forEach((el) => {
    const strength = parseFloat(el.dataset.magneticStrength || 0.35);
    const xTo = gsap.quickTo(el, 'x', { duration: 1, ease: 'elastic.out(1, 0.35)' });
    const yTo = gsap.quickTo(el, 'y', { duration: 1, ease: 'elastic.out(1, 0.35)' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * strength);
      yTo((e.clientY - (r.top + r.height / 2)) * strength);
    });
    el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
  });
}

/* =========================================================
   Projetos: filtro, preview que segue o mouse e modal
   ========================================================= */
(() => {
  const rows = $$('.prow');
  $$('.filter').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.filter').forEach((b) => b.classList.toggle('is-active', b === btn));
      const f = btn.dataset.filter;
      const visible = rows.filter((r) => f === 'all' || r.dataset.tags.split(' ').includes(f));
      rows.forEach((r) => r.classList.toggle('is-hidden', !visible.includes(r)));
      gsap.fromTo(visible, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'expo.out', stagger: 0.06, clearProps: 'transform,opacity' });
      ScrollTrigger.refresh();
    });
  });

  // Preview
  const preview = $('.preview');
  const img = $('.preview__img');
  const plist = $('.plist');
  if (!isTouch && preview) {
    const px = gsap.quickTo(preview, 'x', { duration: 0.6, ease: 'power3' });
    const py = gsap.quickTo(preview, 'y', { duration: 0.6, ease: 'power3' });
    gsap.set(preview, { scale: 0 });
    // Escala com controlador próprio: cada chamada só redireciona a mesma animação,
    // então "mostrar" e "esconder" nunca disputam entre si nem apagam o x/y que segue o mouse
    // (quickTo não aceita o atalho "scale", por isso um controlador para cada eixo)
    const sx = gsap.quickTo(preview, 'scaleX', { duration: 0.45, ease: 'power3.out' });
    const sy = gsap.quickTo(preview, 'scaleY', { duration: 0.45, ease: 'power3.out' });
    const ps = (v) => { sx(v); sy(v); };
    plist.addEventListener('pointermove', (e) => { px(e.clientX); py(e.clientY); });
    rows.forEach((row) => {
      row.addEventListener('pointerenter', () => {
        const src = row.dataset.preview;
        if (!src) { ps(0); return; }
        preview.classList.toggle('is-lk', src === 'lk');
        if (src !== 'lk') img.src = src;
        ps(1);
      });
    });
    plist.addEventListener('pointerleave', () => ps(0));
  }

  // Modal
  const modal = $('.modal');
  document.body.append(modal); // fora do <main> para ficar acima do botão de menu
  let lastFocus = null;
  function openModal(id) {
    lastFocus = document.activeElement;
    $$('.modal__content').forEach((c) => c.classList.toggle('is-active', c.dataset.content === id));
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    $('.modal__panel').scrollTop = 0;
    lenis?.stop();
    gsap.fromTo('.modal__content.is-active > *', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'expo.out', stagger: 0.05, delay: 0.25 });
    setTimeout(() => $('.modal__close').focus(), 50);
  }
  function closeModal() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    lenis?.start();
    lastFocus?.focus?.();
  }
  rows.forEach((r) => r.dataset.project && r.addEventListener('click', () => openModal(r.dataset.project)));
  $$('[data-close]', modal).forEach((el) => el.addEventListener('click', closeModal));
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (modal.classList.contains('is-open')) closeModal();
    else if (menu.classList.contains('is-open')) setMenu(false);
  });
})();

/* =========================================================
   Cards de ferramentas com tilt
   ========================================================= */
if (!isTouch) {
  $$('[data-tilt]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.style.setProperty('--mx', `${x * 100}%`);
      el.style.setProperty('--my', `${y * 100}%`);
      gsap.to(el, { rotateY: (x - 0.5) * 14, rotateX: -(y - 0.5) * 14, transformPerspective: 700, duration: 0.5, ease: 'power3' });
    });
    el.addEventListener('pointerleave', () => gsap.to(el, { rotateX: 0, rotateY: 0, duration: 0.8, ease: 'elastic.out(1, 0.4)' }));
  });
}

/* =========================================================
   Depoimentos
   ========================================================= */
(() => {
  const quotes = $$('.quote');
  const idx = $('.qi');
  let i = 0, timer;
  function go(dir) {
    const cur = quotes[i];
    i = (i + dir + quotes.length) % quotes.length;
    const next = quotes[i];
    idx.textContent = String(i + 1).padStart(2, '0');
    gsap.to(cur, { opacity: 0, y: -24 * dir, duration: 0.5, ease: 'power3.in', onComplete: () => cur.classList.remove('is-active') });
    next.classList.add('is-active');
    gsap.fromTo(next, { opacity: 0, y: 24 * dir }, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', delay: 0.45 });
    restart();
  }
  function restart() { clearInterval(timer); timer = setInterval(() => go(1), 11000); }
  $$('.qbtn').forEach((b) => b.addEventListener('click', () => go(Number(b.dataset.dir))));
  restart();
})();

/* =========================================================
   Relógio de São Paulo
   ========================================================= */
(() => {
  const el = $('.clock');
  const fmt = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  const tick = () => { el.textContent = `${fmt.format(new Date())} GMT-3`; };
  tick();
  setInterval(tick, 15000);
})();

window.addEventListener('load', () => ScrollTrigger.refresh());
