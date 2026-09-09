/* Site-wide scroll reveals.

   One utility drives every reveal below the hero. Elements opt in through the
   existing [data-reveal] / [data-reveal-group] attributes already in the markup;
   the variant is inferred from what the element actually is, so nothing is
   wired by hand per element.

   IntersectionObserver decides *when* (it fires reliably no matter how fast the
   user scrolls, and needs no refresh after the pinned hero changes layout);
   GSAP does *what*. Elements are hidden only once GSAP is confirmed working, so
   if this script never runs — or motion is disabled — everything stays visible. */

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const HEADING_SEL = '.section-title, .cta-title';
const VARIANTS = [
  ['viewer', '.showcase-model'],
  ['image', '.proj-img, .showcase-img, .story-step, .video-item, .showcase-thumb'],
  ['card', '.proj-section, .exp-card'],
];

function variantOf(el) {
  const explicit = el.getAttribute('data-reveal');
  if (explicit) return explicit;
  if (el.matches(HEADING_SEL) || el.querySelector(HEADING_SEL)) return 'heading';
  for (const [name, sel] of VARIANTS) if (el.matches(sel)) return name;
  return 'base';
}

/* Split a heading into per-character spans. The original string is kept on the
   element as aria-label so screen readers still read one continuous phrase. */
function splitChars(el) {
  if (el.dataset.split === '1') return [...el.querySelectorAll('.rv-char')];
  const text = el.textContent;
  el.setAttribute('aria-label', text);
  el.textContent = '';
  const frag = document.createDocumentFragment();
  const chars = [];
  for (const ch of text) {
    const span = document.createElement('span');
    span.className = 'rv-char';
    span.setAttribute('aria-hidden', 'true');
    span.textContent = ch === ' ' ? ' ' : ch;
    frag.appendChild(span);
    chars.push(span);
  }
  el.appendChild(frag);
  el.dataset.split = '1';
  return chars;
}

/* A one-time camera ease for the interactive part viewers. It starts a little
   off the authored camera-orbit and settles exactly onto it, so the carefully
   tuned default orientations are preserved. */
function easeViewer(box, gsap) {
  const mv = box.querySelector('model-viewer');
  if (!mv || mv.dataset.rvEased === '1') return;
  mv.dataset.rvEased = '1';

  const authored = mv.getAttribute('camera-orbit');
  if (!authored) return;
  const parts = authored.trim().split(/\s+/);
  if (parts.length < 3) return;

  const theta = parseFloat(parts[0]);
  const phi = parseFloat(parts[1]);
  if (!isFinite(theta) || !isFinite(phi)) return;

  const wasAuto = mv.hasAttribute('auto-rotate');
  if (wasAuto) mv.removeAttribute('auto-rotate');

  const s = { t: theta - 14, p: phi + 5 };
  gsap.to(s, {
    t: theta, p: phi,
    duration: 0.85,
    ease: 'power3.out',
    onUpdate: () => mv.setAttribute('camera-orbit', `${s.t}deg ${s.p}deg ${parts[2]}`),
    onComplete: () => {
      mv.setAttribute('camera-orbit', authored); // land exactly on the authored value
      if (wasAuto) mv.setAttribute('auto-rotate', '');
    },
  });
}

function init() {
  const gsap = window.gsap;
  if (!gsap) return;

  const D = 0.5;
  const EASE = 'power3.out';

  const nodes = [...document.querySelectorAll('[data-reveal], [data-reveal-group]')]
    .filter((el) => !el.closest('.hero-stage')); // the hero runs its own choreography

  if (!('IntersectionObserver' in window)) return; // leave everything visible

  /* sibling index drives the stagger so a row reads as one wave */
  const seen = new Map();
  const plans = nodes.map((el) => {
    const key = el.parentElement || document.body;
    const i = seen.get(key) || 0;
    seen.set(key, i + 1);
    const variant = variantOf(el);
    const delay = Math.min(i, 6) * 0.08;

    let targets = el;
    if (variant === 'heading') {
      const h = el.matches(HEADING_SEL) ? el : el.querySelector(HEADING_SEL);
      targets = h ? splitChars(h) : el;
      gsap.set(targets, { opacity: 0, y: 14 });
    } else if (variant === 'image') {
      gsap.set(el, { opacity: 0, clipPath: 'inset(0 100% 0 0)' });
    } else if (variant === 'viewer') {
      gsap.set(el, { opacity: 0, scale: 0.97 });
    } else if (variant === 'card') {
      const kids = [...el.querySelectorAll(
        '.proj-index, .proj-col-head h3, .proj-date, .proj-desc li, .proj-tools,' +
        '.exp-org, .exp-meta, .exp-body-inner > ul > li, .exp-stats .s'
      )];
      targets = kids.length ? kids : el;
      gsap.set(targets, { opacity: 0, y: 24, filter: 'blur(8px)' });
    } else {
      gsap.set(el, { opacity: 0, y: 24, filter: 'blur(8px)', scale: 0.97 });
    }

    return { el, variant, delay, targets };
  });

  const byEl = new Map(plans.map((p) => [p.el, p]));

  function play(plan) {
    if (plan.done) return;
    plan.done = true;
    const { el, variant, delay, targets } = plan;

    if (variant === 'heading') {
      gsap.to(targets, { opacity: 1, y: 0, duration: 0.4, ease: EASE, stagger: 0.03, delay });
    } else if (variant === 'image') {
      gsap.to(el, { opacity: 1, clipPath: 'inset(0 0% 0 0)', duration: 0.55, ease: EASE, delay });
    } else if (variant === 'viewer') {
      gsap.to(el, {
        opacity: 1, scale: 1, duration: D, ease: EASE, delay,
        onComplete: () => easeViewer(el, gsap),
      });
    } else if (variant === 'card') {
      gsap.to(targets, { opacity: 1, y: 0, filter: 'blur(0px)', duration: D, ease: EASE, stagger: 0.06 });
    } else {
      gsap.to(el, { opacity: 1, y: 0, filter: 'blur(0px)', scale: 1, duration: D, ease: EASE, delay });
    }
  }

  /* -15% bottom margin ~= ScrollTrigger's "top 85%" */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const plan = byEl.get(e.target);
      if (plan) { play(plan); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -15% 0px', threshold: 0 });

  plans.forEach((p) => io.observe(p.el));

  /* Safety net: anything that ends up on screen and still hidden — however it
     got there (fast scroll, anchor jump, layout shift) — is revealed outright. */
  function sweep() {
    plans.forEach((p) => {
      if (p.done) return;
      const r = p.el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) { play(p); io.unobserve(p.el); }
    });
  }
  addEventListener('scroll', sweep, { passive: true });
  addEventListener('resize', sweep, { passive: true });
  addEventListener('hashchange', () => setTimeout(sweep, 120));
  addEventListener('load', sweep);
  setTimeout(sweep, 600);
  setTimeout(sweep, 2000);
}

function boot() {
  if (REDUCED) return; // content stays exactly as authored, fully visible
  const ready = () => (window.gsap ? init() : setTimeout(ready, 60));
  ready();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
