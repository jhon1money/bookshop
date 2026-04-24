const API_URL = "http://127.0.0.1:5000";

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
