/* Shared guide runtime: Level memory, Job page tabs, Farm/Boss toggle.
   No framework, no build step. Each page keeps its own level math (V) inline and hands it to Guide.level. */
(function () {
  'use strict';
  var d = document;
  d.documentElement.classList.add('js');

  function $(i) { return d.getElementById(i); }
  function each(s, fn, root) { Array.prototype.forEach.call((root || d).querySelectorAll(s), fn); }
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function cl(x) { x = parseInt(x, 10); return x >= 1 && x <= 99 ? x : null; }
  function qlv() { try { return cl(new URLSearchParams(location.search).get('lv')); } catch (e) { return null; } }
  function storedLv(g) { return cl(get(g + '-lv')); }
  function saveLv(g, n) { set(g + '-lv', n); }

  // A wiki icon that fails to load leaves its lettered placeholder visible.
  d.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t.tagName === 'IMG' && t.parentNode && /\b(sk|ico)\b/.test(t.parentNode.className)) t.remove();
  }, true);

  function openUp(t) { for (var e = t; e; e = e.parentElement) if (e.tagName === 'DETAILS') e.open = true; }

  // Paint the result of a page's V(D, n, job) onto the DOM.
  function apply(v, n) {
    var k, e;
    each('.lvN', function (x) { x.textContent = n; });
    for (k in v.t) {
      e = $(k);
      if (e) { e.querySelector('.num').textContent = v.t[k][0]; e.querySelector('.lbl').textContent = v.t[k][1]; }
    }
    for (k in v.h) { e = $(k); if (e) e.innerHTML = v.h[k]; }
    each('.pre50', function (x) { x.hidden = !v.pre; });
    each('.post50', function (x) { x.hidden = v.pre; });
    each('details.lvs', function (x) {
      var on = x.id === v.st || v.gt.indexOf(x.id) >= 0;
      x.classList.toggle('here', on); x.open = on;
    });
    each('[data-st]:not(li)', function (x) { x.hidden = x.getAttribute('data-st') !== v.st; });
    each('[data-gt]', function (x) { x.hidden = v.gt.indexOf(x.getAttribute('data-gt')) < 0; });
    // Route timeline: bracket with the Level open, neighbours compact, the rest one line.
    var li = Array.prototype.slice.call(d.querySelectorAll('.tl > li[data-st]')), ix = -1;
    li.forEach(function (x, i) { if (x.getAttribute('data-st') === v.st) ix = i; });
    li.forEach(function (x, i) {
      var b = x.querySelector('details.br'), dist = Math.abs(i - ix);
      x.classList.toggle('here-li', dist === 0);
      b.classList.toggle('here', dist === 0);
      b.classList.toggle('near', dist === 1);
      b.classList.toggle('mini', dist > 1);
      b.open = dist === 0;
    });
  }

  var G = window.Guide = {};

  // o = {game:'bt', job:'rogue' (Job page only), code:'r', calc:V}
  G.level = function (o) {
    var D = JSON.parse($('lvd').textContent), N = $('lvin'), n = qlv() || storedLv(o.game) || 47;
    saveLv(o.game, n);
    if (o.job) set(o.game + '-job', o.job);
    function R() { apply(o.calc(D, n, o.code || 'r'), n); }
    if (N) {
      N.value = n;
      if ($('lvform')) $('lvform').hidden = false;
      N.addEventListener('input', function () { var x = cl(N.value); if (x) { n = x; saveLv(o.game, n); R(); } });
    }
    R();
    if (N && o.job) miniBar(N);
    return n;
  };

  // Phone: compact sticky bar (job name + Level) once the big header scrolls away. Hidden by CSS at >=760px.
  function miniBar(N) {
    var head = d.querySelector('.head');
    if (!head || !window.IntersectionObserver) return;
    var bar = d.createElement('div'), lab = d.createElement('label'), M = d.createElement('input'), nm = d.createElement('span');
    bar.className = 'minibar'; bar.hidden = true;
    nm.className = 'mb-name'; nm.textContent = (d.querySelector('.jname') || {}).textContent || '';
    M.type = 'number'; M.min = '1'; M.max = '99'; M.inputMode = 'numeric'; M.value = N.value;
    M.setAttribute('aria-label', 'เลเวลของคุณ (Base Lv)');
    lab.appendChild(d.createTextNode('Lv')); lab.appendChild(M);
    bar.appendChild(nm); bar.appendChild(lab);
    d.body.appendChild(bar);
    M.addEventListener('input', function () { N.value = M.value; N.dispatchEvent(new Event('input')); });
    N.addEventListener('input', function () { if (d.activeElement !== M) M.value = N.value; });
    new IntersectionObserver(function (e) { bar.hidden = e[0].isIntersecting; }).observe(head);
  }

  // Job page Tabs (#now #build #route #end) + Farm/Boss segmented control. Without JS every panel stays visible.
  G.tabs = function () {
    var nav = d.querySelector('.tabs');
    if (!nav) return;
    var links = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
    var ids = links.map(function (a) { return a.getAttribute('href').slice(1); });
    function up(el, cls) { for (; el && el.classList; el = el.parentElement) if (el.classList.contains(cls)) return el; return null; }
    function seg(t) {
      each('.seggroup', function (g) {
        var ps = Array.prototype.slice.call(g.querySelectorAll('.bpanel')), pick = t && up(t, 'bpanel');
        if (!pick || ps.indexOf(pick) < 0) pick = g.guidePick || ps[0];
        g.guidePick = pick;
        ps.forEach(function (p) { p.hidden = p !== pick; });
        each('.seg a', function (a) {
          var on = a.getAttribute('href') === '#' + pick.id;
          a.setAttribute('aria-pressed', on ? 'true' : 'false');
        }, g);
      });
    }
    function go(scroll) {
      var h = '', t = null;
      try { h = decodeURIComponent(location.hash.slice(1)); } catch (e) {}
      if (h) t = $(h);
      var p = t && up(t, 'panel');
      var id = p && ids.indexOf(p.id) >= 0 ? p.id : ids[0];
      ids.forEach(function (i) { var x = $(i); if (x) x.hidden = i !== id; });
      links.forEach(function (a) {
        if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      });
      seg(t && t !== p ? t : null);
      if (t && t !== p) { openUp(t); if (scroll) t.scrollIntoView(); }
      else if (scroll) window.scrollTo(0, 0);
    }
    addEventListener('hashchange', function () { go(true); });
    // Clicking a link to the hash we are already on fires no hashchange; still reveal it.
    d.addEventListener('click', function (ev) {
      var a = ev.target.closest && ev.target.closest('a[href^="#"]');
      if (a && a.getAttribute('href') === location.hash) setTimeout(function () { go(true); }, 0);
    });
    go(!!location.hash);
  };

  // Game page: remember the chosen job; mark the one being played.
  G.jobCards = function (game) {
    var cur = get(game + '-job'), n = storedLv(game);
    each('a.jc[data-job]', function (a) {
      var j = a.getAttribute('data-job');
      a.addEventListener('click', function () { set(game + '-job', j); });
      if (j === cur) {
        var m = d.createElement('span');
        m.className = 'mine';
        m.textContent = 'เล่นอยู่' + (n ? ' · Lv ' + n : '');
        a.appendChild(m);
      }
    });
  };
})();
