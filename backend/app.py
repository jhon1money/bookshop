import os
from flask import Flask, render_template, redirect, url_for, request, session, jsonify
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import LoginManager, login_user, login_required, logout_user
from config import Config
from models import db, Book, Order, OrderItem, Admin, Category

app = Flask(__name__)
app.config.from_object(Config)

app.secret_key = app.config.get("SECRET_KEY", "supersecretkey")

db.init_app(app)


login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "login"


# =========================
# LOGIN MANAGER
# =========================
@login_manager.user_loader
def load_user(user_id):
    return db.session.get(Admin, int(user_id))


# =========================
# HOME
# =========================
@app.route("/")
def index():

    search = request.args.get("search")
    category = request.args.get("category")
    ofertas = request.args.get("ofertas")

    query = Book.query

    if search:
        query = query.filter(
            (Book.titulo.contains(search)) |
            (Book.autor.contains(search))
        )

    if category:
        query = query.filter(Book.category_id == int(category))

    if ofertas:
        query = query.filter(Book.oferta == True)

    books = query.all()
    categories = Category.query.all()

    return render_template(
        "index.html",
        books=books,
        categories=categories
    )


# =========================
# API LIBROS
# =========================
@app.route("/api/books")
def api_books():

    search = request.args.get("search")
    category = request.args.get("category")
    ofertas = request.args.get("ofertas")

    query = Book.query

    if search:
        query = query.filter(
            (Book.titulo.contains(search)) |
            (Book.autor.contains(search))
        )

    if category:
        query = query.filter(Book.category_id == int(category))

    if ofertas:
        query = query.filter(Book.oferta == True)

    books = query.all()

    books_data = []

    for book in books:
        books_data.append({
            "id": book.id,
            "titulo": book.titulo,
            "autor": book.autor,
            "precio": book.precio,
            "precio_oferta": book.precio_oferta,
            "imagen": book.imagen,
            "oferta": book.oferta,
            "stock": book.stock
        })

    return jsonify(books_data)


# =========================
# LOGIN
# =========================
@app.route("/login", methods=["GET", "POST"])
def login():

    if request.method == "POST":

        username = request.form["username"]
        password = request.form["password"]

        admin = Admin.query.filter_by(username=username).first()

        if admin and check_password_hash(admin.password, password):
            login_user(admin)
            return redirect(url_for("dashboard"))

    return render_template("login.html")


@app.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("index"))


# =========================
# DASHBOARD
# =========================
@app.route("/dashboard")
@login_required
def dashboard():

    books = Book.query.all()

    return render_template(
        "dashboard.html",
        books=books
    )


@app.route("/orders")
@login_required
def orders():

    orders = Order.query.order_by(Order.date.desc()).all()

    return render_template(
        "orders.html",
        orders=orders
    )


# =========================
# CATEGORIAS
# =========================
@app.route("/add_category", methods=["GET", "POST"])
@login_required
def add_category():

    if request.method == "POST":

        nombre = request.form["nombre"]

        existing = Category.query.filter_by(nombre=nombre).first()

        if not existing:
            category = Category(nombre=nombre)
            db.session.add(category)
            db.session.commit()

        return redirect(url_for("add_category"))

    categories = Category.query.all()

    return render_template(
        "add_category.html",
        categories=categories
    )


@app.route("/delete_category/<int:id>", methods=["POST"])
@login_required
def delete_category(id):

    category = Category.query.get_or_404(id)

    db.session.delete(category)
    db.session.commit()

    return redirect(url_for("add_category"))


# =========================
# LIBROS
# =========================
@app.route("/add_book", methods=["GET", "POST"])
@login_required
def add_book():

    categories = Category.query.all()

    if request.method == "POST":

        titulo = request.form["titulo"]
        autor = request.form["autor"]
        precio = float(request.form["precio"])
        descripcion = request.form["descripcion"]
        stock = int(request.form["stock"])
        category_id = request.form.get("category_id")

        oferta = "oferta" in request.form

        precio_oferta = request.form.get("precio_oferta")

        if precio_oferta:
            precio_oferta = float(precio_oferta)
        else:
            precio_oferta = None

        imagen_url = request.form.get("imagen_url")
        imagen_file = request.files.get("imagen_file")

        imagen_path = None

        if imagen_file and imagen_file.filename != "":
            filename = secure_filename(imagen_file.filename)
            path = os.path.join("static/images", filename)
            imagen_file.save(path)
            imagen_path = path

        elif imagen_url:
            imagen_path = imagen_url

        book = Book(
            titulo=titulo,
            autor=autor,
            precio=precio,
            precio_oferta=precio_oferta,
            descripcion=descripcion,
            stock=stock,
            imagen=imagen_path,
            oferta=oferta,
            category_id=int(category_id) if category_id else None
        )

        db.session.add(book)
        db.session.commit()

        return redirect(url_for("dashboard"))

    return render_template(
        "add_book.html",
        categories=categories
    )


@app.route("/edit_book/<int:id>", methods=["GET", "POST"])
@login_required
def edit_book(id):

    book = Book.query.get_or_404(id)

    if request.method == "POST":

        book.titulo = request.form["titulo"]
        book.autor = request.form["autor"]
        book.precio = float(request.form["precio"])
        book.descripcion = request.form["descripcion"]
        book.stock = int(request.form["stock"])

        db.session.commit()

        return redirect(url_for("dashboard"))

    return render_template(
        "edit_book.html",
        book=book
    )


@app.route("/delete_book/<int:id>")
@login_required
def delete_book(id):

    book = Book.query.get_or_404(id)

    db.session.delete(book)
    db.session.commit()

    return redirect(url_for("dashboard"))


# =========================
# CARRITO
# =========================
@app.route("/add_to_cart/<int:book_id>", methods=["POST"])
def add_to_cart(book_id):

    book = db.session.get(Book, book_id)

    if not book or book.stock <= 0:
        return "Producto agotado"

    if "cart" not in session:
        session["cart"] = {}

    cart = session["cart"]

    quantity = cart.get(str(book_id), 0)

    if quantity + 1 > book.stock:
        return f"No hay más stock disponible de {book.titulo}"

    cart[str(book_id)] = quantity + 1
    session["cart"] = cart

    return redirect(url_for("index"))


@app.route("/cart")
def cart():

    cart = session.get("cart", {})

    books = []
    total = 0

    for book_id, quantity in cart.items():

        book = db.session.get(Book, int(book_id))

        if book:

            price = book.precio_oferta if book.oferta and book.precio_oferta else book.precio

            subtotal = price * quantity

            total += subtotal

            books.append({
                "book": book,
                "quantity": quantity,
                "subtotal": subtotal
            })

    return render_template(
        "cart.html",
        books=books,
        total=total
    )


# =========================
# START APP
# =========================
if __name__ == "__main__":

    with app.app_context():
        db.create_all()

    app.run(debug=True)