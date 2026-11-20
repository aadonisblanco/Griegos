/* =========================================================
   GRIEGOS STORE — CARGA DE DATOS (JSON con fallback a API)
   Archivo: scripts/init-data.js
   ========================================================= */

(() => {
  "use strict";

  const API_BASE = "https://oficial.griegos.workers.dev/api";

  async function fetchJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} al cargar ${url}`);
    return await res.json();
  }

  async function boot() {
    try {
      /* 1. Intentar cargar desde los archivos JSON de Pages */
      const [config, products] = await Promise.all([
        fetchJSON("../data/config.json"),
        fetchJSON("../data/products.json")
      ]);

      window.GRIEGOS_CONFIG = config;
      window.GRIEGOS_PRODUCTS = Array.isArray(products) ? products : [];

      console.log("GRIEGOS STORE: datos cargados desde JSON local.");
    } catch (e) {
      console.warn("GRIEGOS STORE: no se pudo leer JSON local, usando API del Worker:", e.message);

      /* 2. Fallback: cargar productos desde la API del Worker (ya confirmada que funciona) */
      try {
        const products = await fetchJSON(`${API_BASE}/products`);
        window.GRIEGOS_PRODUCTS = Array.isArray(products) ? products : [];
        window.GRIEGOS_CONFIG = window.GRIEGOS_CONFIG || {
          siteName: "GRIEGOS Fitness Shop",
          whatsappPhone: "5353012721",
          welcomeMessage: "Bienvenido a GRIEGOS.",
          currency: { code: "USD", symbol: "$", locale: "en-US" },
          messages: { general: "Hola, GRIEGOS.", order: "Hola, GRIEGOS." }
        };
        console.log("GRIEGOS STORE: productos cargados desde API del Worker.");
      } catch (e2) {
        console.error("GRIEGOS STORE: no se pudieron cargar productos:", e2.message);
        window.GRIEGOS_PRODUCTS = [];
        window.GRIEGOS_CONFIG = window.GRIEGOS_CONFIG || {};
      }
    }

    /* 3. Disparar evento para que el resto de la app sepa que los datos están listos */
    window.dispatchEvent(new CustomEvent("griegos:data-ready", {
      detail: {
        config: window.GRIEGOS_CONFIG,
        products: window.GRIEGOS_PRODUCTS
      }
    }));
  }

  boot();
})();
