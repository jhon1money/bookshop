const API_URL = "http://127.0.0.1:5000"

function BookCard({book}){

  function addToCart(){

    fetch(`${API_URL}/add_to_cart/${book.id}`,{
      method:"POST"
    })

  }

  return(

    <div className="book-card card-hover">

      <img src={book.imagen} className="book-image"/>

      <div className="book-title">{book.titulo}</div>

      <div className="book-author">{book.autor}</div>

      <div className="book-price">${book.precio}</div>

      <button
        className="book-button"
        onClick={addToCart}
      >
        Agregar al carrito
      </button>

    </div>

  )

}

export default BookCard