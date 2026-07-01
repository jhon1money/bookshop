import { useEffect, useState } from "react";

const WHATSAPP_NUMBER = "18294475730";
const WHATSAPP_MESSAGE = "Hola, estoy interesado en comprar libros";

function WhatsAppFloat() {
  const [showSearchShortcut, setShowSearchShortcut] = useState(false);
  const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  useEffect(() => {
    function updateSearchShortcutVisibility() {
      const catalogSection = document.getElementById("catalogo");
      setShowSearchShortcut(Boolean(catalogSection) && window.scrollY > 420);
    }

    updateSearchShortcutVisibility();
    window.addEventListener("scroll", updateSearchShortcutVisibility, { passive: true });
    window.addEventListener("resize", updateSearchShortcutVisibility);

    return () => {
      window.removeEventListener("scroll", updateSearchShortcutVisibility);
      window.removeEventListener("resize", updateSearchShortcutVisibility);
    };
  }, []);

  function handleSearchShortcutClick() {
    const catalogSection = document.getElementById("catalogo");
    const searchInput = catalogSection?.querySelector("input[aria-label='Buscar por título o autor']");

    catalogSection?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    window.setTimeout(() => {
      searchInput?.focus({ preventScroll: true });
    }, 520);
  }

  return (
    <>
      <button
        type="button"
        className={`search-return-float ${showSearchShortcut ? "visible" : ""}`}
        onClick={handleSearchShortcutClick}
        aria-label="Volver al buscador de libros"
        aria-hidden={!showSearchShortcut}
        tabIndex={showSearchShortcut ? 0 : -1}
      >
        <span aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M12 19V5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
            <path d="m6.5 10.5 5.5-5.5 5.5 5.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            <circle cx="12" cy="19" r="1.2" fill="currentColor" />
          </svg>
        </span>
        <strong>Buscar libros</strong>
      </button>

      <a
        className="whatsapp-float"
        href={whatsappLink}
        target="_blank"
        rel="noreferrer"
        aria-label="Abrir WhatsApp para comprar libros"
      >
        <span aria-hidden="true">WA</span>
        <strong>Comprar por WhatsApp</strong>
      </a>
    </>
  );
}

export default WhatsAppFloat;
