const API_URL = "http://127.0.0.1:5000";

export async function getBooks(search="", category="", ofertas=""){

  let url = `${API_URL}/api/books?`;

  if(search) url += `search=${search}&`
  if(category) url += `category=${category}&`
  if(ofertas) url += `ofertas=true`

  const response = await fetch(url)

  return response.json()

}