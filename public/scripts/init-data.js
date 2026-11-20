/* =========================================================
   GRIEGOS STORE — CARGA DE DATOS DESDE JSON
   Archivo: scripts/init-data.js
   ========================================================= */

(() => {
  "use strict";

  async function boot() {
    try {
      const [configRes, productsRes] = await Promise.all([
        fetch("../data/config.json"),
        fetch("../data/products.json")
      ]);

      if (!configRes.ok) throw new Error("No se pudo cargar config.json");
      if (!productsRes.ok) throw new Error("No se pudo cargar products.json");

      window.GRIEGOS_CONFIG = await configRes.json();
      window.GRIEGOS_PRODUCTS = await productsRes.json();

      window.dispatchEvent(new Event("griegos:data-ready"));
      console.log("GRIEGOS STORE: datos cargados desde JSON.");

      /* Cargar el resto de scripts en orden, ahora que ya hay datos */
      const scripts = [
        "../scripts/config.js",
        "../scripts/products.js",
        "../scripts/calculators.js",
        "../scripts/cart.js",
        "../scripts/main.js",
        "../scripts/store-motion.js"
      ];

      for (const src of scripts) {
        await loadScript(src);
      }
    } catch (error) {
      console.error("GRIEGOS STORE: error cargando datos desde JSON:", error);
      window.GRIEGOS_CONFIG = window.GRIEGOS_CONFIG || {};
      window.GRIEGOS_PRODUCTS = window.GRIEGOS_PRODUCTS || [];
      window.dispatchEvent(new Event("griegos:data-ready"));
    }
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  boot();
})();
