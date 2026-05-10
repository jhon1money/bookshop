const API_URL = import.meta.env.VITE_API_URL;
const NYT_API_KEY = import.meta.env.VITE_NYT_API_KEY;
const GOOGLE_BOOKS_API_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY;
const NYT_LIST_NAME = "combined-print-and-e-book-fiction";

const DEMO_TRENDING_BOOKS = [
  {
    rank: 1,
    title: "The 48 Laws of Power",
    author: "Robert Greene",
    description: "Un clasico contemporaneo sobre estrategia, influencia y lectura del poder en el mundo real.",
  },
  {
    rank: 2,
    title: "Clean Code",
    author: "Robert C. Martin",
    description: "Una referencia esencial para quienes buscan escribir software claro, mantenible y humano.",
  },
  {
    rank: 3,
    title: "The 5 Love Languages",
    author: "Gary Chapman",
    description: "Una obra muy conocida sobre relaciones, afecto y comunicacion en formato impreso.",
  },
  {
    rank: 4,
    title: "Atomic Habits",
    author: "James Clear",
    description: "Habitos pequenos, practica constante y sistemas que se convierten en cambios visibles.",
  },
  {
    rank: 5,
    title: "Sapiens",
    author: "Yuval Noah Harari",
    description: "Una mirada amplia y accesible a la humanidad, la cultura y las historias que forman civilizaciones.",
  },
];

function createUrlWithOptionalKey(baseUrl, keyName, keyValue) {
  if (!keyValue) {
    return baseUrl;
  }

  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}${keyName}=${encodeURIComponent(keyValue)}`;
}

function normalizeGoogleImage(imageUrl) {
  if (!imageUrl) {
    return "";
  }

  return imageUrl.replace("http://", "https://").replace("&edge=curl", "");
}

function stripHtml(value = "") {
  return value.replace(/<[^>]+>/g, "").trim();
}

function createAuthHeaders(token) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function createSpanishFallbackDescription(book) {
  return `El puesto #${book.rank} del ranking internacional recomienda esta edicion fisica de ${book.author}. Una lectura destacada para descubrir lo mas comentado del momento.`;
}

function normalizeNytBook(book, index = 0) {
  const fallbackDetails = Array.isArray(book.book_details) ? book.book_details[0] || {} : {};
  const isbnCandidates = Array.isArray(book.isbns) ? book.isbns : [];
  const primaryIsbn13 =
    book.primary_isbn13 ||
    fallbackDetails.primary_isbn13 ||
    isbnCandidates.find((isbn) => isbn.isbn13)?.isbn13 ||
    "";
  const primaryIsbn10 =
    book.primary_isbn10 ||
    fallbackDetails.primary_isbn10 ||
    isbnCandidates.find((isbn) => isbn.isbn10)?.isbn10 ||
    "";

  return {
    id: primaryIsbn13 || primaryIsbn10 || `nyt-trending-${book.rank || index + 1}`,
    rank: book.rank || index + 1,
    title: book.title || fallbackDetails.title || "Libro sin titulo",
    author: book.author || fallbackDetails.author || "Autor desconocido",
    description: "",
    cover:
      book.book_image ||
      book.book_image_url ||
      normalizeGoogleImage(fallbackDetails.book_image) ||
      "",
    buyUrl: book.amazon_product_url || book.book_uri || "",
    publisher: book.publisher || fallbackDetails.publisher || "",
    primaryIsbn13,
    primaryIsbn10,
    weeksOnList: book.weeks_on_list || 0,
    listName: "Ranking internacional NYT",
    source: "nyt",
  };
}

async function fetchGoogleBooksVolume(book) {
  const isbnQuery = book.primaryIsbn13 || book.primaryIsbn10;
  const queries = [
    {
      q: `intitle:${book.title} inauthor:${book.author}`,
      langRestrict: "es",
    },
  ];

  if (isbnQuery) {
    queries.push({ q: `isbn:${isbnQuery}`, langRestrict: "es" });
    queries.push({ q: `isbn:${isbnQuery}`, langRestrict: "" });
  }

  queries.push({ q: `intitle:${book.title} inauthor:${book.author}`, langRestrict: "" });

  for (const query of queries) {
    const baseUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
      query.q,
    )}&maxResults=3&printType=books&projection=lite${query.langRestrict ? `&langRestrict=${query.langRestrict}` : ""}`;
    const requestUrl = createUrlWithOptionalKey(baseUrl, "key", GOOGLE_BOOKS_API_KEY);
    const response = await fetch(requestUrl);

    if (!response.ok) {
      continue;
    }

    const data = await response.json();
    const volume =
      data.items?.find((item) => item.volumeInfo?.language === "es") ||
      data.items?.[0];

    if (!volume) {
      continue;
    }

    return {
      title: volume.volumeInfo?.title || "",
      author: volume.volumeInfo?.authors?.[0] || "",
      cover:
        normalizeGoogleImage(volume.volumeInfo?.imageLinks?.thumbnail) ||
        normalizeGoogleImage(volume.volumeInfo?.imageLinks?.smallThumbnail) ||
        "",
      infoLink: volume.volumeInfo?.infoLink || "",
      description: stripHtml(volume.volumeInfo?.description || ""),
    };
  }

  return null;
}

async function enrichWithGoogleBooks(book) {
  try {
    const googleBook = await fetchGoogleBooksVolume(book);

    if (!googleBook) {
      return {
        ...book,
        description: book.description || createSpanishFallbackDescription(book),
      };
    }

    return {
      ...book,
      title: googleBook.title || book.title,
      author: googleBook.author || book.author,
      cover: googleBook.cover || book.cover,
      buyUrl: book.buyUrl || googleBook.infoLink,
      description: googleBook.description || book.description || createSpanishFallbackDescription(book),
    };
  } catch {
    return {
      ...book,
      description: book.description || createSpanishFallbackDescription(book),
    };
  }
}

async function fetchNytTrendingBooks() {
  if (!NYT_API_KEY) {
    return null;
  }

  const response = await fetch(
    `https://api.nytimes.com/svc/books/v3/lists/current/${NYT_LIST_NAME}.json?api-key=${encodeURIComponent(
      NYT_API_KEY,
    )}`,
  );

  if (!response.ok) {
    throw new Error("No se pudo cargar la lista de tendencias del New York Times");
  }

  const data = await response.json();
  const rawBooks = data.results?.books || data.results || [];
  const normalizedBooks = rawBooks.slice(0, 10).map((book, index) => normalizeNytBook(book, index));

  return Promise.all(normalizedBooks.map((book) => enrichWithGoogleBooks(book)));
}

async function fetchDemoTrendingBooks() {
  const normalizedBooks = DEMO_TRENDING_BOOKS.map((book, index) => ({
    id: `demo-${index + 1}`,
    ...book,
    cover: "",
    buyUrl: "",
    listName: "Seleccion editorial",
    source: "demo",
  }));

  return Promise.all(normalizedBooks.map((book) => enrichWithGoogleBooks(book)));
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

export async function getTrendingBooks() {
  try {
    const nytBooks = await fetchNytTrendingBooks();

    if (nytBooks?.length) {
      return nytBooks;
    }

    return fetchDemoTrendingBooks();
  } catch {
    return fetchDemoTrendingBooks();
  }
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
