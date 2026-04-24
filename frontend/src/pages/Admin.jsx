function Admin({ onBack }) {
  return (
    <main className="page-shell">
      <section className="container admin-panel">
        <div className="cart-page-header">
          <div>
            <p className="section-label">Administracion</p>
            <h1>Panel admin</h1>
          </div>
          <button type="button" className="nav-link" onClick={onBack}>
            Volver al catalogo
          </button>
        </div>

        <div className="status-box">
          El backend ya soporta login y CRUD de libros. El siguiente paso aqui es conectar el
          formulario de acceso y la gestion de productos.
        </div>
      </section>
    </main>
  );
}

export default Admin;
