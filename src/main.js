import './telemetry.js';
import './styles.css';
import { gsap } from 'gsap';
import Lenis from 'lenis';
import { renderMenu, renderHours } from './ui.js';
import { initOrdering } from './order/order.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── content first (works without WebGL) ──────────── */
const menu = renderMenu();
renderHours();
$('#year').textContent = new Date().getFullYear();

// split hero title into words for the reveal
const title = $('.hero__title');
const signEl = $('#neonSign');
signEl.replaceWith(document.createTextNode('§NEON§'));
title.innerHTML = title.innerHTML.replace(/[^\s<]+/g, (w) => w === '§NEON§' ? w : `<span class="w"><span>${w}</span></span>`);
title.innerHTML = title.innerHTML.replace('§NEON§', '<span id="neonSlot"></span>');
$('#neonSlot').replaceWith(signEl);
import('./neon.js').then(({ mountNeon }) => { window.__neon = mountNeon({ sign: signEl, switchEl: $('#neonSwitch'), hero: $('.hero') }); });

/* ── smooth scroll ─────────────────────────────────── */
const lenis = reduced ? null : new Lenis({ lerp: 0.09, wheelMultiplier: 0.9, smoothWheel: true });
let world = null;
function onScroll(y, v) {
  nav(y);
  world?.scroll(y, v);
  reel();
}
if (lenis) {
  lenis.on('scroll', (l) => onScroll(l.scroll, l.velocity));
  const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
} else addEventListener('scroll', () => onScroll(window.scrollY, 0), { passive: true });

$$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
  const id = a.getAttribute('href'); if (id.length < 2) return;
  if (a.hasAttribute('data-order')) { closeDrawer(); return; } // handled by ordering
  const el = $(id); if (!el) return;
  e.preventDefault(); closeDrawer();
  if (a.dataset.jump) menu.select(a.dataset.jump);
  lenis ? lenis.scrollTo(el, { offset: id === '#menu' ? -20 : 0, duration: 1.6 }) : el.scrollIntoView({ behavior: 'smooth' });
}));

/* ── nav ───────────────────────────────────────────── */
const navEl = $('#nav');
let lastY = 0;
function nav(y) {
  navEl.classList.toggle('is-solid', y > 60);
  document.body.classList.toggle('on-red', y < innerHeight * 0.6);
  if (y > 400 && y > lastY + 2 && !document.body.classList.contains('drawer-open')) navEl.classList.add('is-hidden');
  if (y < lastY - 2 || y < 400) navEl.classList.remove('is-hidden');
  lastY = y;
}
const burger = $('#burger'), drawer = $('#drawer');
function closeDrawer() { drawer.hidden = true; burger.setAttribute('aria-expanded', 'false'); document.body.classList.remove('drawer-open'); lenis?.start(); }
burger.addEventListener('click', () => {
  const open = drawer.hidden;
  drawer.hidden = !open; burger.setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('drawer-open', open);
  open ? lenis?.stop() : lenis?.start();
  if (open) gsap.from($$('a', drawer), { y: 30, opacity: 0, stagger: 0.05, duration: 0.6, ease: 'expo.out' });
});
addEventListener('keydown', (e) => e.key === 'Escape' && closeDrawer());
/* ── ordering hooks ───────────────────────────────── */
initOrdering();
addEventListener('jjj:lock', () => { closeDrawer(); lenis?.stop(); document.documentElement.classList.add('o-locked'); });
addEventListener('jjj:unlock', () => { lenis?.start(); document.documentElement.classList.remove('o-locked'); });
addEventListener('jjj:goto', (e) => { const el = $(e.detail); if (!el) return; lenis ? lenis.scrollTo(el, { offset: -20, duration: 1.4 }) : el.scrollIntoView({ behavior: 'smooth' }); });

/* ── photo reel drifts sideways as you scroll ─────── */
const reelEl = $('#reel');
function reel() {
  const r = reelEl.parentElement.getBoundingClientRect();
  if (r.bottom < 0 || r.top > innerHeight) return;
  const k = (innerHeight - r.top) / (innerHeight + r.height);
  const max = reelEl.scrollWidth - innerWidth;
  reelEl.style.transform = `translate3d(${-Math.max(0, max) * k}px,0,0)`;
}

/* ── magnetic buttons + cursor ─────────────────────── */
if (matchMedia('(hover: hover) and (pointer: fine)').matches && !reduced) {
  $$('.magnetic').forEach((b) => {
    b.addEventListener('pointermove', (e) => { const r = b.getBoundingClientRect(); gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * 0.25, y: (e.clientY - r.top - r.height / 2) * 0.35, duration: 0.4, ease: 'power3.out' }); });
    b.addEventListener('pointerleave', () => gsap.to(b, { x: 0, y: 0, duration: 0.8, ease: 'expo.out' }));
  });
  const cur = $('#cursor'); const qx = gsap.quickTo(cur, 'x', { duration: 0.25, ease: 'power3' }), qy = gsap.quickTo(cur, 'y', { duration: 0.25, ease: 'power3' });
  addEventListener('pointermove', (e) => { qx(e.clientX); qy(e.clientY); cur.classList.toggle('is-big', !!e.target.closest('a,button,summary') || document.body.classList.contains('is-hovering-3d')); }, { passive: true });
}

/* ── chapter card + section reveals ────────────────── */
const io = new IntersectionObserver((ents) => ents.forEach((en) => {
  if (!en.isIntersecting) return;
  const el = en.target; io.unobserve(el);
  gsap.fromTo(el, { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: 'expo.out' });
}), { threshold: 0.15 });
if (!reduced) $$('.chapter__card, .menu__head, .tile, .story__copy, .story__photo, .visit__card').forEach((el) => { el.style.opacity = 0; io.observe(el); });

/* ── WebGL world + opening ─────────────────────────── */
function webglOK() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } }

const intro = $('#intro'), pctEl = $('#introPct');
let skipped = false;
function heroReveal() {
  gsap.fromTo('.hero__title .w > span', { yPercent: 110 }, { yPercent: 0, duration: 1.1, stagger: 0.06, ease: 'expo.out' });
  gsap.fromTo('#neonSign', { opacity: 0, y: 30, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 1.2, delay: 0.15, ease: 'expo.out', onStart: () => window.__neon?.reveal() });
  gsap.fromTo('.hero .eyebrow, .hero__lede, .hero__actions, .hero__special, .hero__hint', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: 0.08, delay: 0.25, ease: 'expo.out' });
}
function finishIntro() {
  document.body.classList.remove('is-loading');
  intro.classList.add('is-done');
  gsap.to(intro, { opacity: 0, duration: 0.6, ease: 'power2.out', onComplete: () => intro.remove() });
  lenis?.start();
  try { sessionStorage.setItem('jjj-intro', '1'); } catch {}
}

async function boot() {
  lenis?.stop();
  window.scrollTo(0, 0);
  const canGL = webglOK();
  let shown = 0;
  const bump = (to) => gsap.to({ v: shown }, { v: to, duration: 0.6, ease: 'power2.out', onUpdate() { shown = this.targets()[0].v; pctEl.textContent = Math.round(shown); } });
  bump(12);

  const assets = Promise.all([document.fonts?.ready, ...['/photos/joyfull-logo.webp', '/photos/acai-bowl-booth.webp'].map((src) => new Promise((r) => { const i = new Image(); i.onload = i.onerror = r; i.src = src; }))]);
  assets.then(() => bump(45));

  if (canGL) {
    try {
      const { PhotoWorld } = await import('./gl/photoworld.js');
      bump(60);
      world = new PhotoWorld($('#gl'));
      document.body.classList.add('gl-on');
      await world.ready;
      bump(85);
      world.prepareIntro();
      intro.classList.add('has-gl');
      $$('.juice-picker button').forEach((b) => b.addEventListener('click', () => {
        $$('.juice-picker button').forEach((x) => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-selected', String(x === b)); });
        world.setJuice(b.dataset.juice);
      }));
      const loop = () => { world.tick(); requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
      addEventListener('load', () => { world.measure(); world.scroll(window.scrollY, 0); });
    } catch (err) {
      console.error(err); world = null;
      $('#stage').classList.add('is-hidden');
    }
  } else $('#stage').classList.add('is-hidden');
  await assets;
  bump(100);
  await new Promise((r) => setTimeout(r, 650));

  let quick = reduced;
  try { quick = quick || !!sessionStorage.getItem('jjj-intro'); } catch {}
  if (quick || !world) {
    world?.skipIntro();
    finishIntro(); heroReveal();
    return;
  }
  // full opening: lemon assembles → tagline → dive → red logo oval wipes open → hero
  const ui = gsap.timeline();
  ui.add(world.introTimeline(), 0);
  ui.to('.intro__meter', { opacity: 0, y: 20, duration: 0.5 }, 0.1);
  ui.to('.intro__line span', { opacity: 1, y: 0, stagger: 0.08, duration: 0.8, ease: 'expo.out' }, 1.0);
  ui.to('.intro__line span', { opacity: 0, y: -24, stagger: 0.03, duration: 0.4, ease: 'power2.in' }, 2.2);
  ui.to('.intro__oval', { scale: Math.hypot(innerWidth, innerHeight) / 6, duration: 0.7, ease: 'expo.in' }, 2.25);
  ui.to('.intro__logo', { opacity: 1, scale: 1, rotate: 0, duration: 0.8, ease: 'expo.out' }, 2.75);
  ui.to('.intro__logo', { opacity: 0, scale: 1.3, duration: 0.45, ease: 'power2.in' }, 3.4);
  ui.to('.intro__oval', { opacity: 0, duration: 0.5 }, 3.45);
  ui.add(() => { finishIntro(); heroReveal(); }, 3.5);
  $('#introSkip').addEventListener('click', () => {
    if (skipped) return; skipped = true;
    ui.kill(); world.skipIntro(); finishIntro(); heroReveal();
  });
}
boot();
