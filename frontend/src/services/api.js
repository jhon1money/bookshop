const API_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:5000").replace(/\/$/, "");

function createAuthHeaders(token) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function readJson(response) {
  return response.json();
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
    throw new Error("No se cargaron los libros.");
  }

  return readJson(response);
}

export async function getCategories() {
  const response = await fetch(`${API_URL}/api/categories`);

  if (!response.ok) {
    throw new Error("No se cargaron las categorías.");
  }

  return readJson(response);
}

export async function getSiteContent() {
  const response = await fetch(`${API_URL}/api/site/content`);

  if (!response.ok) {
    throw new Error("No se cargó el contenido.");
  }

  return readJson(response);
}

export async function createOrder(payload) {
  const response = await fetch(`${API_URL}/api/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(data.message || "No se creó el pedido.");
  }

  return data;
}

export async function quoteOrder(payload) {
  const response = await fetch(`${API_URL}/api/orders/quote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(data.message || "No se calculó el resumen.");
  }

  return data;
}

export async function getBlogPosts() {
  const response = await fetch(`${API_URL}/api/blog/posts`);

  if (!response.ok) {
    throw new Error("No se cargó el blog.");
  }

  return readJson(response);
}

export async function validateBlogOrder(payload) {
  const response = await fetch(`${API_URL}/api/blog/validate-order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(data.message || "Orden inválida.");
  }

  return data;
}

export async function createBlogPost(payload) {
  const response = await fetch(`${API_URL}/api/blog/posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(data.message || "No se publicó.");
  }

  return data;
}

export async function createBlogComment(postId, payload) {
  const response = await fetch(`${API_URL}/api/blog/posts/${postId}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(data.message || "No se comentó.");
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
  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(data.message || "No se inició sesión.");
  }

  return data;
}

export async function getAdminOverview(token) {
  const response = await fetch(`${API_URL}/api/admin/overview`, {
    headers: createAuthHeaders(token),
  });
  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(data.message || "No se cargó el panel.");
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
  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(data.message || "No se cargó el panel.");
  }

  return data;
}

export async function getAdminBooks(token) {
  const response = await fetch(`${API_URL}/api/admin/books`, {
    headers: createAuthHeaders(token),
  });
  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(data.message || "No se cargaron los libros.");
  }

  return data;
}

export async function getAdminInventory(token) {
  const response = await fetch(`${API_URL}/api/admin/inventory`, {
    headers: createAuthHeaders(token),
  });
  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(data.message || "No se cargó el inventario.");
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
  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(data.message || "No se cargaron las órdenes.");
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
    const data = await readJson(response);
    throw new Error(data.message || "No se exportó.");
  }

  return response.blob();
}

export async function updateAdminOrderStatus(token, orderId, status) {
  const response = await fetch(`${API_URL}/api/admin/orders/${orderId}/status`, {
    method: "PUT",
    headers: createAuthHeaders(token),
    body: JSON.stringify({ status }),
  });
  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(data.message || "No se actualizó.");
  }

  return data;
}

export async function createAdminBook(token, payload) {
  const response = await fetch(`${API_URL}/api/books`, {
    method: "POST",
    headers: createAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(data.message || "No se creó el libro.");
  }

  return data;
}

export async function updateAdminBook(token, bookId, payload) {
  const response = await fetch(`${API_URL}/api/books/${bookId}`, {
    method: "PUT",
    headers: createAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(data.message || "No se actualizó el libro.");
  }

  return data;
}

export async function deleteAdminBook(token, bookId) {
  const response = await fetch(`${API_URL}/api/books/${bookId}`, {
    method: "DELETE",
    headers: createAuthHeaders(token),
  });
  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(data.message || "No se eliminó el libro.");
  }

  return data;
}

export async function createAdminCategory(token, payload) {
  const response = await fetch(`${API_URL}/api/categories`, {
    method: "POST",
    headers: createAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(data.message || "No se creó la categoría.");
  }

  return data;
}

export async function getAdminSiteContent(token) {
  const response = await fetch(`${API_URL}/api/admin/site-content`, {
    headers: createAuthHeaders(token),
  });
  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(data.message || "No se cargó el contenido.");
  }

  return data;
}

export async function updateAdminSiteContent(token, key, payload) {
  const response = await fetch(`${API_URL}/api/admin/site-content/${key}`, {
    method: "PUT",
    headers: createAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(data.message || "No se guardó la sección.");
  }

  return data;
}

export async function deleteAdminCategory(token, categoryId) {
  const response = await fetch(`${API_URL}/api/categories/${categoryId}`, {
    method: "DELETE",
    headers: createAuthHeaders(token),
  });
  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(data.message || "No se eliminó la categoría.");
  }

  return data;
}
