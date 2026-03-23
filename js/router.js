/**
 * EPIC Foundation CRM — Hash-based Router
 */

const Router = (() => {
  'use strict';

  const routes = {};
  let currentRoute = null;

  function on(hash, handler) {
    routes[hash] = handler;
  }

  function navigate(hash) {
    // Strip leading # if caller included it
    const target = hash.replace(/^#/, '');
    const current = window.location.hash.replace(/^#/, '');
    if (current === target) {
      // Hash won't change so hashchange won't fire — dispatch manually
      dispatch();
    } else {
      window.location.hash = target;
    }
  }

  function getParams() {
    const hash = window.location.hash.slice(1); // remove #
    const [path, query] = hash.split('?');
    const params = {};
    if (query) {
      query.split('&').forEach(pair => {
        const [k, v] = pair.split('=');
        params[decodeURIComponent(k)] = decodeURIComponent(v || '');
      });
    }
    return { path, params };
  }

  function dispatch() {
    const { path, params } = getParams();
    const route = path || 'dashboard';
    currentRoute = route;

    // Update active nav
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.route === route);
    });

    const handler = routes[route] || routes['dashboard'];
    if (handler) handler(params);
  }

  function init() {
    window.addEventListener('hashchange', dispatch);
    dispatch();
  }

  function current() {
    return currentRoute;
  }

  return { on, navigate, init, current, getParams };
})();
