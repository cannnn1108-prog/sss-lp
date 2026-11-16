/* SSSブログの記事の計測 v1（L-20261116-28）。既存のUmamiだけ。個人の値・URLのクエリ・本文は送らない */
(function () {
  'use strict';
  var art = document.querySelector('.g-art');
  var m = /^\/guide\/([a-z0-9-]+)\/?$/.exec(location.pathname);
  if (!art || !m) return;
  var slug = m[1];
  // 計測が止められていても記事の動きには触らない
  function track(name, data) {
    var u = window.umami;
    if (!u || typeof u.track !== 'function') return;
    try { var r = u.track(name, data); if (r && typeof r.catch === 'function') r.catch(function () {}); } catch (_) {}
  }
  // 自動のページ表示が済んで同じ訪問になってから送る（sss-attribution.js と同じ待ち方・有限回）
  var queue = [], ready = false, tries = 0;
  function poll() {
    var u = window.umami;
    if (u && typeof u.track === 'function' && (!u.getSession || u.getSession().cache)) {
      ready = true; queue.splice(0).forEach(function (x) { track(x[0], x[1]); }); return;
    }
    if (++tries < 40) setTimeout(poll, 250); else queue.length = 0;
  }
  function send(name, data) { if (ready) track(name, data); else if (tries < 40) queue.push([name, data]); }
  poll();

  // 読了度：記事の頭から末尾の「SSSで一緒にやってみる」の箱まで（無ければ記事の終わり）を何%見たか。25/50/75/100 を1回ずつ
  var STEPS = [25, 50, 75, 100], sent = {}, done = false, ticking = false;
  function check() {
    ticking = false;
    if (done) return;
    var top = art.getBoundingClientRect().top + window.scrollY;
    var join = document.getElementById('g-join');
    var end = (join ? join.getBoundingClientRect().top : art.getBoundingClientRect().bottom) + window.scrollY;
    if (end <= top) return;
    var p = (window.scrollY + window.innerHeight - top) / (end - top) * 100;
    for (var i = 0; i < STEPS.length; i++) {
      if (p >= STEPS[i] && !sent[STEPS[i]]) { sent[STEPS[i]] = 1; send('sss_blog_read', { slug: slug, depth: String(STEPS[i]) }); }
    }
    if (sent[100]) { done = true; window.removeEventListener('scroll', onScroll); }
  }
  function onScroll() { if (!ticking) { ticking = true; (window.requestAnimationFrame || setTimeout)(check); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('load', check);
  if (document.readyState !== 'loading') check(); else document.addEventListener('DOMContentLoaded', check);

  // 記事内の外部の出典リンク（SSSへの導線・決済ページ・サイト内は除く）。送るのは記事名と行き先のドメインだけ
  function outbound(ev) {
    if (ev.type === 'auxclick' && ev.button !== 1) return;
    var a = ev.target.closest && ev.target.closest('a[href]');
    if (!a || a.hasAttribute('data-sss-position') || !art.contains(a)) return;
    var host = String(a.hostname || '').toLowerCase();
    if (!/^https?:$/.test(a.protocol) || !host || /(^|\.)aisalonsss\.com$/.test(host) || host === 'univa.cc') return;
    send('sss_blog_outbound', { slug: slug, host: host.slice(0, 100) });
  }
  document.addEventListener('click', outbound);
  document.addEventListener('auxclick', outbound);
})();
