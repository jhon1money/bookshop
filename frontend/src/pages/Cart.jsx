import { useEffect, useMemo, useState } from "react";
import Footer from "../components/Footer";
import { createOrder, quoteOrder } from "../services/api";
import usePageMeta from "../hooks/usePageMeta";
import { calculateCartSummary, getPromoPairs } from "../utils/cartPromos";
import {
  allBmCargoBranches,
  bmCargoBranches,
  dominicanProvinces,
  getBmCargoBranchAddress,
  localDeliveryProvinces,
} from "../data/bmCargoBranches";

const SHIPPING_COSTS = {
  local: 250,
  province: 300,
};

const MAX_RECEIPT_SIZE = 5 * 1024 * 1024;
const RECEIPT_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "pdf"];
const BANK_TRANSFER_ACCOUNTS = [
  {
    key: "banreservas",
    label: "Banreservas",
    subtitle: "Cuenta de ahorros",
    details: [
      { key: "company", label: "Empresa", value: "Suarez Jimenez Technology", copyable: false },
      { key: "rnc", label: "RNC", value: "132117842", copyable: true },
      { key: "account_type", label: "Tipo", value: "Cuenta de Ahorros", copyable: false },
      { key: "account_number", label: "Numero de cuenta", value: "9603050422", copyable: true },
    ],
  },
  {
    key: "popular",
    label: "Banco Popular",
    subtitle: "Cuenta corriente",
    details: [
      { key: "holder", label: "Titular", value: "Patricia Jimenez de Suarez", copyable: false },
      { key: "account_type", label: "Tipo", value: "Cuenta Corriente", copyable: false },
      { key: "account_number", label: "Numero de cuenta", value: "853965572", copyable: true },
    ],
  },
];

const INITIAL_CUSTOMER_DATA = {
  delivery_type: "",
  customer_name: "",
  customer_cedula: "",
  customer_email: "",
  customer_phone: "",
  province: "",
  municipality_sector: "",
  bm_cargo_branch: "",
  delivery_note: "",
  payment_method: "",
  transfer_bank: "",
};

function formatCurrency(value) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function getReceiptExtension(filename = "") {
  return filename.split(".").pop()?.toLowerCase() || "";
}

function CheckoutStepTitle({ number, label, title, copy }) {
  return (
    <div className="checkout-section-head">
      <span className="checkout-step-number">{number}</span>
      <div>
        <p className="section-label">{label}</p>
        <h2>{title}</h2>
        {copy ? <p className="checkout-step-copy">{copy}</p> : null}
      </div>
    </div>
  );
}

function Cart({ cartItems, onBack, onNavigate, onUpdateQuantity, onRemoveItem, onClearCart }) {
  const [customerData, setCustomerData] = useState(INITIAL_CUSTOMER_DATA);
  const [receiptFile, setReceiptFile] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [orderConfirmation, setOrderConfirmation] = useState(null);
  const [customerWhatsappLink, setCustomerWhatsappLink] = useState("");
  const [checkoutSummary, setCheckoutSummary] = useState(() => calculateCartSummary(cartItems));
  const [copiedBankKey, setCopiedBankKey] = useState("");

  usePageMeta({
    title: "Carrito",
    description: "Confirma tu pedido de libros físicos con envío BM Cargo y pago coordinado por WhatsApp.",
    canonicalPath: "/carrito",
    robots: "noindex, follow",
  });

  const localSummary = useMemo(() => calculateCartSummary(cartItems), [cartItems]);
  const promoPairs = useMemo(() => getPromoPairs(cartItems), [cartItems]);
  const summary = checkoutSummary || localSummary;
  const shippingCost = customerData.delivery_type ? SHIPPING_COSTS[customerData.delivery_type] : 0;
  const finalTotal = Number(summary.total || 0) + shippingCost;

  const provinceOptions = useMemo(() => {
    if (customerData.delivery_type === "local") {
      return localDeliveryProvinces;
    }
    if (customerData.delivery_type === "province") {
      return dominicanProvinces.filter((province) => !localDeliveryProvinces.includes(province));
    }
    return [];
  }, [customerData.delivery_type]);

  const directBranches = bmCargoBranches[customerData.province] || [];
  const hasDirectBranches = directBranches.length > 0;
  const branchOptions = hasDirectBranches ? directBranches : allBmCargoBranches;
  const selectedBranchAddress = getBmCargoBranchAddress(customerData.bm_cargo_branch);
  const selectedTransferBank = BANK_TRANSFER_ACCOUNTS.find((bank) => bank.key === customerData.transfer_bank) || null;
  const cartStepReady = cartItems.length > 0;
  const deliveryStepReady = Boolean(
    customerData.delivery_type &&
      customerData.customer_name.trim() &&
      customerData.customer_cedula.trim() &&
      customerData.customer_phone.trim() &&
      customerData.province.trim() &&
      customerData.municipality_sector.trim() &&
      customerData.bm_cargo_branch.trim(),
  );
  const paymentStepReady = Boolean(
    customerData.payment_method &&
      (customerData.payment_method !== "transfer" || (customerData.transfer_bank && receiptFile)),
  );
  const checkoutProgress = [
    { label: "Pedido", done: cartStepReady },
    { label: "Entrega", done: deliveryStepReady },
    { label: "Pago", done: paymentStepReady },
  ];

  const isFormReady = useMemo(() => {
    const requiredFields = [
      "delivery_type",
      "customer_name",
      "customer_cedula",
      "customer_phone",
      "province",
      "municipality_sector",
      "bm_cargo_branch",
      "payment_method",
    ];
    const hasRequiredFields = requiredFields.every((field) => String(customerData[field] || "").trim());
    const hasTransferBank = customerData.payment_method !== "transfer" || customerData.transfer_bank;
    const hasReceipt = customerData.payment_method !== "transfer" || receiptFile;

    return cartItems.length > 0 && hasRequiredFields && hasTransferBank && hasReceipt && !submitting;
  }, [cartItems.length, customerData, receiptFile, submitting]);

  useEffect(() => {
    if (!cartItems.length) {
      setCheckoutSummary(calculateCartSummary([]));
      return undefined;
    }

    let cancelled = false;

    quoteOrder({
      items: cartItems.map((item) => ({
        book_id: item.id,
        quantity: item.quantity,
      })),
    })
      .then((response) => {
        if (!cancelled) {
          setCheckoutSummary(response.data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCheckoutSummary(localSummary);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cartItems, localSummary]);

  function updateCustomerField(field, value) {
    setCustomerData((currentValue) => {
      const nextValue = {
        ...currentValue,
        [field]: value,
      };

      if (field === "delivery_type") {
        nextValue.province = "";
        nextValue.bm_cargo_branch = "";
      }
      if (field === "province") {
        nextValue.bm_cargo_branch = "";
      }
      if (field === "payment_method" && value !== "transfer") {
        nextValue.transfer_bank = "";
      }

      return nextValue;
    });

    if (field === "payment_method" && value !== "transfer") {
      setReceiptFile(null);
      setCopiedBankKey("");
    }

    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      [field]: "",
      ...(field === "payment_method" ? { transfer_bank: "", transfer_receipt: "" } : {}),
      ...(field === "delivery_type" ? { province: "", bm_cargo_branch: "" } : {}),
      ...(field === "province" ? { bm_cargo_branch: "" } : {}),
    }));
  }

  function handleReceiptChange(event) {
    const file = event.target.files?.[0] || null;
    setReceiptFile(null);
    setFieldErrors((currentErrors) => ({ ...currentErrors, transfer_receipt: "" }));

    if (!file) {
      return;
    }

    const extension = getReceiptExtension(file.name);
    if (!RECEIPT_EXTENSIONS.includes(extension)) {
      setFieldErrors((currentErrors) => ({
        ...currentErrors,
        transfer_receipt: "El comprobante debe ser jpg, jpeg, png, webp o pdf.",
      }));
      return;
    }

    if (file.size > MAX_RECEIPT_SIZE) {
      setFieldErrors((currentErrors) => ({
        ...currentErrors,
        transfer_receipt: "El comprobante no puede exceder 5MB.",
      }));
      return;
    }

    setReceiptFile(file);
  }

  async function handleCopyBankDetail(value, key) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = value;
        textArea.setAttribute("readonly", "");
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }

      setCopiedBankKey(key);
      window.setTimeout(() => setCopiedBankKey(""), 1800);
    } catch {
      setError("No se pudo copiar. Mantén presionado el dato para seleccionarlo manualmente.");
    }
  }

  function validateForm() {
    const errors = {};

    if (!cartItems.length) errors.cart = "Tu carrito está vacío.";
    if (!customerData.delivery_type) errors.delivery_type = "Selecciona un tipo de envío.";
    if (!customerData.customer_name.trim()) errors.customer_name = "El nombre completo es requerido.";
    if (!customerData.customer_cedula.trim()) errors.customer_cedula = "La cédula es requerida.";
    if (!customerData.customer_phone.trim()) errors.customer_phone = "El WhatsApp es requerido.";
    if (!customerData.province.trim()) errors.province = "La provincia es requerida.";
    if (!customerData.municipality_sector.trim()) {
      errors.municipality_sector = "El municipio o sector es requerido.";
    }
    if (!customerData.bm_cargo_branch.trim()) {
      errors.bm_cargo_branch = "Selecciona una sucursal BM Cargo.";
    }
    if (!customerData.payment_method) errors.payment_method = "Selecciona un método de pago.";
    if (customerData.payment_method === "transfer" && !customerData.transfer_bank) {
      errors.transfer_bank = "Selecciona el banco donde harás la transferencia.";
    }
    if (customerData.payment_method === "transfer" && !receiptFile) {
      errors.transfer_receipt = "Debes cargar el comprobante de transferencia.";
    }

    return errors;
  }

  function buildCheckoutFormData() {
    const formData = new FormData();
    Object.entries(customerData).forEach(([key, value]) => {
      formData.append(key, value);
    });
    formData.append("bm_cargo_branch_address", selectedBranchAddress);
    formData.append(
      "items",
      JSON.stringify(
        cartItems.map((item) => ({
          book_id: item.id,
          quantity: item.quantity,
        })),
      ),
    );

    if (receiptFile) {
      formData.append("transfer_receipt", receiptFile);
    }

    return formData;
  }

  async function handleSubmitOrder(event) {
    event.preventDefault();
    const nextErrors = validateForm();

    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      setError(Object.values(nextErrors)[0]);
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setFeedback("");
      setCustomerWhatsappLink("");

      const response = await createOrder(buildCheckoutFormData());

      setOrderConfirmation(response.data);
      setFeedback("Tu orden fue generada correctamente. Te contactaremos por WhatsApp para confirmar el pago y el envío.");
      setCustomerWhatsappLink(response.data.customer_whatsapp_link || "");

      if (response.data.owner_whatsapp_link || response.data.whatsapp_link) {
        window.open(response.data.owner_whatsapp_link || response.data.whatsapp_link, "_blank", "noopener,noreferrer");
      }

      onClearCart();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (orderConfirmation) {
    return (
      <main className="page-shell">
        <section className="container checkout-confirmation">
          <p className="section-label">Confirmación</p>
          <h1>Tu orden fue generada correctamente</h1>
          <p>
            Orden <strong>{orderConfirmation.order_number}</strong>. Te contactaremos por WhatsApp para confirmar el
            pago y el envío.
          </p>

          <div className="confirmation-summary">
            <div>
              <span>Subtotal</span>
              <strong>{formatCurrency(orderConfirmation.subtotal)}</strong>
            </div>
            <div>
              <span>Envío</span>
              <strong>{formatCurrency(orderConfirmation.shipping_cost)}</strong>
            </div>
            <div>
              <span>Total final</span>
              <strong>{formatCurrency(orderConfirmation.total)}</strong>
            </div>
          </div>

          {feedback ? <p className="checkout-success">{feedback}</p> : null}

          <div className="checkout-confirmation-actions">
            {orderConfirmation.owner_whatsapp_link || orderConfirmation.whatsapp_link ? (
              <button
                type="button"
                className="primary-button"
                onClick={() =>
                  window.open(
                    orderConfirmation.owner_whatsapp_link || orderConfirmation.whatsapp_link,
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
              >
                Abrir WhatsApp del negocio
              </button>
            ) : null}
            {customerWhatsappLink ? (
              <button
                type="button"
                className="secondary-button"
                onClick={() => window.open(customerWhatsappLink, "_blank", "noopener,noreferrer")}
              >
                Abrir seguimiento del cliente
              </button>
            ) : null}
            <button type="button" className="secondary-button" onClick={onBack}>
              Seguir comprando
            </button>
          </div>
        </section>
        <Footer onNavigate={onNavigate} />
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="container cart-page">
        <div className="cart-page-header">
          <div>
            <p className="section-label">Checkout</p>
            <h1>Finaliza tu pedido</h1>
          </div>
          <button type="button" className="nav-link" onClick={onBack}>
            Seguir comprando
          </button>
        </div>

        {cartItems.length === 0 ? (
          <div className="status-box">
            Tu carrito está vacío. Vuelve al catálogo y agrega algunos libros.
          </div>
        ) : (
          <div className="cart-layout checkout-layout">
            <div className="checkout-guide" aria-label="Progreso del checkout">
              <div>
                <p className="checkout-kicker">Compra segura</p>
                <h2>Finaliza tu pedido sin complicarte</h2>
                <p>
                  Primero revisa tus libros, luego elige la sucursal BM Cargo y por ultimo confirma el metodo de pago.
                </p>
              </div>
              <ol className="checkout-progress-list">
                {checkoutProgress.map((step, index) => (
                  <li key={step.label} className={step.done ? "is-done" : ""}>
                    <span>{index + 1}</span>
                    {step.label}
                  </li>
                ))}
              </ol>
            </div>

            <section className="cart-list">
              <div className="checkout-section">
                <CheckoutStepTitle
                  number="1"
                  label="Tu pedido"
                  title="Libros seleccionados"
                  copy="Confirma cantidades y combos antes de completar tus datos."
                />
              </div>

              {promoPairs.length ? (
                <div className="cart-promo-pairs">
                  {promoPairs.map((pair) => (
                    <div key={pair.key} className="cart-promo-pair">
                      <span>Combo 2x1</span>
                      <strong>
                        {pair.first.titulo} + {pair.partner.titulo}
                      </strong>
                      <small>
                        {pair.pairs} par{pair.pairs > 1 ? "es" : ""} enlazado{pair.pairs > 1 ? "s" : ""}
                      </small>
                    </div>
                  ))}
                </div>
              ) : null}

              {cartItems.map((item) => (
                <article className="cart-line" key={item.id}>
                  <img
                    src={item.imagen || "https://placehold.co/120x160/e6dccd/5e4632?text=Libro"}
                    alt=""
                    className="cart-line-thumb"
                  />
                  <div className="cart-line-copy">
                    <h3>{item.titulo}</h3>
                    <p>{item.autor}</p>
                    <span>
                      {formatCurrency(item.oferta && item.precio_oferta ? item.precio_oferta : item.precio)} por unidad
                    </span>
                    {item.promo_2x1 ? (
                      <span className="cart-promo-note">
                        2x1 con {item.promo_2x1_partner_title || "libro enlazado"}
                      </span>
                    ) : null}
                  </div>

                  <div className="cart-line-controls">
                    <div className="quantity-stepper">
                      <button type="button" onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}>
                        -
                      </button>
                      <span>{item.quantity}</span>
                      <button type="button" onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}>
                        +
                      </button>
                    </div>
                    <button type="button" className="text-button" onClick={() => onRemoveItem(item.id)}>
                      Eliminar
                    </button>
                  </div>
                </article>
              ))}
            </section>

            <aside className="checkout-card">
              <form className="checkout-form" onSubmit={handleSubmitOrder}>
                <section className="checkout-section">
                  <CheckoutStepTitle
                    number="2"
                    label="Entrega"
                    title="Donde retiraras tu pedido"
                    copy="El costo se calcula segun Santo Domingo o el resto del pais."
                  />
                  <div className="checkout-choice-grid">
                    <button
                      type="button"
                      className={`checkout-choice ${customerData.delivery_type === "local" ? "is-selected" : ""}`}
                      onClick={() => updateCustomerField("delivery_type", "local")}
                    >
                      <strong>Santo Domingo / Distrito Nacional</strong>
                      <span>Envío RD$250</span>
                    </button>
                    <button
                      type="button"
                      className={`checkout-choice ${customerData.delivery_type === "province" ? "is-selected" : ""}`}
                      onClick={() => updateCustomerField("delivery_type", "province")}
                    >
                      <strong>Otras provincias</strong>
                      <span>Retiro BM Cargo RD$300</span>
                    </button>
                  </div>
                  {fieldErrors.delivery_type ? <p className="field-error">{fieldErrors.delivery_type}</p> : null}
                </section>

                <section className="checkout-section">
                  <CheckoutStepTitle
                    number="3"
                    label="Datos"
                    title="Informacion de contacto"
                    copy="Usaremos estos datos para confirmar el pedido y enviarte la direccion exacta de retiro."
                  />
                  <div className="checkout-grid">
                    <label className="checkout-field">
                      <span>Nombre completo</span>
                      <input
                        type="text"
                        value={customerData.customer_name}
                        onChange={(event) => updateCustomerField("customer_name", event.target.value)}
                        required
                      />
                      {fieldErrors.customer_name ? <small className="field-error">{fieldErrors.customer_name}</small> : null}
                    </label>

                    <label className="checkout-field">
                      <span>Cédula</span>
                      <input
                        type="text"
                        value={customerData.customer_cedula}
                        onChange={(event) => updateCustomerField("customer_cedula", event.target.value)}
                        required
                      />
                      {fieldErrors.customer_cedula ? (
                        <small className="field-error">{fieldErrors.customer_cedula}</small>
                      ) : null}
                    </label>

                    <label className="checkout-field">
                      <span>WhatsApp</span>
                      <input
                        type="tel"
                        value={customerData.customer_phone}
                        onChange={(event) => updateCustomerField("customer_phone", event.target.value)}
                        required
                      />
                      {fieldErrors.customer_phone ? (
                        <small className="field-error">{fieldErrors.customer_phone}</small>
                      ) : null}
                    </label>

                    <label className="checkout-field">
                      <span>Correo opcional</span>
                      <input
                        type="email"
                        value={customerData.customer_email}
                        onChange={(event) => updateCustomerField("customer_email", event.target.value)}
                      />
                    </label>

                    <label className="checkout-field">
                      <span>Provincia</span>
                      <select
                        value={customerData.province}
                        onChange={(event) => updateCustomerField("province", event.target.value)}
                        disabled={!customerData.delivery_type}
                        required
                      >
                        <option value="">Selecciona una provincia</option>
                        {provinceOptions.map((province) => (
                          <option key={province} value={province}>
                            {province}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.province ? <small className="field-error">{fieldErrors.province}</small> : null}
                    </label>

                    <label className="checkout-field">
                      <span>Municipio / sector</span>
                      <input
                        type="text"
                        value={customerData.municipality_sector}
                        onChange={(event) => updateCustomerField("municipality_sector", event.target.value)}
                        required
                      />
                      {fieldErrors.municipality_sector ? (
                        <small className="field-error">{fieldErrors.municipality_sector}</small>
                      ) : null}
                    </label>
                  </div>

                  <label className="checkout-field">
                    <span>Sucursal BM Cargo para retiro</span>
                    <select
                      value={customerData.bm_cargo_branch}
                      onChange={(event) => updateCustomerField("bm_cargo_branch", event.target.value)}
                      disabled={!customerData.province}
                      required
                    >
                      <option value="">Selecciona una sucursal</option>
                      {branchOptions.map((branch) => (
                        <option key={branch} value={branch}>
                          {branch}
                        </option>
                      ))}
                    </select>
                    {customerData.province && !hasDirectBranches ? (
                      <small className="field-hint">
                        No encontramos una sucursal BM Cargo directa para esta provincia. Selecciona la sucursal más
                        cercana disponible.
                      </small>
                    ) : null}
                    {selectedBranchAddress ? (
                      <small className="branch-address-preview">
                        Dirección de retiro: {selectedBranchAddress}
                      </small>
                    ) : null}
                    {fieldErrors.bm_cargo_branch ? (
                      <small className="field-error">{fieldErrors.bm_cargo_branch}</small>
                    ) : null}
                  </label>

                  <label className="checkout-field">
                    <span>Nota adicional opcional</span>
                    <textarea
                      rows="3"
                      value={customerData.delivery_note}
                      onChange={(event) => updateCustomerField("delivery_note", event.target.value)}
                      placeholder="Ej. horario preferido, referencia o detalle útil"
                    />
                  </label>
                </section>

                <section className="checkout-section">
                  <CheckoutStepTitle
                    number="4"
                    label="Pago"
                    title="Elige como quieres pagar"
                    copy="No pedimos datos de tarjeta en la web; el pago se confirma por comprobante o WhatsApp."
                  />
                  <div className="checkout-choice-grid">
                    <button
                      type="button"
                      className={`checkout-choice ${customerData.payment_method === "transfer" ? "is-selected" : ""}`}
                      onClick={() => updateCustomerField("payment_method", "transfer")}
                    >
                      <strong>Transferencia bancaria</strong>
                      <span>Carga tu comprobante</span>
                    </button>
                    <button
                      type="button"
                      className={`checkout-choice ${
                        customerData.payment_method === "card_whatsapp" ? "is-selected" : ""
                      }`}
                      onClick={() => updateCustomerField("payment_method", "card_whatsapp")}
                    >
                      <strong>Tarjeta / WhatsApp</strong>
                      <span>Pago coordinado seguro</span>
                    </button>
                  </div>
                  {fieldErrors.payment_method ? <p className="field-error">{fieldErrors.payment_method}</p> : null}

                  {customerData.payment_method === "transfer" ? (
                    <div className="bank-box">
                      <div className="bank-box-header">
                        <div>
                          <p>Elige el banco para transferir</p>
                          <small>Selecciona Banreservas o Popular y copia solo los datos necesarios.</small>
                        </div>
                      </div>

                      <div className="checkout-choice-grid bank-choice-grid">
                        {BANK_TRANSFER_ACCOUNTS.map((bank) => (
                          <button
                            type="button"
                            key={bank.key}
                            className={`checkout-choice bank-choice ${
                              customerData.transfer_bank === bank.key ? "is-selected" : ""
                            }`}
                            onClick={() => updateCustomerField("transfer_bank", bank.key)}
                          >
                            <strong>{bank.label}</strong>
                            <span>{bank.subtitle}</span>
                          </button>
                        ))}
                      </div>
                      {fieldErrors.transfer_bank ? <p className="field-error">{fieldErrors.transfer_bank}</p> : null}

                      {selectedTransferBank ? (
                        <dl className="bank-detail-list">
                          {selectedTransferBank.details.map((detail) => {
                            const copiedKey = `${selectedTransferBank.key}-${detail.key}`;

                            return (
                              <div
                                key={detail.key}
                                className={`bank-detail-row ${detail.copyable ? "is-copyable" : ""}`}
                              >
                                <dt>{detail.label}</dt>
                                <dd>
                                  <span className="bank-copy-value">{detail.value}</span>
                                  {detail.copyable ? (
                                    <button
                                      type="button"
                                      className="bank-copy-button"
                                      onClick={() => handleCopyBankDetail(detail.value, copiedKey)}
                                    >
                                      {copiedBankKey === copiedKey ? "Copiado" : "Copiar"}
                                    </button>
                                  ) : null}
                                </dd>
                              </div>
                            );
                          })}
                        </dl>
                      ) : (
                        <p className="bank-empty-hint">Selecciona un banco para ver los datos de transferencia.</p>
                      )}

                      <label className="checkout-field">
                        <span>Comprobante de transferencia</span>
                        <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={handleReceiptChange} />
                        <small className="field-hint">Acepta jpg, jpeg, png, webp o pdf. Máximo 5MB.</small>
                        {receiptFile ? <small className="field-hint">Archivo listo: {receiptFile.name}</small> : null}
                        {fieldErrors.transfer_receipt ? (
                          <small className="field-error">{fieldErrors.transfer_receipt}</small>
                        ) : null}
                      </label>
                    </div>
                  ) : null}

                  {customerData.payment_method === "card_whatsapp" ? (
                    <p className="payment-info">
                      El pago con tarjeta será coordinado por WhatsApp. Al enviar tu orden, nuestro equipo te contactará
                      para completar el pago de forma segura.
                    </p>
                  ) : null}
                </section>

                <section className="checkout-section">
                  <CheckoutStepTitle
                    number="5"
                    label="Total"
                    title="Resumen final"
                    copy="Revisa el total antes de enviar. Si hay 2x1, el descuento aparece aqui."
                  />
                  <div className="summary-row">
                    <span>Libros</span>
                    <strong>{summary.total_units || 0}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Subtotal de productos</span>
                    <strong>{formatCurrency(summary.subtotal)}</strong>
                  </div>
                  {Number(summary.promo_discount_amount || 0) > 0 ? (
                    <div className="summary-row discount-row">
                      <span>Promo 2x1</span>
                      <strong>-{formatCurrency(summary.promo_discount_amount)}</strong>
                    </div>
                  ) : null}
                  {Number(summary.discount_amount || 0) > 0 ? (
                    <div className="summary-row discount-row">
                      <span>Descuento {Math.round(Number(summary.discount_rate || 0) * 100)}%</span>
                      <strong>-{formatCurrency(summary.discount_amount)}</strong>
                    </div>
                  ) : null}
                  {summary.promotions?.length ? (
                    <div className="checkout-promo-list">
                      {summary.promotions.map((promotion) => (
                        <span key={promotion.label}>{promotion.label}</span>
                      ))}
                    </div>
                  ) : null}
                  <div className="summary-row">
                    <span>Costo de envío</span>
                    <strong>{formatCurrency(shippingCost)}</strong>
                  </div>
                  <div className="summary-row summary-total-row">
                    <span>Total final</span>
                    <strong>{formatCurrency(finalTotal)}</strong>
                  </div>
                </section>

                {error ? <p className="checkout-error">{error}</p> : null}
                {!isFormReady ? (
                  <p className="checkout-note compact-note">Completa los campos obligatorios para activar el pedido.</p>
                ) : null}

                <div className="checkout-submit-bar">
                  <div className="checkout-submit-copy">
                    <span>Total final</span>
                    <strong>{formatCurrency(finalTotal)}</strong>
                  </div>
                  <button type="submit" className="primary-button checkout-submit-button" disabled={!isFormReady}>
                    {submitting ? "Procesando..." : "Finalizar pedido"}
                  </button>
                </div>
              </form>

              <div className="checkout-secondary-actions">
                <button type="button" className="secondary-button" onClick={onClearCart}>
                  Vaciar carrito
                </button>
                <button type="button" className="secondary-button" onClick={() => onNavigate("politicas")}>
                  Ver políticas
                </button>
              </div>
            </aside>
          </div>
        )}
      </section>
      <Footer onNavigate={onNavigate} />
    </main>
  );
}

export default Cart;
