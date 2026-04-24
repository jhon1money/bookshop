import { useState } from "react";

function SearchBar({
  searchTerm,
  onSearchChange,
  showOffersOnly,
  onToggleOffers,
  resultCount,
  categories,
  selectedCategory,
  onCategoryChange,
  combos,
}) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const activeCategory = categories.find((category) => category.slug === selectedCategory);

  return (
    <div className="filters-stack">
      <section className="search-panel">
        <label className="search-box">
          <span className="search-label">Buscar por titulo o autor</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Ej. Clean Code o Robert Martin"
          />
        </label>

        <div className="search-actions">
          <span className="search-results-pill">{resultCount} visibles</span>
          <div className="filter-dropdown">
            <button
              type="button"
              className={`filter-button ${isFilterOpen ? "active" : ""}`}
              onClick={() => setIsFilterOpen((currentValue) => !currentValue)}
            >
              Filtro
              <span className="filter-button-meta">
                {activeCategory ? activeCategory.label : "Todos"}
              </span>
            </button>

            {isFilterOpen ? (
              <div className="filter-menu">
                <div className="filter-menu-section">
                  <p className="filter-menu-label">Categorias</p>
                  <div className="category-chips" role="tablist" aria-label="Categorias">
                    {categories.map((category) => (
                      <button
                        key={category.slug}
                        type="button"
                        className={`category-chip ${selectedCategory === category.slug ? "active" : ""}`}
                        onClick={() => {
                          onCategoryChange(category.slug);
                          setIsFilterOpen(false);
                        }}
                      >
                        {category.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="filter-menu-section">
                  <div className="filter-menu-header">
                    <p className="filter-menu-label">Combos</p>
                    <span className="soon-pill">Proximamente</span>
                  </div>

                  <div className="combo-chips">
                    {combos.map((combo) => (
                      <button key={combo.slug} type="button" className="combo-chip" disabled>
                        {combo.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            className={`offer-toggle ${showOffersOnly ? "active" : ""}`}
            onClick={onToggleOffers}
          >
            {showOffersOnly ? "Mostrando ofertas" : "Ver solo ofertas"}
          </button>
        </div>
      </section>
    </div>
  );
}

export default SearchBar;
