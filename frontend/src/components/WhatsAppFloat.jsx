const WHATSAPP_NUMBER = "18294475730";
const WHATSAPP_MESSAGE = "Hola, estoy interesado en comprar libros";

function WhatsAppFloat() {
  const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  return (
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
  );
}

export default WhatsAppFloat;
