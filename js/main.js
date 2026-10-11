/* كفاءة | Kafa'a — منطق العرض: شريحة واحدة في كل مرة على كل الشاشات */
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
  var touchUI = window.matchMedia('(hover: none)').matches;

  var LAST = slides.length - 1;
  var MIN_SCALE = 0.72;
  var idx = 0;
  var lastMove = 0, acc = 0;

  /* items revealed one per scroll, grouped by slide */
  var groups = slides.map(function (s) { return [].slice.call(s.querySelectorAll('.step')); });
  var shown = groups.map(function () { return 0; });

  function isScroll(s) { return s.classList.contains('scroll'); }
  function atTop(s) { return s.scrollTop <= 2; }
  function atBottom(s) { return s.scrollTop + s.clientHeight >= s.scrollHeight - 2; }

  function renderSteps() {
    groups.forEach(function (g, si) {
      var n = shown[si];
      g.forEach(function (el, i) {
        el.classList.toggle('shown', i < n);
        el.classList.toggle('cur', si === idx && i === n - 1 && !isScroll(slides[si]));
      });
      var c = slides[si].querySelector('.counter b');
      if (c) c.textContent = String(Math.max(n, 1));
    });
  }

  /* scale each slide's content to fit; too tall -> the slide scrolls inside itself */
  function fit() {
    slides.forEach(function (s, si) {
      var f = s.querySelector('.fit');
      if (!f) return;
      s.classList.remove('scroll');
      f.style.transform = 'none';
      var cs = getComputedStyle(s);
      var availH = s.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      var availW = s.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      var scale = Math.min(1, availH / f.offsetHeight, availW / f.offsetWidth);
      if (scale < MIN_SCALE) {
        s.classList.add('scroll');
        shown[si] = groups[si].length;   // in a scrolling slide everything is visible
      } else {
        f.style.transform = scale < 0.999 ? 'scale(' + scale.toFixed(3) + ')' : 'none';
      }
    });
  }

  function updateHint() {
    var more = shown[idx] < groups[idx].length;
    var verb = touchUI ? 'اسحب للأعلى' : 'مرّر';
    hintText.textContent = more ? verb + ' لإظهار التالي' : verb + ' للمتابعة';
    hint.classList.toggle('off', idx === LAST && !more);
  }

  function layout() {
    var h = vp.clientHeight;
    root.style.setProperty('--h', h + 'px');
    deck.style.transform = 'translateY(' + (-idx * h) + 'px)';
    slides.forEach(function (s, i) { s.classList.toggle('active', i === idx); });
    dots.forEach(function (d, i) { d.classList.toggle('on', i === idx); });
    if (curEl) curEl.textContent = String(idx + 1);
    renderSteps();
    updateHint();
  }

  function go(n) {
    n = Math.max(0, Math.min(LAST, n));
    if (n === idx) return;
    var s = slides[n];
    if (isScroll(s)) {
      shown[n] = groups[n].length;
      s.scrollTop = n > idx ? 0 : s.scrollHeight;
    } else {
      shown[n] = n > idx ? Math.min(1, groups[n].length) : groups[n].length;
    }
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

  /* ---------- input ---------- */
  window.addEventListener('wheel', function (e) {
    var s = slides[idx];
    if (isScroll(s) && ((e.deltaY > 0 && !atBottom(s)) || (e.deltaY < 0 && !atTop(s)))) return; // scroll inside the slide
    e.preventDefault();
    var now = Date.now();
    if (now - lastMove < 750) return;
    acc += e.deltaY;
    if (Math.abs(acc) > 30) { (acc > 0 ? next : prev)(); acc = 0; lastMove = now; }
  }, { passive: false });

  window.addEventListener('keydown', function (e) {
    if ((e.key === ' ' || e.key === 'Enter') && e.target.closest && e.target.closest('button')) return;
    var s = slides[idx];
    if (['ArrowDown', 'PageDown', ' ', 'ArrowLeft'].indexOf(e.key) > -1) {
      if (isScroll(s) && !atBottom(s) && e.key !== 'ArrowLeft') return;
      e.preventDefault(); next();
    } else if (['ArrowUp', 'PageUp', 'ArrowRight'].indexOf(e.key) > -1) {
      if (isScroll(s) && !atTop(s) && e.key !== 'ArrowRight') return;
      e.preventDefault(); prev();
    } else if (e.key === 'Home') { go(0); }
    else if (e.key === 'End') { go(LAST); }
  });

  var ty = null, tx = null, startTop = false, startBottom = false;
  window.addEventListener('touchstart', function (e) {
    var s = slides[idx];
    ty = e.touches[0].clientY; tx = e.touches[0].clientX;
    startTop = !isScroll(s) || atTop(s);
    startBottom = !isScroll(s) || atBottom(s);
  }, { passive: true });
  window.addEventListener('touchmove', function (e) {
    if (!isScroll(slides[idx])) e.preventDefault();
  }, { passive: false });
  window.addEventListener('touchend', function (e) {
    if (ty === null) return;
    var dy = ty - e.changedTouches[0].clientY;
    var dx = tx - e.changedTouches[0].clientX;
    ty = null;
    if (Math.abs(dy) < 50 || Math.abs(dx) > Math.abs(dy)) return;
    if (dy > 0 && startBottom) next();
    else if (dy < 0 && startTop) prev();
  });

  dots.forEach(function (d) { d.addEventListener('click', function () { go(+d.dataset.go); }); });

  /* ---------- programs menu: tabs + picks ---------- */
  var tabs = [].slice.call(document.querySelectorAll('.tab'));
  var tracks = [].slice.call(document.querySelectorAll('.track'));
  tabs.forEach(function (t) {
    t.addEventListener('click', function () {
      tabs.forEach(function (o) { var on = o === t; o.classList.toggle('on', on); o.setAttribute('aria-selected', String(on)); });
      tracks.forEach(function (tr) { tr.classList.toggle('on', tr.dataset.track === t.dataset.tab); });
      fit(); layout();
    });
  });

  var progs = [].slice.call(document.querySelectorAll('.prog'));
  var pickCount = document.getElementById('pickCount');
  var KEY = 'kafaa-picks';
  function savePicks() {
    var ids = progs.filter(function (p) { return p.getAttribute('aria-pressed') === 'true'; }).map(function (p) { return p.dataset.id; });
    if (pickCount) pickCount.textContent = String(ids.length);
    try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch (err) {}
  }
  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || '[]');
    progs.forEach(function (p) { if (saved.indexOf(p.dataset.id) > -1) p.setAttribute('aria-pressed', 'true'); });
  } catch (err) {}
  progs.forEach(function (p) {
    p.addEventListener('click', function () {
      p.setAttribute('aria-pressed', String(p.getAttribute('aria-pressed') !== 'true'));
      savePicks();
    });
  });
  var resetBtn = document.getElementById('pickReset');
  if (resetBtn) resetBtn.addEventListener('click', function () {
    progs.forEach(function (p) { p.setAttribute('aria-pressed', 'false'); });
    savePicks();
  });
  savePicks();

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
  function refresh() {
    root.style.setProperty('--h', vp.clientHeight + 'px');
    fit();
    if (shown[idx] === 0) shown[idx] = Math.min(1, groups[idx].length);
    layout();
  }
  var resizeT;
  window.addEventListener('resize', function () {
    clearTimeout(resizeT);
    resizeT = setTimeout(refresh, 80);
  });
  refresh();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
})();
