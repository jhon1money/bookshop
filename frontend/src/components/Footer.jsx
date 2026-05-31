const STORE_PHONE = "829-447-5730";
const WHATSAPP_NUMBER = "18294475730";
const STORE_EMAIL = "Cristofer25suarez@gmail.com";
const WHATSAPP_MESSAGE = "Hola, estoy interesado en comprar libros";

function Footer({ onNavigate }) {
  const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  function goTo(view) {
    if (onNavigate) {
      onNavigate(view);
    }
  }

  return (
    <footer className="site-footer" aria-labelledby="footer-brand-title">
      <div className="container footer-grid">
        <section className="footer-brand">
          <span className="footer-brand-mark">SJ</span>
          <div>
            <h3 id="footer-brand-title">Librería SJ</h3>
            <p>
              Catálogo curado de libros físicos, novedades y recomendaciones para lectores que
              quieren comprar con seguridad y buen acompañamiento.
            </p>
            <div className="footer-proof-list">
              <span>Orden confirmada</span>
              <span>Libros físicos</span>
              <span>Atención cercana</span>
            </div>
          </div>
        </section>

        <nav className="footer-column" aria-label="Enlaces del footer">
          <h3>Explorar</h3>
          <button type="button" onClick={() => goTo("home")}>
            Inicio
          </button>
          <button type="button" onClick={() => goTo("blog")}>
            Blog de lectores
          </button>
          <button type="button" onClick={() => goTo("envios")}>
            Envíos y entregas
          </button>
          <button type="button" onClick={() => goTo("politicas")}>
            Políticas de compra
          </button>
        </nav>

        <section className="footer-column footer-contact-card">
          <h3>Contacto</h3>
          <a href={whatsappLink} target="_blank" rel="noreferrer">
            WhatsApp: {STORE_PHONE}
          </a>
          <a href={`mailto:${STORE_EMAIL}`}>{STORE_EMAIL}</a>
          <span>Lunes a sábado, 9:00am a 9:00pm</span>
          <span>República Dominicana</span>
        </section>

        <section className="footer-column">
          <h3>Pago y confianza</h3>
          <div className="payment-tags">
            <span>Transferencia</span>
            <span>Efectivo coordinado</span>
            <span>Confirmación por orden</span>
            <span>Seguimiento por WhatsApp</span>
          </div>
          <div className="social-links" aria-label="Canales rápidos">
            <a href={whatsappLink} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
            <a href={`mailto:${STORE_EMAIL}`}>Correo</a>
          </div>
        </section>
      </div>

      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Librería SJ. Todos los derechos reservados.</span>
        <span>Compra segura de libros físicos en República Dominicana.</span>
      </div>
    </footer>
  );
}

export default Footer;
