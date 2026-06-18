import { useState } from "react";

function SearchBar({
  searchTerm,
  onSearchChange,
  showOffersOnly,
  onToggleOffers,
  categories,
  selectedCategory,
  onCategoryChange,
  combos,
  selectedCombo,
  onComboChange,
  onClearFilters,
  activeFiltersCount = 0,
}) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const activeCategory = categories.find((category) => category.slug === selectedCategory);

  return (
    <div className="filters-stack">
      <section className="search-panel">
        <label className="search-box">
          <span className="search-input-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="6.4" fill="none" stroke="currentColor" strokeWidth="1.9" />
              <path d="M15.8 15.8 20 20" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.9" />
            </svg>
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar por título o autor"
            aria-label="Buscar por título o autor"
          />
        </label>

        <div className="search-actions">
          <div className="filter-dropdown">
            <button
              type="button"
              className={`filter-button ${isFilterOpen ? "active" : ""}`}
              onClick={() => setIsFilterOpen((currentValue) => !currentValue)}
              aria-expanded={isFilterOpen}
            >
              <span className="filter-button-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path
                    d="M4.5 6.5h15M7.5 12h9M10 17.5h4"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="2"
                  />
                </svg>
              </span>
              <span className="filter-button-copy">
                <strong>Filtros</strong>
                <span className="filter-button-meta">
                  {activeCategory ? activeCategory.label : "Todos"}
                </span>
              </span>
            </button>

            {isFilterOpen ? (
              <div className="filter-menu">
                <div className="filter-menu-section">
                  <p className="filter-menu-label">Categorías</p>
                  <div className="category-chips" role="tablist" aria-label="Categorías">
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
                  <p className="filter-menu-label">Combos</p>

                  <div className="combo-chips">
                    {combos.map((combo) => (
                      <button
                        key={combo.slug}
                        type="button"
                        className={`combo-chip ${selectedCombo === combo.slug ? "active" : ""}`}
                        onClick={() => {
                          onComboChange(selectedCombo === combo.slug ? "" : combo.slug);
                          setIsFilterOpen(false);
                        }}
                      >
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
            aria-pressed={showOffersOnly}
          >
            <span className="offer-toggle-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path
                  d="M4.8 11.6 11.6 4.8h6.2c0.8 0 1.4 0.6 1.4 1.4v6.2l-6.8 6.8c-0.6 0.6-1.5 0.6-2.1 0l-5.5-5.5c-0.6-0.6-0.6-1.5 0-2.1Z"
                  fill="none"
                  stroke="currentColor"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                />
                <circle cx="15.8" cy="8.2" r="1.15" fill="currentColor" />
              </svg>
            </span>
            <span>{showOffersOnly ? "Ofertas activas" : "Ver solo ofertas"}</span>
          </button>

          <button
            type="button"
            className="clear-filters-button icon-clear-button"
            onClick={() => {
              onClearFilters();
              setIsFilterOpen(false);
            }}
            aria-label="Limpiar filtros"
            title="Limpiar filtros"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6L6 18"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2.2"
              />
            </svg>
            {activeFiltersCount > 0 ? <span className="clear-filters-badge">{activeFiltersCount}</span> : null}
          </button>
        </div>
      </section>
    </div>
  );
}

export default SearchBar;
