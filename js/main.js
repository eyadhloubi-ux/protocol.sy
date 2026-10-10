/* بروتوكول الكرامة — منطق العرض */
(function () {
  'use strict';

  var root = document.documentElement;
  var vp = document.getElementById('vp');
  var deck = document.getElementById('deck');
  var slides = [].slice.call(document.querySelectorAll('.slide'));
  var steps = [].slice.call(document.querySelectorAll('.step'));
  var media = [].slice.call(document.querySelectorAll('#mediaTrack li'));
  var dots = [].slice.call(document.querySelectorAll('.dots button'));
  var kEl = document.getElementById('k');
  var curEl = document.getElementById('cur');
  var hint = document.getElementById('hint');
  var hintText = document.getElementById('hintText');

  var STEP_SLIDE = 1;
  var LAST = slides.length - 1;
  var N = steps.length;
  var idx = 0;        // current slide
  var shown = 1;      // how many stages are revealed on slide 2
  var flow = false;   // phone / short-screen mode (normal scrolling page)
  var lastMove = 0, acc = 0;
  var mq = window.matchMedia('(max-width: 760px), (max-height: 500px)');

  /* ---------- badges (slide 1) ---------- */
  var badges = [].slice.call(document.querySelectorAll('.badge'));
  var desc = document.getElementById('desc');
  var descT = document.getElementById('descT');
  var descP = document.getElementById('descP');
  badges.forEach(function (b) {
    b.addEventListener('click', function () {
      badges.forEach(function (o) {
        var on = o === b;
        o.classList.toggle('on', on);
        o.setAttribute('aria-pressed', String(on));
      });
      descT.textContent = b.dataset.title;
      descP.textContent = b.dataset.text;
      desc.classList.remove('swap');
      void desc.offsetWidth;
      desc.classList.add('swap');
    });
  });

  /* ---------- stages (slide 2) ---------- */
  function renderSteps() {
    steps.forEach(function (s, i) {
      s.classList.toggle('shown', i < shown);
      s.classList.toggle('cur', idx === STEP_SLIDE && i === shown - 1);
    });
    media.forEach(function (m, i) { m.classList.toggle('shown', i < shown); });
    if (kEl) kEl.textContent = String(shown);
  }

  /* ---------- scale each slide's content to fit the screen ---------- */
  function fit() {
    if (flow) return;
    slides.forEach(function (s) {
      var f = s.querySelector('.fit');
      if (!f) return;
      f.style.transform = 'none';
      var cs = getComputedStyle(s);
      var availH = s.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      var availW = s.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      var scale = Math.min(1, availH / f.offsetHeight, availW / f.offsetWidth);
      f.style.transform = scale < 0.999 ? 'scale(' + scale.toFixed(3) + ')' : 'none';
    });
  }

  function layout() {
    var h = vp.clientHeight;
    root.style.setProperty('--h', h + 'px');
    deck.style.transform = 'translateY(' + (-idx * h) + 'px)';
    slides.forEach(function (s, i) { s.classList.toggle('active', i === idx); });
    dots.forEach(function (d, i) { d.classList.toggle('on', i === idx); });
    if (curEl) curEl.textContent = String(idx + 1);
    hint.classList.toggle('off', idx === LAST);
    hintText.textContent = (idx === STEP_SLIDE && shown < N) ? 'مرّر لإظهار المرحلة التالية' : 'مرّر للمتابعة';
    renderSteps();
  }

  function go(n) {
    n = Math.max(0, Math.min(LAST, n));
    if (n === idx) return;
    if (n === STEP_SLIDE) shown = n > idx ? 1 : N;
    idx = n;
    layout();
  }
  function next() {
    if (idx === STEP_SLIDE && shown < N) { shown++; layout(); return; }
    go(idx + 1);
  }
  function prev() {
    if (idx === STEP_SLIDE && shown > 1) { shown--; layout(); return; }
    go(idx - 1);
  }

  /* ---------- flow mode: reveal stages as they scroll into view ---------- */
  var io = null;
  function startObserver() {
    if (io) return;
    if (!('IntersectionObserver' in window)) {
      shown = N; renderSteps(); return;
    }
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        if (el.classList.contains('step')) {
          el.classList.add('shown');
          var i = steps.indexOf(el);
          if (media[i]) media[i].classList.add('shown');
        } else if (el.id === 'media') {
          media.forEach(function (m, i) { setTimeout(function () { m.classList.add('shown'); }, i * 180); });
        }
        io.unobserve(el);
      });
    }, { threshold: 0.3 });
    steps.forEach(function (s) { io.observe(s); });
    io.observe(document.getElementById('media'));
  }
  function stopObserver() { if (io) { io.disconnect(); io = null; } }

  function setMode() {
    var was = flow;
    flow = mq.matches;
    root.classList.toggle('flow', flow);
    root.classList.toggle('deckmode', !flow);
    if (flow) {
      deck.style.transform = 'none';
      slides.forEach(function (s) {
        s.classList.add('active');
        var f = s.querySelector('.fit'); if (f) f.style.transform = 'none';
      });
      steps.forEach(function (s) { s.classList.remove('cur'); });
      if (!was) {
        steps.forEach(function (s) { s.classList.remove('shown'); });
        media.forEach(function (m) { m.classList.remove('shown'); });
      }
      startObserver();
    } else {
      stopObserver();
      layout();
      fit();
    }
  }

  /* ---------- input ---------- */
  window.addEventListener('wheel', function (e) {
    if (flow) return;
    e.preventDefault();
    var now = Date.now();
    if (now - lastMove < 750) return;
    acc += e.deltaY;
    if (Math.abs(acc) > 30) { (acc > 0 ? next : prev)(); acc = 0; lastMove = now; }
  }, { passive: false });

  window.addEventListener('keydown', function (e) {
    if (flow) return;
    if ((e.key === ' ' || e.key === 'Enter') && e.target.closest && e.target.closest('button')) return;
    if (['ArrowDown', 'PageDown', ' ', 'ArrowLeft'].indexOf(e.key) > -1) { e.preventDefault(); next(); }
    else if (['ArrowUp', 'PageUp', 'ArrowRight'].indexOf(e.key) > -1) { e.preventDefault(); prev(); }
    else if (e.key === 'Home') { go(0); }
    else if (e.key === 'End') { go(LAST); }
  });

  var ty = null;
  window.addEventListener('touchstart', function (e) { if (!flow) ty = e.touches[0].clientY; }, { passive: true });
  window.addEventListener('touchmove', function (e) { if (!flow) e.preventDefault(); }, { passive: false });
  window.addEventListener('touchend', function (e) {
    if (flow || ty === null) return;
    var dy = ty - e.changedTouches[0].clientY; ty = null;
    if (Math.abs(dy) > 45) (dy > 0 ? next : prev)();
  });

  dots.forEach(function (d) { d.addEventListener('click', function () { go(+d.dataset.go); }); });

  /* ---------- fullscreen ---------- */
  var fsBtn = document.getElementById('fs');
  if (fsBtn) {
    if (!document.fullscreenEnabled) { fsBtn.hidden = true; }
    fsBtn.addEventListener('click', function () {
      try {
        if (document.fullscreenElement) { document.exitFullscreen(); }
        else {
          var p = root.requestFullscreen();
          if (p && p.catch) p.catch(function () { fsBtn.hidden = true; });
        }
      } catch (err) { fsBtn.hidden = true; }
    });
  }

  /* ---------- start ---------- */
  var resizeT;
  window.addEventListener('resize', function () {
    clearTimeout(resizeT);
    resizeT = setTimeout(setMode, 80);
  });
  setMode();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (!flow) fit(); });
})();
