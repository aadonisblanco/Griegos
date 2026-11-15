# 🏗️ GRIEGOS Store — Backend en Cloudflare Workers

Sitio: `https://griegos.adonisblanco133.workers.dev`

## Qué se creó

| Archivo | Para qué sirve |
|---------|----------------|
| `wrangler.toml` | Configuración del Worker de Cloudflare. Nombre del servicio: **griegos**. Sirve archivos estáticos desde `public/`. |
| `package.json` | Scripts para desplegar (`wrangler deploy`) y probar en local (`wrangler dev`). |
| `src/index.js` | **Backend**. API REST de productos y carrito + servidor del sitio estático. |
| `src/products-data.js` | Catálogo de productos (64 productos: suplementos, accesorios, ropa). |
| `public/` | Copia de tu sitio estático actual (HTML, CSS, JS, imágenes, assets). |

## Endpoints de la API

Base: `https://griegos.adonisblanco133.workers.dev/api`

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/products` | Lista todos los productos. Query: `?category=suplementos` o `?available=true` |
| `GET` | `/api/products/:id` | Un producto por su ID (ej. `/api/products/suplemento-001`) |
| `GET` | `/api/cart` | Obtiene el carrito guardado |
| `POST` | `/api/cart` | Guarda el carrito completo (body: `{ items: [...] }`) |
| `DELETE` | `/api/cart` | Vacía el carrito |
| `POST` | `/api/order` | Prepara el pedido y devuelve un enlace de WhatsApp para GRIEGOS |

El carrito se guarda en **Cloudflare KV** si configuras `CART_KV` en `wrangler.toml`. Si no, se guarda en memoria del Worker (se reinicia al desplegar) y el frontend sigue usando `localStorage` del navegador.

## Requisitos previos

1. Una cuenta de Cloudflare (gratis) con el subdominio `adonisblanco133.workers.dev` ya asignado.
2. Instalar **Node.js** (https://nodejs.org/).
3. Instalar Wrangler (CLI de Cloudflare):

```bash
npm install -g wrangler
```

## Paso a paso para subir y tener la página

### 1. Abrir la terminal en la carpeta del proyecto
```bash
cd "C:\Users\tuane\OneDrive\Documentos\Griegos\Griegos"
```

### 2. Autenticarte en Cloudflare
```bash
wrangler login
```
Se abrirá el navegador para autorizar. Inicia sesión con tu cuenta de Cloudflare.

### 3. (Opcional) Crear KV para persistencia del carrito
Ve a Cloudflare Dashboard → Workers & Pages → KV → Create a namespace. Copia los IDs y pégalos en `wrangler.toml` descomentando la sección `[[kv_namespaces]]`.

Si lo saltas, el carrito funciona en memoria (suficiente para empezar).

### 4. Desplegar
```bash
wrangler deploy
```

Cuando termine, Wrangler te dirá la URL. Debería ser:
```
https://griegos.adonisblanco133.workers.dev
```

### 5. Probar la API
Abre en el navegador:
- Productos: `https://griegos.adonisblanco133.workers.dev/api/products`
- Un producto: `https://griegos.adonisblanco133.workers.dev/api/products/suplemento-001`

### 6. Ver la tienda
Abre:
`https://griegos.adonisblanco133.workers.dev/store/`

## Cómo conectar el frontend al backend

Por defecto tu frontend (`scripts/cart.js`) guarda el carrito en `localStorage` del navegador. Si quieres que use el backend de Cloudflare, edita `scripts/cart.js` y reemplaza las funciones `loadCart()` y `saveCart()` por algo como:

```javascript
const API_BASE = "https://griegos.adonisblanco133.workers.dev/api";

async function loadCart() {
  try {
    const res = await fetch(`${API_BASE}/cart`);
    const data = await res.json();
    state.items = data.items || [];
  } catch (e) {
    console.error("No se pudo cargar el carrito del backend", e);
    state.items = [];
  }
}

async function saveCart() {
  try {
    await fetch(`${API_BASE}/cart`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state.items),
    });
  } catch (e) {
    console.error("No se pudo guardar el carrito en el backend", e);
  }
}
```

Y en el checkout (`scripts/main.js`), al enviar el formulario, haz `POST` a `/api/order` y usa la `whatsappUrl` que devuelve para abrir WhatsApp con el pedido listo.

## Enlaces finales

- Sitio completo: `https://griegos.adonisblanco133.workers.dev`
- Tienda: `https://griegos.adonisblanco133.workers.dev/store/`
- API productos: `https://griegos.adonisblanco133.workers.dev/api/products`

## Subir cambios futuros

Cada vez que modifiques algo, desde la carpeta del proyecto ejecuta:

```bash
wrangler deploy
```

Y los cambios se reflejarán automáticamente en `griegos.adonisblanco133.workers.dev`.
