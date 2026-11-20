/* =========================================================
   GRIEGOS STORE — CARGA SÍNCRONA DE DATOS DESDE JSON
   Archivo: scripts/init-data.js
   ========================================================= */

(function() {
  "use strict";

  function syncFetch(url) {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, false); // false = síncrono, bloquea hasta terminar
    xhr.send();
    if (xhr.status !== 200) {
      throw new Error("Error al cargar " + url + " (status " + xhr.status + ")");
    }
    return xhr.responseText;
  }

  try {
    window.GRIEGOS_CONFIG = JSON.parse(syncFetch("../data/config.json"));
    window.GRIEGOS_PRODUCTS = JSON.parse(syncFetch("../data/products.json"));
    console.log("GRIEGOS STORE: datos cargados desde JSON.");
  } catch (e) {
    console.error("GRIEGOS STORE: error cargando datos JSON:", e);
    window.GRIEGOS_CONFIG = window.GRIEGOS_CONFIG || {};
    window.GRIEGOS_PRODUCTS = window.GRIEGOS_PRODUCTS || [];
  }
})();
