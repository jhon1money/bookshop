function BookCard({ book, onAddToCart, onOpenDetails }) {
  const imageSrc = book.imagen || "https://placehold.co/400x560/e6dccd/5e4632?text=Book";
  const displayPrice = Number(book.precio).toFixed(2);
  const offerPrice =
    book.oferta && book.precio_oferta
      ? Number(book.precio_oferta).toFixed(2)
      : null;

  return (
    <article className="book-card">
      <div className="book-badge-row">
        {book.oferta ? <span className="book-badge">Oferta</span> : null}
        {book.destacado ? <span className="book-flag-chip">Destacado</span> : null}
        {book.novedad ? <span className="book-flag-chip">Novedad</span> : null}
        {book.preventa ? <span className="book-flag-chip">Preventa</span> : null}
        {book.recomendado ? <span className="book-flag-chip">Recomendado</span> : null}
        <span className={`stock-pill ${book.stock > 0 ? "in-stock" : "out-stock"}`}>
          {book.stock > 0 ? `${book.stock} disponibles` : "Sin stock"}
        </span>
      </div>

      <button
        type="button"
        className="book-media-button"
        onClick={() => onOpenDetails(book)}
        aria-label={`Ver detalle de ${book.titulo}`}
      >
        <span className="book-image-shell">
          <img src={imageSrc} alt={book.titulo} className="book-image" />
        </span>
      </button>

      <div className="book-content">
        <button type="button" className="book-title-button" onClick={() => onOpenDetails(book)}>
          {book.titulo}
        </button>
        <div className="book-author">{book.autor}</div>

        <div className="book-prices">
          <span className={offerPrice ? "price-original" : "book-price"}>RD$ {displayPrice}</span>
          {offerPrice ? <span className="price-offer">RD$ {offerPrice}</span> : null}
        </div>

        <div className="book-card-actions">
          <button
            type="button"
            className="book-button"
            onClick={() => onAddToCart(book)}
            disabled={book.stock <= 0}
          >
            {book.stock > 0 ? "Agregar" : "Sin stock"}
          </button>
          <button type="button" className="book-detail-button" onClick={() => onOpenDetails(book)}>
            Detalle
          </button>
        </div>
      </div>
    </article>
  );
}

export default BookCard;
