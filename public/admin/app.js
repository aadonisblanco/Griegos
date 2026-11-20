/* =========================================================
   GRIEGOS ADMIN — LÓGICA DE APLICACIÓN
   ========================================================= */

(() => {
  "use strict";

  /* -------------------- CONFIGURACIÓN -------------------- */
  const REPO_OWNER = "aadonisblanco";
  const REPO_NAME = "Griegos";
  const BRANCH = "main";

  // Rutas de los archivos en el repositorio
  const PATH_CONFIG = "public/data/config.json";
  const PATH_PRODUCTS = "public/data/products.json";

  // Contraseña de acceso al panel (cámbiala si lo deseas)
  const ADMIN_PASSWORD = "griegos2026";

  /* -------------------- ESTADO -------------------- */
  const state = {
    isAuthenticated: false,
    githubToken: null,
    config: {},
    products: [],
    editingProductId: null,
    isLoading: false
  };

  /* -------------------- ELEMENTOS DEL DOM -------------------- */
  const els = {
    loginScreen: document.getElementById("login-screen"),
    adminPanel: document.getElementById("admin-panel"),
    adminPassword: document.getElementById("admin-password"),
    githubToken: document.getElementById("github-token"),
    loginBtn: document.getElementById("login-btn"),
    loginError: document.getElementById("login-error"),
    logoutBtn: document.getElementById("logout-btn"),
    userLabel: document.getElementById("user-label"),

    navItems: document.querySelectorAll(".nav-item"),
    sections: {
      config: document.getElementById("section-config"),
      products: document.getElementById("section-products"),
      productForm: document.getElementById("section-product-form")
    },

    configForm: document.getElementById("config-form"),
    message: document.getElementById("admin-message"),

    productsTableBody: document.getElementById("products-table-body"),
    addProductBtn: document.getElementById("add-product-btn"),
    productsEmpty: document.getElementById("products-empty"),
    backToProducts: document.getElementById("back-to-products"),
    productFormTitle: document.getElementById("product-form-title"),
    productForm: document.getElementById("product-form"),
    deleteProductBtn: document.getElementById("delete-product-btn")
  };

  /* -------------------- UTILIDADES -------------------- */
  function showScreen(screenId) {
    document.querySelectorAll(".screen").forEach(s => s.style.display = "none");
    document.getElementById(screenId).style.display = "flex";
  }

  function setMessage(text, type = "success") {
    const m = els.message;
    m.textContent = text;
    m.className = `message ${type}`;
    m.style.display = "block";
    setTimeout(() => { m.style.display = "none"; }, 5000);
  }

  function setLoading(loading) {
    state.isLoading = loading;
    els.loginBtn.disabled = loading;
    // deshabilitar botones del panel si es necesario
  }

  function toBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  function fromBase64(b64) {
    return decodeURIComponent(escape(atob(b64)));
  }

  /* -------------------- GITHUB API -------------------- */
  async function githubGetFile(path) {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}?ref=${BRANCH}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `token ${state.githubToken}`,
        Accept: "application/vnd.github+json"
      }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Error al leer ${path} (${res.status})`);
    }
    const data = await res.json();
    return {
      content: fromBase64(data.content),
      sha: data.sha
    };
  }

  async function githubPutFile(path, newContent, sha, commitMessage) {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`;
    const body = {
      message: commitMessage,
      content: toBase64(newContent),
      sha: sha,
      branch: BRANCH
    };
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `token ${state.githubToken}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Error al escribir ${path} (${res.status})`);
    }
    return await res.json();
  }

  /* -------------------- CARGA Y GUARDADO -------------------- */
  async function loadConfig() {
    try {
      const { content } = await githubGetFile(PATH_CONFIG);
      state.config = JSON.parse(content);
      renderConfigForm();
    } catch (e) {
      setMessage(`Error al cargar configuración: ${e.message}`, "error");
    }
  }

  async function saveConfig() {
    const formData = new FormData(els.configForm);
    const raw = Object.fromEntries(formData.entries());

    // Normalizar tipos
    const config = {
      siteName: raw.siteName || "",
      whatsappPhone: raw.whatsappPhone || "",
      welcomeMessage: raw.welcomeMessage || "",
      currency: {
        code: raw.currencyCode || "USD",
        symbol: raw.currencySymbol || "$",
        locale: "en-US"
      },
      messages: {
        general: "Hola, GRIEGOS. Necesito información.",
        order: "Hola, GRIEGOS. Me interesa realizar un pedido."
      }
    };

    try {
      setLoading(true);
      const current = await githubGetFile(PATH_CONFIG);
      const newJson = JSON.stringify(config, null, 2) + "\n";
      await githubPutFile(PATH_CONFIG, newJson, current.sha, "chore(config): actualizar configuración desde panel admin");
      state.config = config;
      setMessage("Configuración guardada correctamente. La tienda se actualizará en minutos.");
      els.githubToken.disabled = true;
    } catch (e) {
      setMessage(`Error al guardar: ${e.message}`, "error");
    } finally {
      setLoading(false);
    }
  }

  async function loadProducts() {
    try {
      const { content } = await githubGetFile(PATH_PRODUCTS);
      state.products = JSON.parse(content);
      renderProductsTable();
    } catch (e) {
      setMessage(`Error al cargar productos: ${e.message}`, "error");
    }
  }

  async function saveProducts() {
    try {
      setLoading(true);
      const current = await githubGetFile(PATH_PRODUCTS);
      const newJson = JSON.stringify(state.products, null, 2) + "\n";
      await githubPutFile(PATH_PRODUCTS, newJson, current.sha, "chore(products): actualizar catálogo desde panel admin");
      setMessage("Productos guardados correctamente. La tienda se actualizará en minutos.");
      renderProductsTable();
    } catch (e) {
      setMessage(`Error al guardar productos: ${e.message}`, "error");
    } finally {
      setLoading(false);
    }
  }

  /* -------------------- RENDERIZADO -------------------- */
  function renderConfigForm() {
    const c = state.config;
    if (!c) return;

    const map = {
      siteName: c.siteName || "",
      whatsappPhone: c.whatsappPhone || "",
      welcomeMessage: c.welcomeMessage || "",
      currencyCode: c.currency?.code || "",
      currencySymbol: c.currency?.symbol || ""
    };

    Object.entries(map).forEach(([name, value]) => {
      const input = els.configForm.elements[name];
      if (input) input.value = value;
    });
  }

  function renderProductsTable() {
    const tbody = els.productsTableBody;
    const empty = els.productsEmpty;
    tbody.innerHTML = "";

    if (!state.products || state.products.length === 0) {
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";

    state.products.forEach(p => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td><code>${escapeHtml(p.id || "")}</code></td>
        <td>${escapeHtml(p.name || "")}</td>
        <td>${escapeHtml(p.category || "")}</td>
        <td>$${Number(p.price || 0).toFixed(2)}</td>
        <td>${p.stock !== undefined ? p.stock : "-"}</td>
        <td>${p.available !== false ? "Sí" : "No"}</td>
        <td>
          <button class="btn btn-outline btn-sm" data-action="edit" data-id="${escapeHtml(p.id || "")}">Editar</button>
        </td>
      `;

      const btn = tr.querySelector(`[data-id="${escapeHtml(p.id || "")}"]`);
      btn.addEventListener("click", () => openProductEditor(p.id));

      tbody.appendChild(tr);
    });
  }

  function openProductEditor(id) {
    const product = state.products.find(p => p.id === id) || null;
    state.editingProductId = id;

    els.sections.config.style.display = "none";
    els.sections.products.style.display = "none";
    els.sections.productForm.style.display = "block";

    els.productFormTitle.textContent = product ? "Editar producto" : "Nuevo producto";
    els.deleteProductBtn.style.display = product ? "inline-block" : "none";
    els.deleteProductBtn.dataset.id = id;

    if (product) {
      els.productForm.elements["id"].value = product.id || "";
      els.productForm.elements["_originalId"].value = product.id || "";
      els.productForm.elements["name"].value = product.name || "";
      els.productForm.elements["category"].value = product.category || "";
      els.productForm.elements["categoryLabel"].value = product.categoryLabel || "";
      els.productForm.elements["subcategory"].value = product.subcategory || "";
      els.productForm.elements["subcategoryLabel"].value = product.subcategoryLabel || "";
      els.productForm.elements["price"].value = product.price !== undefined ? product.price : "";
      els.productForm.elements["image"].value = product.image || "";
      els.productForm.elements["description"].value = product.description || "";
      els.productForm.elements["stock"].value = product.stock !== undefined ? product.stock : "";
      els.productForm.elements["brand"].value = product.brand || "";
      els.productForm.elements["available"].checked = product.available !== false;
      els.productForm.elements["featured"].checked = product.featured === true;
    } else {
      els.productForm.reset();
      els.productForm.elements["id"].value = "";
      els.productForm.elements["_originalId"].value = "";
      els.productForm.elements["available"].checked = true;
      els.productForm.elements["featured"].checked = false;
    }
  }

  function closeProductEditor() {
    state.editingProductId = null;
    els.sections.productForm.style.display = "none";
    els.sections.config.style.display = "block";
    els.sections.products.style.display = "block";
    renderProductsTable();
  }

  /* -------------------- EVENTOS -------------------- */
  function initEvents() {
    // Login
    els.loginBtn.addEventListener("click", () => {
      const password = els.adminPassword.value.trim();
      const token = els.githubToken.value.trim();

      if (!password) {
        els.loginError.textContent = "Ingresa la contraseña de administrador.";
        els.loginError.style.display = "block";
        return;
      }
      if (password !== ADMIN_PASSWORD) {
        els.loginError.textContent = "Contraseña incorrecta.";
        els.loginError.style.display = "block";
        return;
      }
      if (!token) {
        els.loginError.textContent = "Ingresa tu Personal Access Token de GitHub.";
        els.loginError.style.display = "block";
        return;
      }

      state.githubToken = token;
      state.isAuthenticated = true;
      els.loginError.style.display = "none";
      els.userLabel.textContent = "Administrador";
      showScreen("admin-panel");
      loadConfig();
      loadProducts();
    });

    // Logout
    els.logoutBtn.addEventListener("click", () => {
      state.isAuthenticated = false;
      state.githubToken = null;
      els.adminPassword.value = "";
      els.githubToken.value = "";
      showScreen("login-screen");
    });

    // Navegación
    els.navItems.forEach(item => {
      item.addEventListener("click", () => {
        els.navItems.forEach(i => i.classList.remove("active"));
        item.classList.add("active");

        const section = item.dataset.section;
        Object.entries(els.sections).forEach(([key, el]) => {
          el.style.display = key === section ? "block" : "none";
        });

        if (section === "products") renderProductsTable();
        if (section === "config") loadConfig();
      });
    });

    // Guardar configuración
    els.configForm.addEventListener("submit", (e) => {
      e.preventDefault();
      saveConfig();
    });

    // Agregar producto
    els.addProductBtn.addEventListener("click", () => openProductEditor(null));

    // Volver al catálogo
    els.backToProducts.addEventListener("click", closeProductEditor);

    // Guardar producto
    els.productForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const formData = new FormData(els.productForm);
      const raw = Object.fromEntries(formData.entries());

      const product = {
        id: raw.id.trim(),
        name: raw.name.trim(),
        category: raw.category.trim(),
        categoryLabel: raw.categoryLabel.trim(),
        subcategory: raw.subcategory.trim(),
        subcategoryLabel: raw.subcategoryLabel.trim(),
        price: raw.price ? Number(raw.price) : null,
        image: raw.image.trim(),
        description: raw.description.trim(),
        stock: raw.stock ? Number(raw.stock) : 0,
        brand: raw.brand.trim(),
        available: raw.available === "on",
        featured: raw.featured === "on"
      };

      // Validar campos requeridos
      if (!product.id || !product.name || product.price === null) {
        setMessage("ID, nombre y precio son obligatorios.", "error");
        return;
      }

      // Si es nuevo, agregar; si existe, actualizar
      if (state.editingProductId && state.editingProductId !== product.id) {
        // Cambiar ID: buscar y reemplazar
        const idx = state.products.findIndex(p => p.id === state.editingProductId);
        if (idx >= 0) {
          state.products[idx] = product;
        }
      } else if (state.editingProductId) {
        const idx = state.products.findIndex(p => p.id === state.editingProductId);
        if (idx >= 0) {
          state.products[idx] = product;
        }
      } else {
        // Nuevo producto: verificar ID duplicado
        if (state.products.find(p => p.id === product.id)) {
          setMessage("Ya existe un producto con ese ID.", "error");
          return;
        }
        state.products.push(product);
      }

      saveProducts();
      closeProductEditor();
    });

    // Eliminar producto
    els.deleteProductBtn.addEventListener("click", () => {
      if (!confirm("¿Estás seguro de eliminar este producto?")) return;
      state.products = state.products.filter(p => p.id !== state.editingProductId);
      saveProducts();
      closeProductEditor();
    });
  }

  /* -------------------- ESCAPE HTML -------------------- */
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  /* -------------------- INICIALIZAR -------------------- */
  function init() {
    // Mostrar login por defecto
    showScreen("login-screen");
    initEvents();
  }

  init();

})();
