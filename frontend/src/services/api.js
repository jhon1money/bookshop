// const API_URL = "http://127.0.0.1:5000";
const API_URL = import.meta.env.VITE_API_URL;

function createAuthHeaders(token) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function getBooks(search = "", category = "", ofertas = "") {
  const params = new URLSearchParams();

  if (search) params.set("search", search);
  if (category) params.set("category", category);
  if (ofertas) params.set("ofertas", "true");

  const queryString = params.toString();
  const url = `${API_URL}/api/books${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("No se pudieron cargar los libros");
  }

  return response.json();
}

export async function getCategories() {
  const response = await fetch(`${API_URL}/api/categories`);

  if (!response.ok) {
    throw new Error("No se pudieron cargar las categorias");
  }

  return response.json();
}

export async function getSiteContent() {
  const response = await fetch(`${API_URL}/api/site/content`);

  if (!response.ok) {
    throw new Error("No se pudo cargar el contenido de la tienda");
  }

  return response.json();
}

export async function createOrder(payload) {
  const response = await fetch(`${API_URL}/api/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "No se pudo crear la orden");
  }

  return data;
}

export async function loginAdmin(payload) {
  const response = await fetch(`${API_URL}/api/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "No se pudo iniciar sesion");
  }

  return data;
}

export async function getAdminOverview(token) {
  const response = await fetch(`${API_URL}/api/admin/overview`, {
    headers: createAuthHeaders(token),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "No se pudo cargar el dashboard");
  }

  return data;
}

export async function getAdminOverviewWithFilters(token, filters = {}) {
  const params = new URLSearchParams();
  if (filters.start_date) params.set("start_date", filters.start_date);
  if (filters.end_date) params.set("end_date", filters.end_date);

  const response = await fetch(`${API_URL}/api/admin/overview${params.toString() ? `?${params.toString()}` : ""}`, {
    headers: createAuthHeaders(token),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "No se pudo cargar el dashboard");
  }

  return data;
}

export async function getAdminBooks(token) {
  const response = await fetch(`${API_URL}/api/admin/books`, {
    headers: createAuthHeaders(token),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "No se pudo cargar el inventario de libros");
  }

  return data;
}

export async function getAdminInventory(token) {
  const response = await fetch(`${API_URL}/api/admin/inventory`, {
    headers: createAuthHeaders(token),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "No se pudo cargar el inventario");
  }

  return data;
}

export async function getAdminOrders(token, filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  if (filters.start_date) params.set("start_date", filters.start_date);
  if (filters.end_date) params.set("end_date", filters.end_date);

  const queryString = params.toString();
  const response = await fetch(`${API_URL}/api/admin/orders${queryString ? `?${queryString}` : ""}`, {
    headers: createAuthHeaders(token),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "No se pudieron cargar las ordenes");
  }

  return data;
}

export async function exportAdminOrdersCsv(token, filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  if (filters.start_date) params.set("start_date", filters.start_date);
  if (filters.end_date) params.set("end_date", filters.end_date);

  const response = await fetch(
    `${API_URL}/api/admin/orders/export${params.toString() ? `?${params.toString()}` : ""}`,
    {
      headers: createAuthHeaders(token),
    },
  );

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || "No se pudo exportar el reporte");
  }

  return response.blob();
}

export async function updateAdminOrderStatus(token, orderId, status) {
  const response = await fetch(`${API_URL}/api/admin/orders/${orderId}/status`, {
    method: "PUT",
    headers: createAuthHeaders(token),
    body: JSON.stringify({ status }),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "No se pudo actualizar el estado");
  }

  return data;
}

export async function createAdminBook(token, payload) {
  const response = await fetch(`${API_URL}/api/books`, {
    method: "POST",
    headers: createAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "No se pudo crear el libro");
  }

  return data;
}

export async function updateAdminBook(token, bookId, payload) {
  const response = await fetch(`${API_URL}/api/books/${bookId}`, {
    method: "PUT",
    headers: createAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "No se pudo actualizar el libro");
  }

  return data;
}

export async function deleteAdminBook(token, bookId) {
  const response = await fetch(`${API_URL}/api/books/${bookId}`, {
    method: "DELETE",
    headers: createAuthHeaders(token),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "No se pudo eliminar el libro");
  }

  return data;
}

export async function createAdminCategory(token, payload) {
  const response = await fetch(`${API_URL}/api/categories`, {
    method: "POST",
    headers: createAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "No se pudo crear la categoria");
  }

  return data;
}

export async function getAdminSiteContent(token) {
  const response = await fetch(`${API_URL}/api/admin/site-content`, {
    headers: createAuthHeaders(token),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "No se pudo cargar el contenido editable");
  }

  return data;
}

export async function updateAdminSiteContent(token, key, payload) {
  const response = await fetch(`${API_URL}/api/admin/site-content/${key}`, {
    method: "PUT",
    headers: createAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "No se pudo guardar la seccion");
  }

  return data;
}

export async function deleteAdminCategory(token, categoryId) {
  const response = await fetch(`${API_URL}/api/categories/${categoryId}`, {
    method: "DELETE",
    headers: createAuthHeaders(token),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "No se pudo eliminar la categoria");
  }

  return data;
}
