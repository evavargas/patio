// Archivo externo del mismo origen (la CSP no permite scripts en linea): evita el parpadeo de tema.
// Claves y atributos iguales a los de packages/theme/src/theme-provider.tsx.
(function () {
  var mode = null;
  var theme = null;
  try {
    mode = localStorage.getItem('patio-theme-mode');
    theme = localStorage.getItem('patio-theme-id');
  } catch (e) {
    /* almacenamiento bloqueado */
  }
  var dark = mode === 'dark' || (mode !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  var root = document.documentElement;
  root.dataset.theme = theme || 'default';
  root.dataset.mode = dark ? 'dark' : 'light';
  root.style.colorScheme = dark ? 'dark' : 'light';
})();
