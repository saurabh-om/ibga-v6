/* IBGA designed pages: header state, mobile menu, booking dock, reveals, count-ups, command term decoder. */
(function () {
  'use strict';
  var doc = document, win = window, body = doc.body;
  var reduce = win.matchMedia('(prefers-reduced-motion: reduce)').matches;
  body.classList.remove('no-js');
  body.classList.add('js');
  if (reduce) body.classList.add('rm');
  win.IBGA = { reduce: reduce };

  // Header gains a surface once the page moves; the mobile dock appears after the first screen.
  var hd = doc.querySelector('[data-hd]');
  var dock = doc.querySelector('[data-dock]');
  var ticking = false;
  function onScroll() {
    ticking = false;
    var y = win.scrollY || doc.documentElement.scrollTop;
    if (hd) hd.classList.toggle('scrolled', y > 8);
    if (dock) {
      var close = doc.getElementById('book');
      var nearEnd = close && close.getBoundingClientRect().top < win.innerHeight;
      dock.classList.toggle('on', y > win.innerHeight * 0.6 && !nearEnd);
    }
  }
  win.addEventListener('scroll', function () { if (!ticking) { ticking = true; win.requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  // Mobile menu
  var tg = hd && hd.querySelector('.hd-tg');
  var sheet = hd && hd.querySelector('.hd-sheet');
  if (tg && sheet) {
    var set = function (open) {
      hd.classList.toggle('open', open);
      hd.classList.toggle('scrolled', open || (win.scrollY > 8));
      tg.setAttribute('aria-expanded', open ? 'true' : 'false');
      tg.querySelector('.sr').textContent = open ? 'Close menu' : 'Menu';
      sheet.hidden = !open;
    };
    tg.addEventListener('click', function () { set(!hd.classList.contains('open')); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && hd.classList.contains('open')) { set(false); tg.focus(); } });
    sheet.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { set(false); }); });
  }

  // Reveals and count-ups
  function countUp(el) {
    var end = parseInt(el.getAttribute('data-count'), 10);
    if (reduce || !end) return;
    var t0 = null, dur = 900;
    el.textContent = '0';
    function step(t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / dur);
      el.textContent = String(Math.round(end * (1 - Math.pow(1 - p, 3))));
      if (p < 1) win.requestAnimationFrame(step);
    }
    win.requestAnimationFrame(step);
  }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
      e.target.querySelectorAll('[data-count]').forEach(countUp);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
  doc.querySelectorAll('[data-r]').forEach(function (el) { io.observe(el); });

  // Command Term Decoder: ARIA tabs with arrow-key support.
  doc.querySelectorAll('[data-decoder]').forEach(function (box) {
    var tabs = [].slice.call(box.querySelectorAll('[role="tab"]'));
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        var p = doc.getElementById(t.getAttribute('aria-controls'));
        p.hidden = !on;
        p.classList.remove('show');
        if (on) { void p.offsetWidth; p.classList.add('show'); }
      });
      if (focus) tab.focus();
      if (tab.scrollIntoView && win.innerWidth < 1024) tab.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduce ? 'auto' : 'smooth' });
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {
        var k = e.key, n = null;
        if (k === 'ArrowDown' || k === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
        if (k === 'ArrowUp' || k === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
        if (k === 'Home') n = tabs[0];
        if (k === 'End') n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); select(n, true); }
      });
    });
    var bio = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { select(tabs[0]); bio.disconnect(); }
    }, { threshold: 0.3 });
    bio.observe(box);
  });
})();
