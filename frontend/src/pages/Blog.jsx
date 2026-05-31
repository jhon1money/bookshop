import { useCallback, useEffect, useState } from "react";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import {
  createBlogComment,
  createBlogPost,
  getBlogPosts,
  validateBlogOrder,
} from "../services/api";
import usePageMeta from "../hooks/usePageMeta";

const EMPTY_POST_FORM = {
  order_number: "",
  author_name: "",
  title: "",
  body: "",
};

function formatBlogDate(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("es-DO", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function Blog({ cartItems, onOpenCart, onNavigate, onBrandReset }) {
  const [posts, setPosts] = useState([]);
  const [postForm, setPostForm] = useState(EMPTY_POST_FORM);
  const [commentForms, setCommentForms] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [validationState, setValidationState] = useState("");

  usePageMeta({
    title: "Blog de lectores",
    description:
      "Lee recomendaciones de clientes de Librería SJ y participa usando un número de orden válido.",
    keywords: "blog de libros, reseñas de lectores, recomendaciones de libros, Librería SJ",
    canonicalPath: "/blog",
  });

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getBlogPosts();
      setPosts(response.data || []);
    } catch (loadError) {
      setError(loadError.message || "No se cargó el blog.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  async function handleValidateOrder() {
    try {
      setValidationState("validating");
      setError("");
      const response = await validateBlogOrder({ order_number: postForm.order_number });
      setValidationState("valid");
      setFeedback(`Orden ${response.data.order_number} validada.`);
      if (!postForm.author_name && response.data.customer_name) {
        setPostForm((currentValue) => ({
          ...currentValue,
          author_name: response.data.customer_name,
        }));
      }
    } catch (validationError) {
      setValidationState("invalid");
      setFeedback("");
      setError(validationError.message);
    }
  }

  async function handleCreatePost(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setFeedback("");

    try {
      await createBlogPost(postForm);
      setPostForm(EMPTY_POST_FORM);
      setValidationState("");
      setFeedback("Publicación creada.");
      await loadPosts();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateComment(event, postId) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setFeedback("");

    const form = commentForms[postId] || {};

    try {
      await createBlogComment(postId, form);
      setCommentForms((currentValue) => ({
        ...currentValue,
        [postId]: { order_number: "", author_name: "", body: "" },
      }));
      setFeedback("Comentario agregado.");
      await loadPosts();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  function updateCommentForm(postId, field, value) {
    setCommentForms((currentValue) => ({
      ...currentValue,
      [postId]: {
        order_number: "",
        author_name: "",
        body: "",
        ...(currentValue[postId] || {}),
        [field]: value,
      },
    }));
  }

  return (
    <main className="page-shell">
      <Navbar
        cartItems={cartItems}
        onOpenCart={onOpenCart}
        onNavigate={onNavigate}
        onBrandReset={onBrandReset}
        activeView="blog"
      />

      <section className="container blog-shell">
        <article className="blog-hero">
          <p className="section-label">Blog de lectores</p>
          <h1>Opiniones reales de quienes ya compraron</h1>
          <p className="hero-copy">
            Para publicar o comentar pedimos un número de orden válido. Así mantenemos una comunidad
            confiable, útil y enfocada en lectores reales.
          </p>
        </article>

        <section className="blog-layout">
          <form className="blog-form-panel" onSubmit={handleCreatePost}>
            <div className="admin-section-heading">
              <div>
                <p className="section-label">Participa</p>
                <h2>Publica una recomendación</h2>
              </div>
            </div>

            <div className="blog-order-check">
              <label className="checkout-field">
                <span>Número de orden</span>
                <input
                  type="text"
                  value={postForm.order_number}
                  onChange={(event) =>
                    setPostForm((currentValue) => ({
                      ...currentValue,
                      order_number: event.target.value,
                    }))
                  }
                  placeholder="Ej. BS-20260530-00001"
                  required
                />
              </label>
              <button
                type="button"
                className="secondary-button"
                onClick={handleValidateOrder}
                disabled={validationState === "validating" || !postForm.order_number}
              >
                {validationState === "validating" ? "Validando..." : "Validar orden"}
              </button>
            </div>

            <label className="checkout-field">
              <span>Nombre</span>
              <input
                type="text"
                value={postForm.author_name}
                onChange={(event) =>
                  setPostForm((currentValue) => ({
                    ...currentValue,
                    author_name: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label className="checkout-field">
              <span>Título</span>
              <input
                type="text"
                value={postForm.title}
                onChange={(event) =>
                  setPostForm((currentValue) => ({
                    ...currentValue,
                    title: event.target.value,
                  }))
                }
                placeholder="Qué libro recomendarías y por qué"
                required
              />
            </label>

            <label className="checkout-field">
              <span>Comentario principal</span>
              <textarea
                rows="5"
                value={postForm.body}
                onChange={(event) =>
                  setPostForm((currentValue) => ({
                    ...currentValue,
                    body: event.target.value,
                  }))
                }
                required
              />
            </label>

            <button type="submit" className="primary-button" disabled={submitting}>
              {submitting ? "Publicando..." : "Publicar en el blog"}
            </button>
          </form>

          <section className="blog-feed" aria-live="polite">
            {loading ? <p className="status-box">Cargando publicaciones...</p> : null}
            {error ? <p className="status-box error-box">{error}</p> : null}
            {feedback ? <p className="status-box success-box">{feedback}</p> : null}

            {!loading && posts.length === 0 ? (
              <p className="status-box">
                Aún no hay publicaciones. Sé la primera persona en recomendar una lectura.
              </p>
            ) : null}

            {posts.map((post) => {
              const form = commentForms[post.id] || { order_number: "", author_name: "", body: "" };

              return (
                <article key={post.id} className="blog-post-card">
                  <header>
                    <p className="section-label">Compra verificada</p>
                    <h2>{post.title}</h2>
                    <span>
                      {post.author_name} · {formatBlogDate(post.created_at)}
                    </span>
                  </header>
                  <p>{post.body}</p>

                  <div className="blog-comments">
                    <h3>{post.comments.length} comentarios</h3>
                    {post.comments.map((comment) => (
                      <article key={comment.id} className="blog-comment">
                        <strong>{comment.author_name}</strong>
                        <span>{formatBlogDate(comment.created_at)}</span>
                        <p>{comment.body}</p>
                      </article>
                    ))}
                  </div>

                  <form className="blog-comment-form" onSubmit={(event) => handleCreateComment(event, post.id)}>
                    <label className="checkout-field">
                      <span>Orden</span>
                      <input
                        type="text"
                        value={form.order_number}
                        onChange={(event) => updateCommentForm(post.id, "order_number", event.target.value)}
                        required
                      />
                    </label>
                    <label className="checkout-field">
                      <span>Nombre</span>
                      <input
                        type="text"
                        value={form.author_name}
                        onChange={(event) => updateCommentForm(post.id, "author_name", event.target.value)}
                        required
                      />
                    </label>
                    <label className="checkout-field blog-comment-text">
                      <span>Comentario</span>
                      <input
                        type="text"
                        value={form.body}
                        onChange={(event) => updateCommentForm(post.id, "body", event.target.value)}
                        required
                      />
                    </label>
                    <button type="submit" className="secondary-button" disabled={submitting}>
                      Comentar
                    </button>
                  </form>
                </article>
              );
            })}
          </section>
        </section>
      </section>

      <Footer onNavigate={onNavigate} />
    </main>
  );
}

export default Blog;
