import { useState } from "react";

const FALLBACK_TREND_COVER = "https://placehold.co/800x1120/f1ece0/1a1a1a?text=Libro";

function TrendSlide({ book, direction }) {
  const [hasImageError, setHasImageError] = useState(false);
  const coverSrc = hasImageError ? FALLBACK_TREND_COVER : book.cover || FALLBACK_TREND_COVER;

  return (
    <article className={`trend-slide trend-slide-${direction}`}>
      <div
        className="trend-ambient"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(18, 18, 16, 0.12), rgba(18, 18, 16, 0.16)), url(${coverSrc})`,
        }}
      />

      <div className="trend-slide-content">
        <div className="trend-copy">
          <p className="trend-label">Bestseller del momento</p>

          <div className="trend-rank-row">
            <span className="trend-rank">#{book.rank || "-"}</span>
            <span className="trend-fire">Tendencia</span>
          </div>

          <h3>{book.title}</h3>
          <p className="trend-author">{book.author}</p>

          <p className="trend-description">
            {book.description || "Una historia destacada que esta captando la atencion de lectores."}
          </p>

          <div className="trend-meta">
            <span>{book.listName || "Lista destacada"}</span>
            {book.weeksOnList ? <span>{book.weeksOnList} semanas</span> : null}
            <span>Formato fisico</span>
          </div>

          <div className="trend-actions">
            <a
              className="trend-buy-button"
              href={book.buyUrl || "#"}
              target={book.buyUrl ? "_blank" : undefined}
              rel={book.buyUrl ? "noreferrer" : undefined}
              onClick={(event) => !book.buyUrl && event.preventDefault()}
            >
              Comprar edicion fisica
            </a>

            <a
              className="trend-link"
              href={book.buyUrl || "#"}
              target={book.buyUrl ? "_blank" : undefined}
              rel={book.buyUrl ? "noreferrer" : undefined}
              onClick={(event) => !book.buyUrl && event.preventDefault()}
            >
              Ver detalles
            </a>
          </div>
        </div>

        <div className="trend-cover-stack">
          <div className="trend-cover-frame">
            <img
              src={coverSrc}
              alt={book.title}
              className="trend-cover-image"
              loading="eager"
              referrerPolicy="no-referrer"
              onError={() => setHasImageError(true)}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

export default TrendSlide;
