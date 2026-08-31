(function normalizeLegacyHashRoute() {
  if (!window.location.hash || window.location.hash.indexOf('#/') !== 0) return;
  var legacyRoute = new URL(window.location.hash.slice(1), window.location.origin);
  var oldParams = new URLSearchParams(window.location.search);
  var routeParams = new URLSearchParams(legacyRoute.search);
  oldParams.forEach(function preserve(value, key) {
    if (!routeParams.has(key)) routeParams.append(key, value);
  });
  var query = routeParams.toString();
  window.history.replaceState(null, '', legacyRoute.pathname + (query ? '?' + query : ''));
})();
