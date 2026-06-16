function BookCard({ book, onAddToCart, onOpenDetails, animationIndex = 0 }) {
  const imageSrc = book.imagen || "https://placehold.co/400x560/e6dccd/5e4632?text=Book";
  const displayPrice = Number(book.precio).toFixed(2);
  const offerPrice =
    book.oferta && book.precio_oferta
      ? Number(book.precio_oferta).toFixed(2)
      : null;
  const cardMotionIndex = Math.min(Number(animationIndex) || 0, 12);

  return (
    <article
      className={`book-card ${book.promo_2x1 ? "has-promo-2x1" : ""}`}
      style={{ "--book-index": cardMotionIndex }}
    >
      <div className="book-badge-row">
        {book.oferta ? <span className="book-badge">Oferta</span> : null}
        {book.destacado ? <span className="book-flag-chip">Destacado</span> : null}
        {book.novedad ? <span className="book-flag-chip">Novedad</span> : null}
        {book.preventa ? <span className="book-flag-chip">Preventa</span> : null}
        {book.recomendado ? <span className="book-flag-chip">Recomendado</span> : null}
        {book.promo_2x1 ? <span className="book-badge promo-badge promo-badge-animated">2x1</span> : null}
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
        {book.promo_2x1 ? <span className="promo-2x1-corner" aria-hidden="true">2x1</span> : null}
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
        {book.promo_2x1 ? (
          <span className="book-promo-note">2x1 con {book.promo_2x1_partner_title || "libro enlazado"}</span>
        ) : null}

        <div className="book-card-actions">
          <button
            type="button"
            className="book-button"
            onClick={() => onAddToCart(book)}
            disabled={book.stock <= 0}
          >
            {book.stock > 0 ? (book.promo_2x1 ? "Agregar 2x1" : "Agregar") : "Sin stock"}
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
