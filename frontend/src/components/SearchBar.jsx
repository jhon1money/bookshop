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
              Filtros
              <span className="filter-button-meta">
                {activeCategory ? activeCategory.label : "Todos"}
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
            {showOffersOnly ? "Mostrando ofertas" : "Ver solo ofertas"}
          </button>

          <button
            type="button"
            className="clear-filters-button"
            onClick={() => {
              onClearFilters();
              setIsFilterOpen(false);
            }}
          >
            Limpiar
            {activeFiltersCount > 0 ? <span className="clear-filters-badge">{activeFiltersCount}</span> : null}
          </button>
        </div>
      </section>
    </div>
  );
}

export default SearchBar;
