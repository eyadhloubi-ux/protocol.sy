/* كفاءة | Kafa'a — منطق العرض */
(function () {
  'use strict';

  var root = document.documentElement;
  var vp = document.getElementById('vp');
  var deck = document.getElementById('deck');
  var slides = [].slice.call(document.querySelectorAll('.slide'));
  var dots = [].slice.call(document.querySelectorAll('.dots button'));
  var curEl = document.getElementById('cur');
  var hint = document.getElementById('hint');
  var hintText = document.getElementById('hintText');

  var LAST = slides.length - 1;
  var idx = 0;
  var flow = false;
  var lastMove = 0, acc = 0;
  var mq = window.matchMedia('(max-width: 760px), (max-height: 500px)');

  /* items revealed one per scroll, grouped by slide */
  var groups = slides.map(function (s) { return [].slice.call(s.querySelectorAll('.step')); });
  var shown = groups.map(function () { return 0; });

  function renderSteps() {
    if (flow) return;
    groups.forEach(function (g, si) {
      var n = shown[si];
      g.forEach(function (el, i) {
        el.classList.toggle('shown', i < n);
        el.classList.toggle('cur', si === idx && i === n - 1);
      });
      var c = slides[si].querySelector('.counter b');
      if (c) c.textContent = String(Math.max(n, 1));
    });
  }

  /* scale each slide's content to fit the screen */
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
    hint.classList.toggle('off', idx === LAST && shown[idx] >= groups[idx].length);
    hintText.textContent = shown[idx] < groups[idx].length ? 'مرّر لإظهار التالي' : 'مرّر للمتابعة';
    renderSteps();
  }

  function go(n) {
    n = Math.max(0, Math.min(LAST, n));
    if (n === idx) return;
    shown[n] = n > idx ? Math.min(1, groups[n].length) : groups[n].length;
    idx = n;
    layout();
  }
  function next() {
    if (shown[idx] < groups[idx].length) { shown[idx]++; layout(); return; }
    go(idx + 1);
  }
  function prev() {
    if (shown[idx] > 1) { shown[idx]--; layout(); return; }
    go(idx - 1);
  }

  /* flow mode: reveal items as they scroll into view */
  var io = null;
  var allSteps = [].concat.apply([], groups);
  function startObserver() {
    if (io) return;
    if (!('IntersectionObserver' in window)) {
      allSteps.forEach(function (s) { s.classList.add('shown'); });
      return;
    }
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('shown');
        io.unobserve(e.target);
      });
    }, { threshold: 0.25 });
    allSteps.forEach(function (s) { io.observe(s); });
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
      if (!was) allSteps.forEach(function (s) { s.classList.remove('shown', 'cur'); });
      startObserver();
    } else {
      stopObserver();
      if (shown[idx] === 0) shown[idx] = Math.min(1, groups[idx].length);
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
