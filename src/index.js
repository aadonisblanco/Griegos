/* =========================================================
   GRIEGOS STORE — BACKEND (Cloudflare Worker)
   Archivo: src/index.js
   =========================================================
   Expone una API REST para productos y carrito, y sirve el
   sitio estático (carpeta public/) bajo el mismo dominio.
   Enlaces de ejemplo: https://griegos.adonisblanco133.workers.dev
   ========================================================= */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    /* Cabeceras CORS (permite que el frontend llame a la API) */
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    /* =========================================================
       API REST
       ========================================================= */
    if (path.startsWith("/api/")) {
      return handleApi(request, url, env, corsHeaders);
    }

    /* =========================================================
       SITIO ESTÁTICO (HTML, CSS, JS, imágenes, assets)
       ========================================================= */
    return await env.ASSETS.fetch(request);
  },
};

/* Respuesta JSON helper */
function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...extra,
    },
  });
}

/* Inventario de productos (mismo catálogo que data/products.js) */
import { PRODUCTS } from "./products-data.js";

const CART_KEY = "griegos_store_cart";

/* Fallback en memoria si no hay KV configurado */
let memoryCart = [];

/* Maneja todas las peticiones a /api/... */
async function handleApi(request, url, env, corsHeaders) {
  const segments = url.pathname.split("/").filter(Boolean);
  // segments: ["api", "products" | "cart" | "order", id?]
  const resource = segments[1];
  const id = segments[2];
  const headers = { ...corsHeaders };

  /* -------------------------------------------------------
     PRODUCTOS
     ------------------------------------------------------- */
  if (resource === "products") {
    if (method === "GET") {
      if (id) {
        const product = PRODUCTS.find((p) => p.id === id);
        if (!product) {
          return json({ error: "Producto no encontrado" }, 404, headers);
        }
        return json(product, 200, headers);
      }

      let list = PRODUCTS;
      const category = url.searchParams.get("category");
      const onlyAvailable = url.searchParams.get("available");

      if (category && category !== "all") {
        list = list.filter((p) => p.category === category);
      }
      if (onlyAvailable === "true") {
        list = list.filter((p) => p.available !== false);
      }

      return json(list, 200, headers);
    }

    return json({ error: "Método no permitido" }, 405, headers);
  }

  /* -------------------------------------------------------
     CARRITO  (GET / POST / DELETE)
     ------------------------------------------------------- */
  if (resource === "cart") {
    const KV = env.CART_KV;
    const useKV = !!KV;

    if (method === "GET") {
      let items = [];
      if (useKV) {
        const raw = await KV.get(CART_KEY);
        items = raw ? JSON.parse(raw) : [];
      } else {
        items = memoryCart;
      }
      return json(
        { items, count: items.length, source: useKV ? "kv" : "memory" },
        200,
        headers
      );
    }

    if (method === "POST") {
      let body = {};
      try {
        body = await request.json();
      } catch (e) {
        /* ignorar JSON inválido */
      }

      const { items } = body;
      if (!Array.isArray(items)) {
        return json({ error: "Se espera un arreglo de ítems" }, 400, headers);
      }

      if (useKV) {
        await KV.put(CART_KEY, JSON.stringify(items));
      } else {
        memoryCart = items;
      }

      return json(
        { ok: true, items, source: useKV ? "kv" : "memory" },
        200,
        headers
      );
    }

    if (method === "DELETE") {
      if (useKV) {
        await KV.delete(CART_KEY);
      } else {
        memoryCart = [];
      }
      return json(
        { ok: true, source: useKV ? "kv" : "memory" },
        200,
        headers
      );
    }

    return json({ error: "Método no permitido" }, 405, headers);
  }

  /* -------------------------------------------------------
     PEDIDO → prepara mensaje de WhatsApp para GRIEGOS
     ------------------------------------------------------- */
  if (resource === "order") {
    if (method === "POST") {
      let body = {};
      try {
        body = await request.json();
      } catch (e) {
        /* ignorar JSON inválido */
      }

      const {
        customerName,
        customerPhone,
        customerMunicipality,
        items,
        deliveryMode,
        paymentMethod,
        notes,
      } = body;

      if (!customerName || !customerPhone || !items || !items.length) {
        return json(
          { error: "Faltan datos requeridos del pedido" },
          400,
          headers
        );
      }

      const subtotal = items.reduce(
        (sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 1),
        0
      );

      const productList = items
        .map(
          (i) =>
            `- ${i.name || "Producto"} x${i.quantity || 1} ($${(
              Number(i.price) || 0
            ).toFixed(2)})`
        )
        .join("\n");

      const text = `
*Nuevo pedido GRIEGOS*
Cliente: ${customerName}
Teléfono: ${customerPhone}
Municipio: ${customerMunicipality || "—"}
Entrega: ${deliveryMode || "—"}
Pago: ${paymentMethod || "—"}
Subtotal estimado: $${subtotal.toFixed(2)}
Productos:
${productList}
Notas: ${notes || "—"}
`.trim();

      const whatsappUrl =
        "https://wa.me/+5353012721?text=" + encodeURIComponent(text);

      return json(
        {
          ok: true,
          subtotal,
          whatsappUrl,
          message:
            "Pedido preparado. GRIEGOS revisará disponibilidad, costo de entrega y pago antes de confirmar.",
        },
        200,
        headers
      );
    }

    return json({ error: "Método no permitido" }, 405, headers);
  }

  return json({ error: "Ruta no encontrada" }, 404, headers);
}
