import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createAdminBook,
  createAdminCategory,
  deleteAdminBook,
  deleteAdminCategory,
  getAdminBooks,
  getAdminInventory,
  getAdminOrders,
  getAdminOverviewWithFilters,
  getAdminSiteContent,
  getCategories,
  loginAdmin,
  exportAdminOrdersCsv,
  updateAdminBook,
  updateAdminOrderStatus,
  updateAdminSiteContent,
} from "../services/api";
import usePageMeta from "../hooks/usePageMeta";

const ADMIN_TOKEN_KEY = "bookshop-admin-token";
const ADMIN_USER_KEY = "bookshop-admin-user";

const ORDER_STATUS_OPTIONS = [
  { value: "pending", label: "Pendiente" },
  { value: "confirmed", label: "Confirmada" },
  { value: "processing", label: "Preparando" },
  { value: "shipped", label: "Enviada" },
  { value: "delivered", label: "Entregada" },
  { value: "cancelled", label: "Cancelada" },
];

const EMPTY_BOOK_FORM = {
  titulo: "",
  autor: "",
  precio: "",
  precio_oferta: "",
  descripcion: "",
  imagen: "",
  stock: "",
  category_id: "",
  oferta: false,
  destacado: false,
  novedad: false,
  preventa: false,
  recomendado: false,
};

const SITE_SECTION_OPTIONS = [
  { key: "hero", label: "Hero principal" },
  { key: "banner_primary", label: "Banner principal" },
  { key: "banner_secondary", label: "Banner secundario" },
  { key: "about", label: "Nosotros" },
  { key: "faq", label: "Preguntas frecuentes" },
  { key: "policies", label: "Politicas" },
  { key: "shipping", label: "Envios" },
  { key: "contact", label: "Contacto" },
];

function formatCurrency(value) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("es-DO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function normalizeBookForm(book) {
  if (!book) {
    return EMPTY_BOOK_FORM;
  }

  return {
    titulo: book.titulo || "",
    autor: book.autor || "",
    precio: book.precio ?? "",
    precio_oferta: book.precio_oferta ?? "",
    descripcion: book.descripcion || "",
    imagen: book.imagen || "",
    stock: book.stock ?? "",
    category_id: book.category_id ?? "",
    oferta: Boolean(book.oferta),
    destacado: Boolean(book.destacado),
    novedad: Boolean(book.novedad),
    preventa: Boolean(book.preventa),
    recomendado: Boolean(book.recomendado),
  };
}

function Admin({ onBack }) {
  const [token, setToken] = useState(() => localStorage.getItem(ADMIN_TOKEN_KEY) || "");
  const [adminUser, setAdminUser] = useState(() => {
    const storedUser = localStorage.getItem(ADMIN_USER_KEY);
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [activeTab, setActiveTab] = useState("dashboard");
  const [dashboard, setDashboard] = useState(null);
  const [books, setBooks] = useState([]);
  const [inventory, setInventory] = useState({ summary: null, items: [] });
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [siteSections, setSiteSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [orderFilters, setOrderFilters] = useState({ status: "", search: "", start_date: "", end_date: "" });
  const [dashboardFilters, setDashboardFilters] = useState({ start_date: "", end_date: "" });
  const [bookForm, setBookForm] = useState(EMPTY_BOOK_FORM);
  const [editingBookId, setEditingBookId] = useState(null);
  const [categoryName, setCategoryName] = useState("");
  const [selectedSectionKey, setSelectedSectionKey] = useState("hero");
  const [sectionForm, setSectionForm] = useState({
    title: "",
    subtitle: "",
    body: "",
    image_url: "",
    cta_text: "",
    cta_link: "",
    items_text: "",
    is_active: true,
  });
  const latestOrderIdRef = useRef(null);
  const latestNotificationAtRef = useRef(0);

  usePageMeta({
    title: "Admin",
    description: "Dashboard administrativo para controlar ventas, inventario, contenido y ordenes de la libreria.",
  });

  const stats = dashboard?.stats || {};
  const topBooks = dashboard?.top_books || [];
  const recentOrders = dashboard?.recent_orders || [];
  const lowStockAlerts = dashboard?.alerts?.low_stock || [];
  const monthlySales = dashboard?.monthly_sales || [];
  const statusBreakdown = dashboard?.status_breakdown || {};
  const selectedSection = useMemo(
    () => siteSections.find((section) => section.key === selectedSectionKey) || null,
    [siteSections, selectedSectionKey],
  );

  const inventoryHighlights = useMemo(() => {
    const items = inventory.items || [];
    return {
      outOfStock: items.filter((item) => item.stock <= 0),
      lowStock: items.filter((item) => item.stock > 0 && item.stock <= 3),
    };
  }, [inventory.items]);

  const storeCategories = useMemo(
    () => categories.filter((category) => category?.id && category?.nombre),
    [categories],
  );

  const loadAdminData = useCallback(async (currentToken, filters = orderFilters, overviewFilters = dashboardFilters) => {
    if (!currentToken) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [
        overviewResponse,
        booksResponse,
        inventoryResponse,
        ordersResponse,
        categoriesResponse,
        siteContentResponse,
      ] =
        await Promise.all([
          getAdminOverviewWithFilters(currentToken, overviewFilters),
          getAdminBooks(currentToken),
          getAdminInventory(currentToken),
          getAdminOrders(currentToken, filters),
          getCategories(),
          getAdminSiteContent(currentToken),
        ]);

      setDashboard(overviewResponse.data);
      setBooks(booksResponse.data || []);
      setInventory(inventoryResponse.data || { summary: null, items: [] });
      setOrders(ordersResponse.data || []);
      setCategories(categoriesResponse.data || []);
      setSiteSections(siteContentResponse.data || []);
    } catch (loadError) {
      if ((loadError.message || "").toLowerCase().includes("token")) {
        handleLogout();
      }
      setError(loadError.message || "No se pudo cargar el panel admin");
    } finally {
      setLoading(false);
    }
  }, [dashboardFilters, orderFilters]);

  useEffect(() => {
    loadAdminData(token);
  }, [loadAdminData, token]);

  useEffect(() => {
    if (!selectedSection) {
      return;
    }

    setSectionForm({
      title: selectedSection.title || "",
      subtitle: selectedSection.subtitle || "",
      body: selectedSection.body || "",
      image_url: selectedSection.image_url || "",
      cta_text: selectedSection.cta_text || "",
      cta_link: selectedSection.cta_link || "",
      items_text: Array.isArray(selectedSection.items)
        ? selectedSection.items
            .map((item) => (typeof item === "string" ? item : `${item.title || ""}: ${item.body || ""}`))
            .join("\n")
        : "",
      is_active: Boolean(selectedSection.is_active),
    });
  }, [selectedSection]);

  useEffect(() => {
    if (!orders.length) {
      return;
    }

    const maxId = Math.max(...orders.map((order) => order.id));
    if (latestOrderIdRef.current === null) {
      latestOrderIdRef.current = maxId;
    } else if (maxId > latestOrderIdRef.current) {
      latestOrderIdRef.current = maxId;
    }
  }, [orders]);

  useEffect(() => {
    if (!error && !success) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setError("");
      setSuccess("");
    }, 60000);

    return () => window.clearTimeout(timeoutId);
  }, [error, success]);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    const intervalId = window.setInterval(async () => {
      try {
        const response = await getAdminOrders(token, {});
        const latestOrders = response.data || [];
        if (!latestOrders.length) {
          return;
        }

        const highestId = Math.max(...latestOrders.map((order) => order.id));
        if (latestOrderIdRef.current === null) {
          latestOrderIdRef.current = highestId;
          return;
        }

        if (highestId > latestOrderIdRef.current) {
          latestOrderIdRef.current = highestId;
          const newestOrder = latestOrders[0];
          const message = `Nueva orden ${newestOrder.order_number} de ${newestOrder.customer_name}.`;
          if (Date.now() - latestNotificationAtRef.current > 5000) {
            latestNotificationAtRef.current = Date.now();
            setSuccess(message);
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("BookShop Admin", {
                body: message,
              });
            }
          }
          await loadAdminData(token, orderFilters, dashboardFilters);
        }
      } catch {
        return;
      }
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [dashboardFilters, loadAdminData, orderFilters, token]);

  function handleLogout() {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
    setToken("");
    setAdminUser(null);
    setDashboard(null);
    setBooks([]);
    setInventory({ summary: null, items: [] });
    setOrders([]);
    setCategories([]);
    setEditingBookId(null);
    setBookForm(EMPTY_BOOK_FORM);
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await loginAdmin(loginForm);
      localStorage.setItem(ADMIN_TOKEN_KEY, response.data.token);
      localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(response.data.user));
      setToken(response.data.token);
      setAdminUser(response.data.user);
      setSuccess("Sesion iniciada correctamente.");
      setLoginForm({ username: "", password: "" });
    } catch (loginError) {
      setError(loginError.message || "No se pudo iniciar sesion");
    } finally {
      setLoading(false);
    }
  }

  async function handleOrderFilterSubmit(event) {
    event.preventDefault();
    await loadAdminData(token, orderFilters);
  }

  async function handleDashboardFilterSubmit(event) {
    event.preventDefault();
    await loadAdminData(token, orderFilters, dashboardFilters);
  }

  async function handleStatusChange(orderId, nextStatus) {
    setError("");
    setSuccess("");

    try {
      await updateAdminOrderStatus(token, orderId, nextStatus);
      setSuccess("Estado de la orden actualizado.");
      await loadAdminData(token, orderFilters);
    } catch (statusError) {
      setError(statusError.message || "No se pudo actualizar la orden");
    }
  }

  async function handleExportOrdersCsv() {
    try {
      const blob = await exportAdminOrdersCsv(token, orderFilters);
      const fileUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = "ordenes-bookshop.csv";
      link.click();
      URL.revokeObjectURL(fileUrl);
      setSuccess("Reporte de ordenes exportado para Excel.");
    } catch (exportError) {
      setError(exportError.message || "No se pudo exportar el reporte");
    }
  }

  function handlePrintOrdersPdf() {
    const reportWindow = window.open("", "_blank", "noopener,noreferrer,width=1100,height=800");
    if (!reportWindow) {
      setError("Tu navegador bloqueo la ventana de impresion.");
      return;
    }

    const rows = orders
      .map(
        (order) => `
          <tr>
            <td>${order.order_number}</td>
            <td>${order.customer_name}</td>
            <td>${formatDate(order.date)}</td>
            <td>${ORDER_STATUS_OPTIONS.find((item) => item.value === order.status)?.label || order.status}</td>
            <td>RD$ ${Number(order.total || 0).toFixed(2)}</td>
          </tr>`,
      )
      .join("");

    reportWindow.document.write(`
      <html>
        <head>
          <title>Reporte de ordenes | BookShop</title>
          <style>
            body { font-family: Arial, sans-serif; color: #1a1a1a; padding: 32px; }
            h1 { font-family: Georgia, serif; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border-bottom: 1px solid #ddd; padding: 12px; text-align: left; }
            th { color: #6b6b6b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; }
          </style>
        </head>
        <body>
          <h1>Reporte de ordenes BookShop</h1>
          <p>Generado el ${new Date().toLocaleString("es-DO")}</p>
          <table>
            <thead>
              <tr><th>Orden</th><th>Cliente</th><th>Fecha</th><th>Estado</th><th>Total</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
  }

  async function handleBookSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const payload = {
      ...bookForm,
      precio: Number(bookForm.precio),
      stock: Number(bookForm.stock),
      precio_oferta: bookForm.precio_oferta === "" ? null : Number(bookForm.precio_oferta),
      category_id: bookForm.category_id === "" ? null : Number(bookForm.category_id),
    };

    try {
      if (editingBookId) {
        const response = await updateAdminBook(token, editingBookId, payload);
        setSuccess(response.message || "Libro actualizado correctamente.");
      } else {
        const response = await createAdminBook(token, payload);
        setSuccess(response.message || "Libro creado correctamente.");
      }

      setEditingBookId(null);
      setBookForm(EMPTY_BOOK_FORM);
      await loadAdminData(token, orderFilters);
    } catch (bookError) {
      setError(bookError.message || "No se pudo guardar el libro");
    }
  }

  async function handleDeleteBook(bookId) {
    setError("");
    setSuccess("");

    try {
      const response = await deleteAdminBook(token, bookId);
      if (editingBookId === bookId) {
        setEditingBookId(null);
        setBookForm(EMPTY_BOOK_FORM);
      }
      setSuccess(
        response.message === "Book archived from catalog"
          ? "El libro tenia historial de ordenes y fue archivado para salir de la tienda sin perder ventas."
          : "Libro eliminado correctamente.",
      );
      await loadAdminData(token, orderFilters);
    } catch (bookError) {
      setError(bookError.message || "No se pudo eliminar el libro");
    }
  }

  async function handleCreateCategory(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      const response = await createAdminCategory(token, { nombre: categoryName });
      setCategoryName("");
      setSuccess(response.message || "Categoria creada correctamente.");
      await loadAdminData(token, orderFilters);
    } catch (categoryError) {
      setError(categoryError.message || "No se pudo crear la categoria");
    }
  }

  async function handleSaveSection(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const items = sectionForm.items_text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [title, ...rest] = line.split(":");
        if (rest.length === 0) {
          return line;
        }
        return {
          title: title.trim(),
          body: rest.join(":").trim(),
        };
      });

    try {
      const response = await updateAdminSiteContent(token, selectedSectionKey, {
        title: sectionForm.title,
        subtitle: sectionForm.subtitle,
        body: sectionForm.body,
        image_url: sectionForm.image_url,
        cta_text: sectionForm.cta_text,
        cta_link: sectionForm.cta_link,
        items,
        is_active: sectionForm.is_active,
      });
      setSuccess(response.message || "Seccion guardada correctamente.");
      await loadAdminData(token, orderFilters, dashboardFilters);
    } catch (sectionError) {
      setError(sectionError.message || "No se pudo guardar la seccion");
    }
  }

  async function handleDeleteCategory(categoryId) {
    setError("");
    setSuccess("");

    try {
      const response = await deleteAdminCategory(token, categoryId);
      setSuccess(response.message || "Categoria eliminada correctamente.");
      await loadAdminData(token, orderFilters);
    } catch (categoryError) {
      setError(categoryError.message || "No se pudo eliminar la categoria");
    }
  }

  if (!token) {
    return (
      <main className="page-shell">
        <section className="container admin-auth-shell">
          <div className="admin-auth-panel">
            <div className="cart-page-header">
              <div>
                <p className="section-label">Administracion</p>
                <h1>Panel de administracion</h1>
                <p className="hero-copy">
                  Controla ventas, inventario, estados de ordenes y crecimiento mensual de la
                  libreria fisica en pesos dominicanos desde un solo lugar.
                </p>
              </div>
              <button type="button" className="nav-link" onClick={onBack}>
                Volver al catalogo
              </button>
            </div>

            <form className="admin-login-form" onSubmit={handleLoginSubmit}>
              <label className="checkout-field">
                <span>Usuario admin</span>
                <input
                  type="text"
                  value={loginForm.username}
                  onChange={(event) =>
                    setLoginForm((currentValue) => ({
                      ...currentValue,
                      username: event.target.value,
                    }))
                  }
                  placeholder="admin"
                  required
                />
              </label>

              <label className="checkout-field">
                <span>Contrasena</span>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(event) =>
                    setLoginForm((currentValue) => ({
                      ...currentValue,
                      password: event.target.value,
                    }))
                  }
                  placeholder="Password"
                  required
                />
              </label>

              <button type="submit" className="checkout-submit" disabled={loading}>
                {loading ? "Entrando..." : "Entrar al dashboard"}
              </button>
            </form>

            {error ? <p className="status-box error-box">{error}</p> : null}
            {success ? <p className="status-box success-box">{success}</p> : null}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="container admin-shell">
        <div className="admin-topbar">
          <div>
            <p className="section-label">Administracion</p>
            <h1>Centro de control de la libreria</h1>
            <p className="hero-copy">
              Bienvenido, {adminUser?.username || "admin"}. Supervisa ventas, ordenes,
              inventario, graficas y catalogo fisico con una vista clara, moderna y organizada.
            </p>
          </div>

          <div className="admin-topbar-actions">
            <button type="button" className="secondary-button" onClick={() => loadAdminData(token, orderFilters)}>
              Actualizar
            </button>
            <button type="button" className="secondary-button" onClick={onBack}>
              Ver tienda
            </button>
            <button type="button" className="checkout-submit admin-logout-button" onClick={handleLogout}>
              Cerrar sesion
            </button>
          </div>
        </div>

        <div className="admin-tabs">
          {[
            { id: "dashboard", label: "Dashboard" },
            { id: "orders", label: "Ordenes" },
            { id: "inventory", label: "Inventario" },
            { id: "books", label: "Libros" },
            { id: "categories", label: "Categorias" },
            { id: "content", label: "Contenido" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`admin-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error ? <p className="status-box error-box">{error}</p> : null}
        {success ? <p className="status-box success-box">{success}</p> : null}
        {loading ? <p className="status-box">Actualizando panel...</p> : null}

        {activeTab === "dashboard" ? (
          <section className="admin-grid">
            <form className="admin-panel-card admin-filter-card" onSubmit={handleDashboardFilterSubmit}>
              <div className="admin-section-heading">
                <div>
                  <p className="section-label">Filtros</p>
                  <h2>Comparar periodo</h2>
                </div>
              </div>
              <div className="admin-order-filters">
                <label className="checkout-field">
                  <span>Desde</span>
                  <input
                    type="date"
                    value={dashboardFilters.start_date}
                    onChange={(event) =>
                      setDashboardFilters((currentValue) => ({
                        ...currentValue,
                        start_date: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="checkout-field">
                  <span>Hasta</span>
                  <input
                    type="date"
                    value={dashboardFilters.end_date}
                    onChange={(event) =>
                      setDashboardFilters((currentValue) => ({
                        ...currentValue,
                        end_date: event.target.value,
                      }))
                    }
                  />
                </label>
                <button type="submit" className="secondary-button">
                  Aplicar fechas
                </button>
              </div>
            </form>

            <div className="admin-stats-grid">
              <article className="admin-stat-card">
                <span>Ventas acumuladas</span>
                <strong>{formatCurrency(stats.total_revenue)}</strong>
                <small>
                  Mes actual: {formatCurrency(stats.current_month_revenue)} | Variacion:{" "}
                  {formatCurrency(stats.revenue_delta)}
                </small>
              </article>
              <article className="admin-stat-card">
                <span>Ordenes</span>
                <strong>{stats.orders_count || 0}</strong>
                <small>
                  Pendientes: {stats.pending_orders || 0} | Entregadas: {stats.delivered_orders || 0}
                </small>
              </article>
              <article className="admin-stat-card">
                <span>Inventario</span>
                <strong>{stats.books_count || 0} libros</strong>
                <small>
                  Bajo stock: {stats.low_stock_count || 0} | Sin stock: {stats.out_of_stock_count || 0}
                </small>
              </article>
              <article className="admin-stat-card">
                <span>Valor en tienda</span>
                <strong>{formatCurrency(stats.inventory_value)}</strong>
                <small>
                  Categorias activas: {stats.categories_count || 0} | Ordenes del mes:{" "}
                  {stats.current_month_orders || 0}
                </small>
              </article>
            </div>

            <div className="admin-panel-card admin-chart-card">
              <div className="admin-section-heading">
                <div>
                  <p className="section-label">Comparacion mensual</p>
                  <h2>Ventas por mes</h2>
                </div>
              </div>

              <div className="admin-chart-bars">
                {monthlySales.map((month) => {
                  const maxRevenue = Math.max(...monthlySales.map((item) => item.revenue || 0), 1);
                  const height = `${Math.max(((month.revenue || 0) / maxRevenue) * 100, 8)}%`;
                  return (
                    <div key={month.label} className="admin-chart-column">
                      <div className="admin-chart-track">
                        <div className="admin-chart-bar" style={{ height }} />
                      </div>
                      <strong>{formatCurrency(month.revenue)}</strong>
                      <span>{month.label}</span>
                      <small>{month.orders} ordenes</small>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="admin-panel-card">
              <div className="admin-section-heading">
                <div>
                  <p className="section-label">Estados</p>
                  <h2>Embudo de ordenes</h2>
                </div>
              </div>
              <div className="admin-status-grid">
                {ORDER_STATUS_OPTIONS.map((statusOption) => (
                  <article key={statusOption.value} className="admin-status-card">
                    <span>{statusOption.label}</span>
                    <strong>{statusBreakdown[statusOption.value] || 0}</strong>
                  </article>
                ))}
              </div>
            </div>

            <div className="admin-panel-card">
              <div className="admin-section-heading">
                <div>
                  <p className="section-label">Mas vendidos</p>
                  <h2>Top libros</h2>
                </div>
              </div>
              <div className="admin-list">
                {topBooks.map((book) => (
                  <div key={book.id} className="admin-list-item">
                    <div>
                      <strong>{book.titulo}</strong>
                      <span>{book.autor}</span>
                    </div>
                    <small>{book.sold_units} vendidos</small>
                  </div>
                ))}
              </div>
            </div>

            <div className="admin-panel-card">
              <div className="admin-section-heading">
                <div>
                  <p className="section-label">Alertas</p>
                  <h2>Inventario critico</h2>
                </div>
              </div>
              <div className="admin-list">
                {lowStockAlerts.length === 0 ? (
                  <p className="admin-empty">No hay alertas de stock por ahora.</p>
                ) : (
                  lowStockAlerts.map((book) => (
                    <div key={book.id} className="admin-list-item">
                      <div>
                        <strong>{book.titulo}</strong>
                        <span>{book.category_name}</span>
                      </div>
                      <small>{book.stock} unidades</small>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="admin-panel-card admin-panel-span">
              <div className="admin-section-heading">
                <div>
                  <p className="section-label">Actividad reciente</p>
                  <h2>Ultimas ordenes</h2>
                </div>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Orden</th>
                      <th>Cliente</th>
                      <th>Telefono</th>
                      <th>Fecha</th>
                      <th>Estado</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order.id}>
                        <td>{order.order_number}</td>
                        <td>{order.customer_name}</td>
                        <td>{order.customer_phone || "--"}</td>
                        <td>{formatDate(order.date)}</td>
                        <td>{ORDER_STATUS_OPTIONS.find((item) => item.value === order.status)?.label || order.status}</td>
                        <td>{formatCurrency(order.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "orders" ? (
          <section className="admin-grid">
            <div className="admin-panel-card admin-panel-span">
              <div className="admin-section-heading">
                <div>
                  <p className="section-label">Ordenes</p>
                  <h2>Gestion de estados y seguimiento</h2>
                </div>
              </div>

              <form className="admin-order-filters" onSubmit={handleOrderFilterSubmit}>
                <label className="checkout-field">
                  <span>Buscar cliente u orden</span>
                  <input
                    type="text"
                    value={orderFilters.search}
                    onChange={(event) =>
                      setOrderFilters((currentValue) => ({
                        ...currentValue,
                        search: event.target.value,
                      }))
                    }
                    placeholder="Ej. BS-20260430 o nombre"
                  />
                </label>

                <label className="checkout-field">
                  <span>Estado</span>
                  <select
                    value={orderFilters.status}
                    onChange={(event) =>
                      setOrderFilters((currentValue) => ({
                        ...currentValue,
                        status: event.target.value,
                      }))
                    }
                  >
                    <option value="">Todos</option>
                    {ORDER_STATUS_OPTIONS.map((statusOption) => (
                      <option key={statusOption.value} value={statusOption.value}>
                        {statusOption.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="checkout-field">
                  <span>Desde</span>
                  <input
                    type="date"
                    value={orderFilters.start_date}
                    onChange={(event) =>
                      setOrderFilters((currentValue) => ({
                        ...currentValue,
                        start_date: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="checkout-field">
                  <span>Hasta</span>
                  <input
                    type="date"
                    value={orderFilters.end_date}
                    onChange={(event) =>
                      setOrderFilters((currentValue) => ({
                        ...currentValue,
                        end_date: event.target.value,
                      }))
                    }
                  />
                </label>

                <button type="submit" className="secondary-button">
                  Filtrar ordenes
                </button>
                <button type="button" className="secondary-button" onClick={handleExportOrdersCsv}>
                  Exportar Excel
                </button>
                <button type="button" className="secondary-button" onClick={handlePrintOrdersPdf}>
                  Exportar PDF
                </button>
              </form>

              <div className="admin-orders-stack">
                {orders.map((order) => (
                  <article key={order.id} className="admin-order-card">
                    <div className="admin-order-head">
                      <div>
                        <strong>{order.order_number}</strong>
                        <span>
                          {order.customer_name} | {order.customer_email}
                        </span>
                        <span>{order.customer_phone || "Sin telefono"}</span>
                      </div>
                      <div className="admin-order-meta">
                        <small>{formatDate(order.date)}</small>
                        <strong>{formatCurrency(order.total)}</strong>
                      </div>
                    </div>

                    <p className="admin-order-address">{order.customer_address}</p>

                    <div className="admin-order-items">
                      {order.items.map((item) => (
                        <div key={item.id} className="admin-order-item">
                          <span>
                            {item.titulo} x{item.quantity}
                          </span>
                          <strong>{formatCurrency(item.line_total)}</strong>
                        </div>
                      ))}
                    </div>

                    <div className="admin-order-actions">
                      <label className="checkout-field compact-field">
                        <span>Estado</span>
                        <select
                          value={order.status}
                          onChange={(event) => handleStatusChange(order.id, event.target.value)}
                        >
                          {ORDER_STATUS_OPTIONS.map((statusOption) => (
                            <option key={statusOption.value} value={statusOption.value}>
                              {statusOption.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "inventory" ? (
          <section className="admin-grid">
            <div className="admin-stats-grid">
              <article className="admin-stat-card">
                <span>Unidades totales</span>
                <strong>{inventory.summary?.total_units || 0}</strong>
              </article>
              <article className="admin-stat-card">
                <span>Valor estimado</span>
                <strong>{formatCurrency(inventory.summary?.inventory_value)}</strong>
              </article>
              <article className="admin-stat-card">
                <span>Stock bajo</span>
                <strong>{inventory.summary?.low_stock_count || 0}</strong>
              </article>
              <article className="admin-stat-card">
                <span>Sin stock</span>
                <strong>{inventory.summary?.out_of_stock_count || 0}</strong>
              </article>
            </div>

            <div className="admin-panel-card">
              <div className="admin-section-heading">
                <div>
                  <p className="section-label">Atencion inmediata</p>
                  <h2>Libros con riesgo</h2>
                </div>
              </div>
              <div className="admin-list">
                {inventoryHighlights.lowStock.map((book) => (
                  <div key={book.id} className="admin-list-item">
                    <div>
                      <strong>{book.titulo}</strong>
                      <span>{book.category_name}</span>
                    </div>
                    <small>{book.stock} unidades</small>
                  </div>
                ))}
              </div>
            </div>

            <div className="admin-panel-card admin-panel-span">
              <div className="admin-section-heading">
                <div>
                  <p className="section-label">Inventario completo</p>
                  <h2>Catalogo fisico y valor por titulo</h2>
                </div>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Libro</th>
                      <th>Categoria</th>
                      <th>Stock</th>
                      <th>Vendidos</th>
                      <th>Valor</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.items.map((book) => (
                      <tr key={book.id}>
                        <td>{book.titulo}</td>
                        <td>{book.category_name}</td>
                        <td>{book.stock}</td>
                        <td>{book.sold_units}</td>
                        <td>{formatCurrency(book.inventory_value)}</td>
                        <td>{book.status_label}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "books" ? (
          <section className="admin-grid">
            <div className="admin-panel-card">
              <div className="admin-section-heading">
                <div>
                  <p className="section-label">{editingBookId ? "Editar libro" : "Nuevo libro"}</p>
                  <h2>{editingBookId ? "Actualizar ficha del libro" : "Agregar libro al catalogo"}</h2>
                  <p className="admin-section-copy">
                    Usa las categorias reales que ya existen en la tienda para mantener el catalogo limpio.
                  </p>
                </div>
              </div>

              <form className="admin-book-form" onSubmit={handleBookSubmit}>
                <label className="checkout-field">
                  <span>Titulo</span>
                  <input
                    type="text"
                    value={bookForm.titulo}
                    onChange={(event) => setBookForm((currentValue) => ({ ...currentValue, titulo: event.target.value }))}
                    required
                  />
                </label>
                <label className="checkout-field">
                  <span>Autor</span>
                  <input
                    type="text"
                    value={bookForm.autor}
                    onChange={(event) => setBookForm((currentValue) => ({ ...currentValue, autor: event.target.value }))}
                    required
                  />
                </label>
                <label className="checkout-field">
                  <span>Precio</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={bookForm.precio}
                    onChange={(event) => setBookForm((currentValue) => ({ ...currentValue, precio: event.target.value }))}
                    required
                  />
                </label>
                <label className="checkout-field">
                  <span>Precio oferta</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={bookForm.precio_oferta}
                    onChange={(event) =>
                      setBookForm((currentValue) => ({
                        ...currentValue,
                        precio_oferta: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="checkout-field">
                  <span>Stock</span>
                  <input
                    type="number"
                    min="0"
                    value={bookForm.stock}
                    onChange={(event) => setBookForm((currentValue) => ({ ...currentValue, stock: event.target.value }))}
                    required
                  />
                </label>
                <label className="checkout-field">
                  <span>Categoria</span>
                  <select
                    value={bookForm.category_id}
                    onChange={(event) =>
                      setBookForm((currentValue) => ({
                        ...currentValue,
                        category_id: event.target.value,
                      }))
                    }
                  >
                    <option value="">Sin categoria</option>
                    {storeCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.nombre}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="checkout-field admin-textarea-field">
                  <span>Descripcion corta</span>
                  <textarea
                    rows="4"
                    value={bookForm.descripcion}
                    onChange={(event) =>
                      setBookForm((currentValue) => ({
                        ...currentValue,
                        descripcion: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label className="checkout-field admin-textarea-field">
                  <span>Imagen</span>
                  <input
                    type="url"
                    value={bookForm.imagen}
                    onChange={(event) => setBookForm((currentValue) => ({ ...currentValue, imagen: event.target.value }))}
                    placeholder="https://..."
                  />
                </label>
                <label className="admin-checkbox">
                  <input
                    type="checkbox"
                    checked={bookForm.oferta}
                    onChange={(event) => setBookForm((currentValue) => ({ ...currentValue, oferta: event.target.checked }))}
                  />
                  <span>Marcar como oferta</span>
                </label>
                <label className="admin-checkbox">
                  <input
                    type="checkbox"
                    checked={bookForm.destacado}
                    onChange={(event) => setBookForm((currentValue) => ({ ...currentValue, destacado: event.target.checked }))}
                  />
                  <span>Destacado</span>
                </label>
                <label className="admin-checkbox">
                  <input
                    type="checkbox"
                    checked={bookForm.novedad}
                    onChange={(event) => setBookForm((currentValue) => ({ ...currentValue, novedad: event.target.checked }))}
                  />
                  <span>Novedad</span>
                </label>
                <label className="admin-checkbox">
                  <input
                    type="checkbox"
                    checked={bookForm.preventa}
                    onChange={(event) => setBookForm((currentValue) => ({ ...currentValue, preventa: event.target.checked }))}
                  />
                  <span>Preventa</span>
                </label>
                <label className="admin-checkbox">
                  <input
                    type="checkbox"
                    checked={bookForm.recomendado}
                    onChange={(event) => setBookForm((currentValue) => ({ ...currentValue, recomendado: event.target.checked }))}
                  />
                  <span>Recomendado</span>
                </label>

                <div className="admin-form-actions">
                  <button type="submit" className="checkout-submit">
                    {editingBookId ? "Guardar cambios" : "Crear libro"}
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      setEditingBookId(null);
                      setBookForm(EMPTY_BOOK_FORM);
                    }}
                  >
                    Limpiar
                  </button>
                </div>
              </form>
            </div>

            <div className="admin-panel-card admin-panel-span">
              <div className="admin-section-heading">
                <div>
                  <p className="section-label">Catalogo</p>
                  <h2>Gestion de libros</h2>
                </div>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Titulo</th>
                      <th>Categoria</th>
                      <th>Precio</th>
                      <th>Stock</th>
                      <th>Vendidos</th>
                      <th>Etiquetas</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {books.map((book) => (
                      <tr key={book.id}>
                        <td>{book.titulo}</td>
                        <td>{book.category_name}</td>
                        <td>{formatCurrency(book.oferta && book.precio_oferta ? book.precio_oferta : book.precio)}</td>
                        <td>{book.stock}</td>
                        <td>{book.sold_units}</td>
                        <td>
                          <div className="admin-tag-stack">
                            {book.oferta ? <span className="admin-tag">Oferta</span> : null}
                            {book.destacado ? <span className="admin-tag">Destacado</span> : null}
                            {book.novedad ? <span className="admin-tag">Novedad</span> : null}
                            {book.preventa ? <span className="admin-tag">Preventa</span> : null}
                            {book.recomendado ? <span className="admin-tag">Recomendado</span> : null}
                          </div>
                        </td>
                        <td>{book.status_label}</td>
                        <td>
                          <div className="admin-inline-actions">
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => {
                                setEditingBookId(book.id);
                                setBookForm(normalizeBookForm(book));
                                setActiveTab("books");
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="danger-button"
                              onClick={() => handleDeleteBook(book.id)}
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "categories" ? (
          <section className="admin-grid">
            <div className="admin-panel-card">
              <div className="admin-section-heading">
                <div>
                  <p className="section-label">Categorias</p>
                  <h2>Organiza el catalogo</h2>
                </div>
              </div>
              <form className="admin-category-form" onSubmit={handleCreateCategory}>
                <label className="checkout-field">
                  <span>Nombre de categoria</span>
                  <input
                    type="text"
                    value={categoryName}
                    onChange={(event) => setCategoryName(event.target.value)}
                    placeholder="Ej. Desarrollo personal"
                    required
                  />
                </label>
                <button type="submit" className="checkout-submit">
                  Crear categoria
                </button>
              </form>
            </div>

            <div className="admin-panel-card admin-panel-span">
              <div className="admin-section-heading">
                <div>
                  <p className="section-label">Listado</p>
                  <h2>Categorias registradas</h2>
                </div>
              </div>
              <div className="admin-category-list">
                {categories.map((category) => (
                  <article key={category.id} className="admin-category-card">
                    <div>
                      <strong>{category.nombre}</strong>
                      <span>
                        {books.filter((book) => Number(book.category_id) === Number(category.id)).length} libros
                      </span>
                    </div>
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => handleDeleteCategory(category.id)}
                    >
                      Eliminar
                    </button>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "content" ? (
          <section className="admin-grid">
            <div className="admin-panel-card">
              <div className="admin-section-heading">
                <div>
                  <p className="section-label">Banners y paginas</p>
                  <h2>Gestion de secciones visibles</h2>
                </div>
              </div>

              <label className="checkout-field">
                <span>Seccion</span>
                <select value={selectedSectionKey} onChange={(event) => setSelectedSectionKey(event.target.value)}>
                  {SITE_SECTION_OPTIONS.map((sectionOption) => (
                    <option key={sectionOption.key} value={sectionOption.key}>
                      {sectionOption.label}
                    </option>
                  ))}
                </select>
              </label>

              <form className="admin-book-form" onSubmit={handleSaveSection}>
                <label className="checkout-field">
                  <span>Titulo</span>
                  <input
                    type="text"
                    value={sectionForm.title}
                    onChange={(event) => setSectionForm((currentValue) => ({ ...currentValue, title: event.target.value }))}
                  />
                </label>
                <label className="checkout-field">
                  <span>Subtitulo</span>
                  <input
                    type="text"
                    value={sectionForm.subtitle}
                    onChange={(event) => setSectionForm((currentValue) => ({ ...currentValue, subtitle: event.target.value }))}
                  />
                </label>
                <label className="checkout-field admin-textarea-field">
                  <span>Descripcion</span>
                  <textarea
                    rows="4"
                    value={sectionForm.body}
                    onChange={(event) => setSectionForm((currentValue) => ({ ...currentValue, body: event.target.value }))}
                  />
                </label>
                <label className="checkout-field">
                  <span>CTA texto</span>
                  <input
                    type="text"
                    value={sectionForm.cta_text}
                    onChange={(event) => setSectionForm((currentValue) => ({ ...currentValue, cta_text: event.target.value }))}
                  />
                </label>
                <label className="checkout-field">
                  <span>CTA link</span>
                  <input
                    type="text"
                    value={sectionForm.cta_link}
                    onChange={(event) => setSectionForm((currentValue) => ({ ...currentValue, cta_link: event.target.value }))}
                    placeholder="/contacto"
                  />
                </label>
                <label className="checkout-field admin-textarea-field">
                  <span>Imagen o fondo</span>
                  <input
                    type="url"
                    value={sectionForm.image_url}
                    onChange={(event) => setSectionForm((currentValue) => ({ ...currentValue, image_url: event.target.value }))}
                    placeholder="https://..."
                  />
                </label>
                <label className="checkout-field admin-textarea-field">
                  <span>Items extra</span>
                  <textarea
                    rows="5"
                    value={sectionForm.items_text}
                    onChange={(event) => setSectionForm((currentValue) => ({ ...currentValue, items_text: event.target.value }))}
                    placeholder="Linea simple o formato Titulo: descripcion"
                  />
                </label>
                <label className="admin-checkbox">
                  <input
                    type="checkbox"
                    checked={sectionForm.is_active}
                    onChange={(event) => setSectionForm((currentValue) => ({ ...currentValue, is_active: event.target.checked }))}
                  />
                  <span>Seccion activa</span>
                </label>

                <div className="admin-form-actions">
                  <button type="submit" className="checkout-submit">
                    Guardar seccion
                  </button>
                </div>
              </form>
            </div>

            <div className="admin-panel-card admin-panel-span">
              <div className="admin-section-heading">
                <div>
                  <p className="section-label">Resumen</p>
                  <h2>Secciones configuradas</h2>
                </div>
              </div>
              <div className="admin-category-list">
                {siteSections.map((section) => (
                  <article key={section.key} className="admin-category-card">
                    <div>
                      <strong>{SITE_SECTION_OPTIONS.find((item) => item.key === section.key)?.label || section.key}</strong>
                      <span>{section.title || "Sin titulo"}</span>
                    </div>
                    <span>{section.is_active ? "Activa" : "Oculta"}</span>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}

export default Admin;
