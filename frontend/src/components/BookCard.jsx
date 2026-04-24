function BookCard({ book, onAddToCart, onOpenDetails }) {
  const imageSrc = book.imagen || "https://placehold.co/400x560/e6dccd/5e4632?text=Book";
  const displayPrice = Number(book.precio).toFixed(2);
  const offerPrice =
    book.oferta && book.precio_oferta
      ? Number(book.precio_oferta).toFixed(2)
      : null;

  return (
    <article
      className="book-card card-hover"
      onClick={() => onOpenDetails(book)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenDetails(book);
        }
      }}
    >
      <div className="book-badge-row">
        {book.oferta ? <span className="book-badge">Oferta</span> : null}
        <span className={`stock-pill ${book.stock > 0 ? "in-stock" : "out-stock"}`}>
          {book.stock > 0 ? `${book.stock} disponibles` : "Sin stock"}
        </span>
      </div>

      <div className="book-image-shell">
        <img src={imageSrc} alt={book.titulo} className="book-image" />
      </div>

      <div className="book-content">
        <div className="book-title">{book.titulo}</div>
        <div className="book-author">{book.autor}</div>

        <div className="book-prices">
          <span className={offerPrice ? "price-original" : "book-price"}>${displayPrice}</span>
          {offerPrice ? <span className="price-offer">${offerPrice}</span> : null}
        </div>

        <button
          type="button"
          className="book-button"
          onClick={(event) => {
            event.stopPropagation();
            onAddToCart(book);
          }}
          disabled={book.stock <= 0}
        >
          {book.stock > 0 ? "Agregar al carrito" : "No disponible"}
        </button>
      </div>
    </article>
  );
}

export default BookCard;
