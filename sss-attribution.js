/* SSS entry measurement v1. Existing Umami only. No identity or payment data. */
(function () {
  'use strict';
  // Analytics blocking must never interfere with the existing registration link.
  function track(name, data) {
    if (!window.umami || typeof window.umami.track !== 'function') return;
    try {
      var pending = window.umami.track(name, data);
      if (pending && typeof pending.catch === 'function') pending.catch(function () {});
      return pending;
    } catch (_) { /* Registration remains available even if analytics is unavailable. */ }
  }
  // The installed tracker initializes its visit cache asynchronously. Wait for the
  // automatic pageview to finish so readiness and clicks use that same visit.
  var readyPromise = null;
  function markReady(attempt) {
    if (readyPromise) return readyPromise;
    var tracker = window.umami;
    if (tracker && tracker.getSession && tracker.getSession().cache) {
      readyPromise = Promise.resolve(track('sss_tracking_ready', { version: '1' }));
      return readyPromise;
    }
    if (attempt < 20) {
      return new Promise(function (resolve) {
        setTimeout(function () { resolve(markReady(attempt + 1)); }, 250);
      });
    }
    return Promise.resolve(false);
  }
  var ready = markReady(0);
  function clicked(link) {
    ready.then(function (result) {
      if (result === false) return;
      track('sss_join_cta', { position: link.getAttribute('data-sss-position'), version: '1' });
    });
  }
  document.addEventListener('click', function (event) {
    var link = event.target.closest && event.target.closest('a[data-sss-position]');
    if (!link) return;
    clicked(link);
  });
  document.addEventListener('auxclick', function (event) {
    if (event.button !== 1) return;
    var link = event.target.closest && event.target.closest('a[data-sss-position]');
    if (link) clicked(link);
  });
})();
