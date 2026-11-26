/* Home v6: the client's style. Living hero scene (a deck of three photos that takes turns in front,
   the 7 written in red), a looping learning cycle, scroll-built UI, a marked paper that fills in, count-ups,
   a story carousel. Everything is visible without JS; motion is added only when GSAP is present and allowed. */
(function () {
  'use strict';
  var doc = document, win = window;
  var reduce = win.IBGA ? win.IBGA.reduce : win.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gsap = win.gsap, ST = win.ScrollTrigger;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return [].slice.call((c || doc).querySelectorAll(s)); };
  var fine = win.matchMedia('(pointer:fine)').matches;
  var anim = !!(gsap && ST && !reduce);
  if (gsap && ST) gsap.registerPlugin(ST);
  if (gsap && /[?&]snap/.test(win.location.search)) gsap.ticker.lagSmoothing(0);

  // Smooth scrolling, as on v3: Lenis eases the wheel and drives ScrollTrigger from GSAP's ticker.
  var lenis = null;
  if (anim && win.Lenis) {
    lenis = new win.Lenis({ lerp: .085, anchors: { offset: -96 }, allowNestedScroll: true });
    lenis.on('scroll', ST.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    if (win.IBGA) win.IBGA.lenis = lenis;
  }

  // Draw an SVG stroke from nothing. Returns the tween (or sets it drawn when motion is off).
  function prep(p) { var l = p.getTotalLength(); p.style.strokeDasharray = l + ' ' + (l + 2); p.style.strokeDashoffset = anim ? l : 0; return l; }
  function draw(p, dur, ease) { prep(p); return gsap.to(p, { strokeDashoffset: 0, duration: dur || .8, ease: ease || 'power2.inOut' }); }
  function once(el, fn, start) { if (el) ST.create({ trigger: el, start: start || 'top 80%', once: true, onEnter: fn }); }
  function count(el, dur) {
    var end = parseInt(el.getAttribute('data-n'), 10), sep = el.hasAttribute('data-sep'), o = { v: 0 };
    var fmt = function (v) { v = Math.round(v); return sep ? v.toLocaleString('en-IN') : String(v); };
    if (!anim || isNaN(end)) { el.textContent = fmt(end); return; }
    el.textContent = fmt(0);
    gsap.to(o, { v: end, duration: dur || 1.4, ease: 'power3.out', onUpdate: function () { el.textContent = fmt(o.v); } });
  }

  /* ---------- Header: Resources menu and search ---------- */
  var ddb = $('.h6-dd-b'), ddp = $('#h6-res'), sb = $('.h6-search-b'), sf = $('#h6-search');
  function dd(open) { if (!ddb) return; ddb.setAttribute('aria-expanded', open ? 'true' : 'false'); ddp.hidden = !open; }
  if (ddb && ddp) {
    ddb.addEventListener('click', function (e) { e.stopPropagation(); dd(ddp.hidden); });
    doc.addEventListener('click', function (e) { if (!ddp.hidden && !ddp.contains(e.target)) dd(false); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !ddp.hidden) { dd(false); ddb.focus(); } });
    ddp.addEventListener('click', function (e) { if (e.target.closest('a')) dd(false); });
  }
  if (sb && sf) sb.addEventListener('click', function () {
    var open = sf.hidden; sf.hidden = !open; sb.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) $('input', sf).focus();
  });

  /* ---------- Hero: the living scene ---------- */
  var stage = $('[data-stage]');
  var deck = $$('[data-card]'), tags = $$('[data-tag]'), sheet = $('[data-sheet]');

  // The three photos are a deck: one is in front, the next waits on the right, the last on the left.
  // Every few seconds the deck shuffles one place; clicking a waiting card brings it to the front.
  // Back cards are dimmed by a white veil (an opacity tween) rather than a CSS filter, which repaints every frame.
  var front = 0, HOLD = 5, DUR = 1.25, busy = false, timer = null;
  var veils = deck.map(function (c) { var v = document.createElement('i'); v.className = 'h6-veil'; v.setAttribute('aria-hidden', 'true'); c.appendChild(v); return v; });
  var NAMES = ['Learn at IBGA Centres', '1-to-1 Online Classes', 'Achieve Better Results'];
  function slots() {
    var sh = win.innerWidth < 768 ? 26 : 32;
    return [
      { xPercent: 0, z: 0, rotationY: 0, rotation: 0, scale: 1 },
      { xPercent: sh, z: -150, rotationY: -16, rotation: 3, scale: .84 },
      { xPercent: -sh, z: -150, rotationY: 16, rotation: -3, scale: .84 }
    ];
  }
  function slotOf(i) { return (i - front + 3) % 3; }
  function showSheet(on, at, tl) {
    if (!sheet) return;
    if (on) {
      tl.fromTo(sheet, { y: 50, rotation: 9, autoAlpha: 0 }, { y: 0, rotation: -4, autoAlpha: 1, duration: .9, ease: 'expo.out' }, at)
        .fromTo('.h6-sheet li', { x: -10, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: .35, stagger: .07, ease: 'power2.out' }, at + .25);
      $$('.h6-sheet .tk').forEach(function (p, i) { tl.add(draw(p, .25, 'power2.out'), at + .35 + i * .08); });
      var seven = $$('.h6-seven path');
      if (seven.length) tl.add(draw(seven[1], .3, 'power2.in'), at + .7).add(draw(seven[2], .18, 'power2.out'), at + 1).add(draw(seven[0], .5, 'power2.inOut'), at + 1.15);
    } else {
      tl.to(sheet, { y: 24, rotation: 2, autoAlpha: 0, duration: .4, ease: 'power2.in' }, at);
    }
  }
  function label() {
    deck.forEach(function (c, i) {
      var s = slotOf(i);
      c.setAttribute('aria-label', s === 0 ? NAMES[i] + '. Show the next photo' : 'Show ' + NAMES[i]);
    });
  }
  function queue() { if (timer) timer.kill(); timer = gsap.delayedCall(HOLD, auto); }
  function auto() { if (!stageSeen || document.hidden) { timer = gsap.delayedCall(1, auto); return; } shuffle((front + 1) % 3); }
  // One timeline moves all three cards together on the same ease, so nothing stalls or overtakes.
  // The stacking order flips just before halfway, when the incoming and outgoing cards are side by side.
  function shuffle(to) {
    if (busy || to === front) return;
    busy = true;
    if (timer) timer.kill();
    var out = front, S = slots();
    front = to;
    var tl = gsap.timeline({ defaults: { duration: DUR, ease: 'power3.inOut' }, onComplete: function () { busy = false; queue(); } });
    deck.forEach(function (c, i) {
      var s = S[slotOf(i)];
      // The card that crosses from one side to the other goes the long way round, deeper behind the front card.
      var cross = i !== out && i !== front;
      tl.to(c, { xPercent: s.xPercent, rotationY: s.rotationY, rotation: s.rotation, scale: s.scale }, 0)
        .to(c, { z: cross ? -320 : (i === front ? 40 : -60), duration: DUR / 2, ease: 'sine.out' }, 0)
        .to(c, { z: s.z, duration: DUR / 2, ease: 'sine.in' }, DUR / 2)
        .to(veils[i], { opacity: slotOf(i) === 0 ? 0 : 1 }, 0);
    });
    tl.call(function () {
      deck.forEach(function (c, i) { c.style.zIndex = i === front ? 3 : (i === out ? 2 : 1); });
    }, null, DUR * .42)
      .to(tags[out], { y: 8, autoAlpha: 0, duration: .3, ease: 'power2.in' }, 0)
      .fromTo(tags[front], { y: 14, scale: .9, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: .7, ease: 'back.out(1.8)' }, DUR * .8);
    if (out === 2) showSheet(false, 0, tl);
    if (front === 2) showSheet(true, DUR * .85, tl);
    label();
  }

  function heroIn() {
    if (!anim || !stage) {
      if (sheet) $$('path', sheet).forEach(function (p) { p.style.strokeDasharray = 'none'; });
      return;
    }
    var S = slots();
    // GSAP takes over from the resting CSS deck: drop the class transforms so it starts from clean values.
    deck.forEach(function (c, i) {
      c.classList.remove('s0', 's1', 's2'); c.style.zIndex = 3 - i;
      c.setAttribute('role', 'button'); c.tabIndex = 0;
      c.addEventListener('click', function () { shuffle(slotOf(i) === 0 ? (front + 1) % 3 : i); });
      c.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); c.click(); } });
    });
    stage.removeAttribute('role');
    stage.setAttribute('role', 'group');
    stage.classList.add('is-live');
    label();
    gsap.set(deck, { x: 0, y: 0, rotationX: 0, skewX: 0 });
    gsap.set(tags.slice(1), { autoAlpha: 0 });
    gsap.set(sheet, { autoAlpha: 0 });
    var tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.from('.h6-chips li', { y: -18, autoAlpha: 0, duration: .8, stagger: .05 }, 0)
      .from('.h6-l>.gt', { yPercent: 110, duration: 1.1, stagger: .1 }, .1)
      .from('.h6 [data-hi]', { y: 26, autoAlpha: 0, duration: 1, stagger: .08 }, .3)
      .from('.h6-glow', { autoAlpha: 0, duration: 1.4, ease: 'power1.out' }, 0);
    // One by one: the two waiting cards land first, then the front card slides in over them.
    [2, 1, 0].forEach(function (i, k) {
      var s = S[slotOf(i)];
      gsap.set(veils[i], { opacity: i ? 1 : 0 });
      tl.fromTo(deck[i], { xPercent: s.xPercent * 1.5, yPercent: 10, z: -380, rotationY: s.rotationY * 2, rotation: s.rotation * 2, scale: .72, autoAlpha: 0 },
        Object.assign({ yPercent: 0, autoAlpha: 1, duration: 1.4 }, s), .3 + k * .4);
    });
    tl.from(tags[0], { y: 18, scale: .85, autoAlpha: 0, duration: .8, ease: 'back.out(2)' }, 1.6)
      .call(queue, null, 1.8);
  }
  var stageSeen = true;
  if (anim && stage) {
    ST.create({ trigger: stage, start: 'top bottom', end: 'bottom top', onToggle: function (s) { stageSeen = s.isActive; } });
    // Depth on pointer: nearer layers move further.
    if (fine) {
      var layers = $$('[data-depth]', stage);
      var qx = layers.map(function (l) { return gsap.quickTo(l, 'x', { duration: .9, ease: 'power3.out' }); });
      var qy = layers.map(function (l) { return gsap.quickTo(l, 'y', { duration: .9, ease: 'power3.out' }); });
      $('.h6').addEventListener('pointermove', function (e) {
        var r = stage.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width - .5, ny = (e.clientY - r.top) / r.height - .5;
        layers.forEach(function (l, i) { var d = parseFloat(l.getAttribute('data-depth')) || 0; qx[i](nx * d * .5); qy[i](ny * d * .35); });
      });
      $('.h6').addEventListener('pointerleave', function () { layers.forEach(function (l, i) { qx[i](0); qy[i](0); }); });
    }
    // The scene sinks back slightly as the page scrolls on.
    gsap.to('.h6-scene', { yPercent: 8, scale: .96, ease: 'none', scrollTrigger: { trigger: '.h6', start: 'top top', end: 'bottom top', scrub: .6 } });
  }

  /* ---------- Section headings and simple reveals ---------- */
  if (anim) {
    $$('[data-rv]').forEach(function (el) {
      gsap.from(el.children.length ? el.children : el, { y: 34, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: .08, scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
    });
  }
  function stagger(sel, from, start) {
    if (!anim) return;
    var box = $(sel); if (!box) return;
    gsap.from(box.children, Object.assign({ y: 50, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: .1, scrollTrigger: { trigger: box, start: start || 'top 82%', once: true } }, from || {}));
  }

  /* ---------- Choose how you learn: cards swing up out of depth; they tilt under the pointer ---------- */
  stagger('[data-modes]', { y: 90, rotationX: -25, transformOrigin: '50% 100%', duration: 1.3, stagger: .14 });
  if (anim && fine) $$('[data-mode]').forEach(function (c) {
    var rx = gsap.quickTo(c, 'rotationX', { duration: .6, ease: 'power3.out' }), ry = gsap.quickTo(c, 'rotationY', { duration: .6, ease: 'power3.out' });
    c.addEventListener('pointermove', function (e) { var r = c.getBoundingClientRect(); ry(((e.clientX - r.left) / r.width - .5) * 8); rx(-((e.clientY - r.top) / r.height - .5) * 8); });
    c.addEventListener('pointerleave', function () { rx(0); ry(0); });
  });
  if (anim) $$('.m6-stack li').forEach(function (li, i) { gsap.from(li, { x: -40, autoAlpha: 0, duration: .7, delay: .6 + i * .12, ease: 'back.out(2)', scrollTrigger: { trigger: '[data-modes]', start: 'top 75%', once: true } }); });

  /* ---------- Teaching cycle: the steps arrive, then a light travels the loop and lifts each step in turn ---------- */
  var cyc = $('[data-cycle]');
  if (cyc) {
    var steps = $$('[data-step]', cyc), bars = $$('.c6-bars i', cyc), wins = $$('.c6-wins li', cyc);
    var loopP = $('[data-loop]'), dot = $('[data-dot]');
    var setStep = function (i) { steps.forEach(function (s, k) { s.classList.toggle('on', k === i); }); };
    if (!anim) { setStep(4); }
    else {
      gsap.set(bars, { '--f': 0 });
      var go = function () {
        var tl = gsap.timeline();
        tl.from(steps, { y: 60, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: .12 })
          .from('.c6-pad', { rotation: -14, y: 30, autoAlpha: 0, duration: .9, ease: 'back.out(1.6)' }, .4)
          .from('.c6-row', { x: -20, autoAlpha: 0, stagger: .1, duration: .5 }, .8)
          .from('.c6-screen', { rotationX: -70, transformOrigin: '50% 100%', duration: 1, ease: 'expo.out' }, .5)
          .to(bars, { '--f': 1, duration: 1.1, ease: 'power3.out', stagger: .12 }, 1)
          .from(wins, { x: 20, autoAlpha: 0, stagger: .1, duration: .5 }, 1.2);
        if (loopP) tl.add(draw(loopP, 1.6, 'power2.inOut'), .6);
        tl.add(run, 1.6);
      };
      var run = function () {
        var len = loopP ? loopP.getTotalLength() : 0, o = { f: 0 }, last = -1;
        gsap.to(o, { f: 1, duration: 10, ease: 'none', repeat: -1, onUpdate: function () {
          var i = Math.min(4, Math.floor(o.f * 5));
          if (i !== last) { last = i; setStep(i); if (i === 2) gsap.fromTo(bars, { '--f': .2 }, { '--f': 1, duration: 1, ease: 'power3.out', stagger: .08 }); }
          if (loopP && dot) { var pt = loopP.getPointAtLength(len * o.f); dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y); }
        } });
      };
      once(cyc, go, 'top 75%');
    }
  }

  /* ---------- Programmes ---------- */
  stagger('[data-progs]', { y: 60, scale: .96, stagger: .08 });

  /* ---------- For parents: the worries surface one by one, then the answers ---------- */
  var par = $('[data-parents]');
  if (par && anim) {
    var ths = $$('[data-th]', par), helps = $$('.f6-help li', par), box = $('.f6-thoughts', par), READ = 2.8;
    gsap.set(ths, { autoAlpha: 0, scale: .6 });
    once(box, function () {
      var tl = gsap.timeline(), b = box.getBoundingClientRect();
      ths.forEach(function (t) {
        var r = t.getBoundingClientRect();
        var dx = (b.left + b.width / 2 - (r.left + r.width / 2)) * .55, dy = (b.top + b.height / 2 - (r.top + r.height / 2)) * .55;
        tl.fromTo(t, { x: dx, y: dy + 30, scale: .7, autoAlpha: 0 }, { y: dy, scale: 1.3, autoAlpha: 1, duration: .6, ease: 'back.out(1.7)', onStart: function () { t.classList.add('is-reading'); } })
          .to(t, { x: 0, y: 0, scale: 1, duration: .75, ease: 'power3.inOut', onComplete: function () { t.classList.remove('is-reading'); } }, '+=' + READ);
      });
      tl.call(function () { ths.forEach(function (t, i) { gsap.to(t, { y: i % 2 ? -8 : 8, duration: 2.8 + i * .4, ease: 'sine.inOut', yoyo: true, repeat: -1 }); }); });
    }, 'top 65%');
    once(par, function () {
      gsap.timeline().from('.f6-help', { y: 40, autoAlpha: 0, duration: 1, ease: 'expo.out' }, .4)
        .from(helps, { y: 20, autoAlpha: 0, duration: .6, stagger: .12, ease: 'power3.out' }, .8);
    }, 'top 40%');
    gsap.fromTo('.f6-bg', { scale: 1.12 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: par, start: 'top bottom', end: 'bottom top', scrub: .6 } });
  }

  /* ---------- Starting is simple ---------- */
  var jst = $('[data-steps]');
  if (jst && anim) {
    var jsteps = $$('[data-jstep]', jst), pl = $$('[data-pl]', jst);
    gsap.set(pl, { '--k': 0 });
    once(jst, function () {
      gsap.timeline()
        .from(jsteps, { y: 70, autoAlpha: 0, duration: 1.1, ease: 'expo.out', stagger: .16 })
        .from('.j6-n', { scale: 0, rotation: -90, duration: .7, ease: 'back.out(2.4)', stagger: .16 }, .3)
        .from('.j6-plan', { y: 40, rotation: 6, autoAlpha: 0, duration: .9, ease: 'back.out(1.6)' }, .8)
        .to(pl, { '--k': 1, duration: .4, ease: 'back.out(3)', stagger: .18 }, 1.2);
    }, 'top 78%');
  }

  /* ---------- The film ---------- */
  var film = $('[data-film]');
  if (film) {
    var v = $('video', film), pb = $('.v6f-play', film);
    pb.addEventListener('click', function () { v.controls = true; v.muted = false; v.play(); film.classList.add('playing'); });
    v.addEventListener('pause', function () { if (v.currentTime < .2 || v.ended) film.classList.remove('playing'); });
    v.addEventListener('ended', function () { film.classList.remove('playing'); v.controls = false; });
    if (ST) ST.create({ trigger: film, start: 'top bottom', end: 'bottom top', onLeave: function () { v.pause(); }, onLeaveBack: function () { v.pause(); } });
    if (anim) gsap.fromTo(film, { scale: .9, borderRadius: 60 }, { scale: 1, borderRadius: 32, ease: 'none', scrollTrigger: { trigger: film, start: 'top bottom', end: 'top 35%', scrub: .6 } });
  }

  /* ---------- Learning beyond the class: chips pop and the lines draw to them ---------- */
  var xv = $('[data-xvis]');
  if (xv && anim) {
    var chips = $$('[data-xc]', xv), lines = $$('[data-xl]', xv);
    gsap.set(chips, { autoAlpha: 0, scale: .7, y: 16 });
    once(xv, function () {
      var tl = gsap.timeline();
      tl.from($('img', xv), { scale: 1.15, duration: 1.6, ease: 'expo.out' }, 0);
      chips.forEach(function (c, i) {
        tl.fromTo(lines[i], { strokeDashoffset: 60 }, { strokeDashoffset: 0, duration: .6, ease: 'power2.out' }, .4 + i * .25)
          .to(c, { autoAlpha: 1, scale: 1, y: 0, duration: .7, ease: 'back.out(2.2)' }, .6 + i * .25);
      });
      chips.forEach(function (c, i) { gsap.to(c, { y: i % 2 ? 6 : -6, duration: 2.4 + i * .5, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.6 }); });
      gsap.to(lines, { strokeDashoffset: -18, duration: 1.2, ease: 'none', repeat: -1, delay: 1.6 });
    }, 'top 75%');
    gsap.from('.x6-hand', { autoAlpha: 0, x: -20, rotation: -12, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.x6-top', start: 'top 70%', once: true } });
    if ($('.x6-hand svg path')) once($('.x6-top'), function () { draw($('.x6-hand svg path'), .7).delay(.6); }, 'top 70%');
  }
  stagger('[data-xcards]', { y: 60, stagger: .09 });

  /* ---------- Teachers: years count up, the timeline fills from 2008 ---------- */
  var tc = $('[data-tcards]');
  if (tc) {
    var tn = $$('[data-n]', tc);
    if (!anim) tn.forEach(function (n) { count(n); });
    else {
      gsap.set('.t6-track i', { '--f': 0 });
      once(tc, function () {
        gsap.from(tc.children, { y: 50, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: .1 });
        tn.forEach(function (n, i) { setTimeout(function () { count(n, 1.3); }, 200 + i * 100); });
        gsap.to('.t6-track i', { '--f': 1, duration: 2.2, ease: 'power2.inOut', delay: .3 });
        gsap.from('.t6-line li', { y: 10, autoAlpha: 0, stagger: .06, duration: .4, delay: .3 });
      }, 'top 80%');
    }
  }

  /* ---------- Results: a spotlight. One student at a time: the old marks leave, the dial drains and refills
     to the next student's total while the number rolls over, and their name and grades come in.
     Plays on its own while in view (pauses on hover); segments and arrows jump. Reduced motion: no autoplay. ---------- */
  var rst = $('[data-rstage]');
  if (rst) {
    var rSlides = $$('.r6-slide', rst), rSegs = $$('.r6-seg', rst), rLines = $$('.r6-dial line', rst), rNum = $('[data-num]', rst);
    var rCur = 0, rN = rSlides.length, rHold = 4.2, rProg = null, rDial = null, rIn = false, rHover = false, rStarted = false;
    rst.classList.add('r6-live');
    var parts = function (s) { return [$('h3', s), $('.r6-sch', s)]; };
    var pills = function (s) { return $$('.r6-subs li', s); };

    // Light the dial up to `total`: drain what is lit, then tick round one by one.
    var light = function (total, dur) {
      if (!anim) { rLines.forEach(function (l, i) { l.setAttribute('class', i < total ? 'on' : 'off'); }); return; }
      if (rDial) rDial.kill();
      rDial = gsap.timeline();
      var lit = rLines.filter(function (l) { return l.getAttribute('class') === 'on'; });
      lit.reverse().forEach(function (l, i) { rDial.set(l, { attr: { class: 'off' } }, i * (.28 / Math.max(lit.length, 1))); });
      for (var i = 0; i < total; i++) rDial.set(rLines[i], { attr: { class: 'on' } }, .32 + dur * Math.pow(i / total, .75));
    };

    var setSegs = function () {
      rSegs.forEach(function (s, k) {
        s.classList.toggle('is-on', k === rCur); s.classList.toggle('is-done', k < rCur);
        s.setAttribute('aria-current', k === rCur ? 'true' : 'false');
        if (gsap) gsap.set($('i', s), { '--f': 0 });
      });
    };

    var play = function () {
      if (!anim) return;
      if (rProg) rProg.kill();
      rProg = gsap.to($('i', rSegs[rCur]), { '--f': 1, duration: rHold, ease: 'none', paused: !(rIn && !rHover), onComplete: function () { go(1); } });
    };
    var upd = function () { if (rProg) { if (rIn && !rHover) rProg.resume(); else rProg.pause(); } };

    var enter = function (s, dir, delay) {
      gsap.fromTo(parts(s), { y: 50 * dir, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .9, ease: 'expo.out', stagger: .07, delay: delay });
      gsap.fromTo(pills(s), { y: 20, scale: .8, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: .6, ease: 'back.out(2)', stagger: .08, delay: delay + .25 });
    };

    var show = function (i, dir) {
      if (i === rCur) return;
      var prev = rSlides[rCur], next = rSlides[i], total = +next.getAttribute('data-total');
      rCur = i; setSegs();
      prev.classList.remove('is-on'); next.classList.add('is-on');
      if (!anim) { rNum.textContent = total; light(total); return; }
      // The old marks leave upward (or downward when going back) ...
      var out = parts(prev).concat(pills(prev));
      gsap.killTweensOf(out.concat(parts(next), pills(next)));
      prev.classList.add('is-out');
      gsap.to(out, { y: -36 * dir, autoAlpha: 0, duration: .4, ease: 'power2.in', stagger: .03, onComplete: function () { prev.classList.remove('is-out'); gsap.set(out, { clearProps: 'all' }); } });
      // ... the number rolls over like an odometer, the dial refills, and the new student comes in.
      gsap.killTweensOf(rNum);
      gsap.timeline()
        .to(rNum, { yPercent: -110 * dir, duration: .3, ease: 'power2.in', onComplete: function () { rNum.textContent = total; } })
        .fromTo(rNum, { yPercent: 110 * dir }, { yPercent: 0, duration: .7, ease: 'expo.out' });
      light(total, .9);
      enter(next, dir, .3);
      play();
    };
    var go = function (d) { show((rCur + d + rN) % rN, d); };

    rSegs.forEach(function (s, k) { s.addEventListener('click', function () { show(k, k > rCur ? 1 : -1); }); });
    $('[data-prev]', rst).addEventListener('click', function () { go(-1); });
    $('[data-next]', rst).addEventListener('click', function () { go(1); });
    setSegs();

    if (anim) {
      rst.addEventListener('mouseenter', function () { rHover = true; upd(); });
      rst.addEventListener('mouseleave', function () { rHover = false; upd(); });
      rLines.forEach(function (l) { l.setAttribute('class', 'off'); });
      gsap.set(rst, { autoAlpha: 0, y: 60, scale: .97 });
      gsap.set(parts(rSlides[0]).concat(pills(rSlides[0])), { autoAlpha: 0 });
      ST.create({
        trigger: rst, start: 'top 75%', end: 'bottom 15%',
        onToggle: function (st) {
          rIn = st.isActive;
          if (rIn && !rStarted) {
            rStarted = true;
            var t0 = +rSlides[0].getAttribute('data-total');
            gsap.to(rst, { autoAlpha: 1, y: 0, scale: 1, duration: 1, ease: 'expo.out' });
            light(t0, 1.6);
            rNum.setAttribute('data-n', t0); gsap.delayedCall(.3, function () { count(rNum, 1.6); });
            enter(rSlides[0], 1, .5);
            play();
          }
          upd();
        }
      });
    }
  }

  /* ---------- Marking: the answer is written, then marked line by line ---------- */
  var kp = $('[data-kpaper]');
  if (kp && anim) {
    var kl = $$('[data-kl]', kp);
    gsap.set($$('.k6-a', kp), { clipPath: 'inset(0 100% 0 0)' });
    gsap.set($$('.k6-c', kp), { autoAlpha: 0, x: 10 });
    $$('.k6-tk path, .k6-7 path', kp).forEach(prep);
    gsap.set('.k6-tip', { autoAlpha: 0, y: 14 });
    gsap.set('.k6-q mark', { backgroundSize: '0% 100%' });
    once(kp, function () {
      var tl = gsap.timeline();
      tl.from('.k6-sheet', { y: 60, rotation: 6, autoAlpha: 0, duration: 1.1, ease: 'expo.out' })
        .from('.k6-sheet2', { rotation: 0, x: 0, y: 0, autoAlpha: 0, duration: 1, ease: 'expo.out' }, .2)
        .to('.k6-q mark', { backgroundSize: '100% 100%', duration: .5 }, .7);
      kl.forEach(function (li, i) {
        var t = .9 + i * .75;
        tl.to($('.k6-a', li), { clipPath: 'inset(0 0% 0 0)', duration: .6, ease: 'power1.inOut' }, t)
          .to($('.k6-tk path', li), { strokeDashoffset: 0, duration: .25, ease: 'power2.out' }, t + .5)
          .to($('.k6-c', li), { autoAlpha: 1, x: 0, duration: .45, ease: 'power2.out' }, t + .6);
      });
      var sp = $$('.k6-7 path', kp), te = .9 + kl.length * .75;
      tl.to(sp[0], { strokeDashoffset: 0, duration: .4, ease: 'power2.in' }, te)
        .to(sp[1], { strokeDashoffset: 0, duration: .2 }, te + .4)
        .to('.k6-tip', { autoAlpha: 1, y: 0, duration: .6, ease: 'back.out(2)' }, te + .5);
    }, 'top 72%');
    gsap.from('.k6-photo img', { scale: 1.12, ease: 'none', scrollTrigger: { trigger: '.k6-band', start: 'top bottom', end: 'bottom top', scrub: .6 } });
    gsap.from('.k6-icons li', { y: 30, autoAlpha: 0, stagger: .1, duration: .8, ease: 'expo.out', scrollTrigger: { trigger: '.k6-icons', start: 'top 90%', once: true } });
  }

  /* ---------- Real stories: a carousel that moves on by itself until someone takes over ---------- */
  var car = $('[data-car]');
  if (car) {
    var tr = $('[data-track]', car), cards = $$('.q6-card', tr), dots = $$('.q6-dots button', car), cur = 0, auto = null;
    var go2 = function (i, user) {
      $$('[data-vcard] video', car).forEach(function (v) { if (!v.paused) v.pause(); });
      cur = (i + cards.length) % cards.length;
      tr.scrollTo({ left: cards[cur].offsetLeft - tr.offsetLeft - 4, behavior: reduce ? 'auto' : 'smooth' });
      dots.forEach(function (d, k) { d.setAttribute('aria-selected', k === cur ? 'true' : 'false'); });
      if (user && auto) { clearInterval(auto); auto = null; }
    };
    $('.q6-nav.prev', car).addEventListener('click', function () { go2(cur - 1, true); });
    $('.q6-nav.next', car).addEventListener('click', function () { go2(cur + 1, true); });
    dots.forEach(function (d, k) { d.addEventListener('click', function () { go2(k, true); }); });
    tr.addEventListener('scroll', function () {
      var w = cards[0].offsetWidth + 22, i = Math.round(tr.scrollLeft / w);
      dots.forEach(function (d, k) { d.setAttribute('aria-selected', k === i ? 'true' : 'false'); });
    }, { passive: true });
    if (!reduce) {
      var tick = function () { if (tr.scrollWidth - tr.clientWidth > 8) go2(cur + 1); };
      if (ST) ST.create({ trigger: car, start: 'top bottom', end: 'bottom top', onToggle: function (s) {
        if (s.isActive && !auto && !car.dataset.user) auto = setInterval(tick, 4500); else if (!s.isActive && auto) { clearInterval(auto); auto = null; }
      } });
      car.addEventListener('pointerdown', function () { car.dataset.user = '1'; if (auto) { clearInterval(auto); auto = null; } });
    }
    var vids = $$('[data-vcard] video', car);
    var stopAll = function (keep) { vids.forEach(function (v) { if (v !== keep && !v.paused) v.pause(); }); };
    $$('[data-vcard]', car).forEach(function (vc) {
      var v = $('video', vc), pb = $('.q6-play', vc);
      pb.addEventListener('click', function () {
        car.dataset.user = '1'; if (auto) { clearInterval(auto); auto = null; }
        stopAll(v); v.controls = true; v.play(); vc.classList.add('playing');
      });
      v.addEventListener('ended', function () { vc.classList.remove('playing'); v.controls = false; v.load(); });
    });
    if (ST) ST.create({ trigger: car, start: 'top bottom', end: 'bottom top', onLeave: function () { stopAll(null); }, onLeaveBack: function () { stopAll(null); } });
    if (anim) gsap.from(cards, { y: 60, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: .12, scrollTrigger: { trigger: car, start: 'top 82%', once: true } });
  }
  stagger('.q6-out', { y: 30, stagger: .08 }, 'top 90%');

  /* ---------- Centres ---------- */
  stagger('[data-ncards]', { y: 70, rotation: 2, stagger: .1 });
  stagger('.n6-feat', { y: 30, stagger: .08 }, 'top 90%');

  /* ---------- Journey: the numbers count up ---------- */
  var ys = $('[data-stats]');
  if (ys) {
    var yn = $$('[data-n]', ys);
    if (!anim) yn.forEach(function (n) { count(n); });
    else once(ys, function () {
      gsap.from(ys.children, { y: 50, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: .1 });
      yn.forEach(function (n) { count(n, 1.8); });
    }, 'top 85%');
  }

  /* ---------- Founder ---------- */
  var fo = $('[data-founder]');
  if (fo && anim) {
    gsap.from($('img', fo), { y: 40, autoAlpha: 0, scale: .94, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: fo, start: 'top 80%', once: true } });
    $$('.o6-chip', fo).forEach(function (c, i) {
      gsap.from(c, { x: i ? 40 : -40, autoAlpha: 0, duration: .9, delay: .5 + i * .2, ease: 'back.out(2)', scrollTrigger: { trigger: fo, start: 'top 80%', once: true } });
      gsap.to(c, { y: i ? -8 : 8, duration: 2.8 + i * .5, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    });
    gsap.from('.o6-sign', { autoAlpha: 0, x: -30, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.o6-sign', start: 'top 92%', once: true } });
  }

  /* ---------- FAQ ---------- */
  stagger('[data-faq]', { y: 40, stagger: .07 });

  /* ---------- Handwritten notes: the underline is drawn ---------- */
  if (anim) $$('.hand6').forEach(function (h) {
    if (h.classList.contains('x6-hand')) return;
    var p = $('svg path', h);
    gsap.from(h, { autoAlpha: 0, y: 10, duration: .9, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 88%', once: true } });
    if (p) { prep(p); ST.create({ trigger: h, start: 'top 85%', once: true, onEnter: function () { gsap.to(p, { strokeDashoffset: 0, duration: .7, delay: .4, ease: 'power2.inOut' }); } }); }
  });

  /* ---------- The form (prototype: nothing is sent) ---------- */
  var form = $('[data-form6]');
  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    $('.e6-ok', form).hidden = false;
    $('.e6-sub', form).disabled = true;
  });

  /* ---------- Start ---------- */
  var fontsReady = (doc.fonts && doc.fonts.ready) ? doc.fonts.ready : Promise.resolve();
  fontsReady.then(heroIn);
  var settle = function () { if (ST) { ST.sort(); ST.refresh(); } };
  fontsReady.then(function () { setTimeout(settle, 60); });
  win.addEventListener('load', function () { setTimeout(settle, 60); });
})();
