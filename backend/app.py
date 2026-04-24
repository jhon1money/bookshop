import datetime
import jwt
from functools import wraps

from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import check_password_hash

from config import Config
from models import db, Book, Order, OrderItem, Admin, Category


app = Flask(__name__)
app.config.from_object(Config)
app.config["JWT_SECRET"] = app.config.get("SECRET_KEY", "supersecretkey")

db.init_app(app)

# Permite requests desde tu frontend en Vite
CORS(app, resources={r"/api/*": {"origins": "*"}})


# =========================
# HELPERS
# =========================
def json_response(code, error, message, data=None):
    response = {
        "code": code,
        "error": error,
        "message": message,
    }
    if data is not None:
        response["data"] = data
    return jsonify(response), code


# =========================
# JWT FUNCTIONS
# =========================
def generate_token(admin):
    payload = {
        "id": admin.id,
        "username": admin.username,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=3),
    }
    return jwt.encode(payload, app.config["JWT_SECRET"], algorithm="HS256")


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "").strip()

        if not auth_header:
            return json_response(401, True, "Token is missing")

        parts = auth_header.split()

        if len(parts) != 2 or parts[0] != "Bearer":
            return json_response(401, True, "Invalid authorization format")

        token = parts[1]

        try:
            data = jwt.decode(token, app.config["JWT_SECRET"], algorithms=["HS256"])
            current_user = db.session.get(Admin, data["id"])

            if not current_user:
                return json_response(401, True, "User not found for this token")

        except jwt.ExpiredSignatureError:
            return json_response(401, True, "Token has expired")
        except jwt.InvalidTokenError:
            return json_response(401, True, "Token is invalid")
        except Exception:
            return json_response(401, True, "Token is invalid")

        return f(current_user, *args, **kwargs)

    return decorated


# =========================
# AUTH
# =========================
@app.route("/api/login", methods=["POST"])
def login():
    try:
        data = request.get_json() or {}

        username = data.get("username", "").strip()
        password = data.get("password", "").strip()

        if not username or not password:
            return json_response(400, True, "Username and password are required")

        admin = Admin.query.filter_by(username=username).first()

        if not admin:
            return json_response(404, True, "User not found")

        if not check_password_hash(admin.password, password):
            return json_response(401, True, "Invalid credentials")

        token = generate_token(admin)

        return json_response(
            200,
            False,
            "Login successful",
            {
                "token": token,
                "user": {
                    "id": admin.id,
                    "username": admin.username,
                },
            },
        )

    except Exception as e:
        return json_response(500, True, str(e))


# =========================
# BOOKS
# =========================
@app.route("/api/books", methods=["GET"])
def get_books():
    try:
        search = request.args.get("search", "").strip()
        category = request.args.get("category", "").strip()
        ofertas = request.args.get("ofertas", "").strip().lower()

        query = Book.query

        if search:
            query = query.filter(
                (Book.titulo.contains(search)) |
                (Book.autor.contains(search))
            )

        if category:
            if not category.isdigit():
                return json_response(400, True, "Category must be a valid integer")
            query = query.filter(Book.category_id == int(category))

        if ofertas in ["true", "1", "yes"]:
            query = query.filter(Book.oferta.is_(True))

        books = query.all()

        return json_response(
            200,
            False,
            "Books fetched successfully",
            [
                {
                    "id": b.id,
                    "titulo": b.titulo,
                    "autor": b.autor,
                    "precio": b.precio,
                    "descripcion": b.descripcion,
                    "precio_oferta": b.precio_oferta,
                    "imagen": b.imagen,
                    "oferta": b.oferta,
                    "stock": b.stock,
                    "category_id": b.category_id,
                }
                for b in books
            ],
        )

    except Exception as e:
        return json_response(500, True, str(e))


@app.route("/api/books", methods=["POST"])
@token_required
def add_book(current_user):
    try:
        data = request.get_json() or {}

        required_fields = ["titulo", "autor", "precio", "stock"]
        missing_fields = [field for field in required_fields if field not in data or data[field] in [None, ""]]

        if missing_fields:
            return json_response(400, True, f"Missing fields: {', '.join(missing_fields)}")

        category_id = data.get("category_id")
        if category_id is not None:
            category = db.session.get(Category, category_id)
            if not category:
                return json_response(404, True, "Category not found")

        book = Book(
            titulo=data["titulo"],
            autor=data["autor"],
            precio=float(data["precio"]),
            descripcion=data.get("descripcion"),
            stock=int(data["stock"]),
            category_id=category_id,
            oferta=bool(data.get("oferta", False)),
            precio_oferta=float(data["precio_oferta"]) if data.get("precio_oferta") not in [None, ""] else None,
            imagen=data.get("imagen"),
        )

        db.session.add(book)
        db.session.commit()

        return json_response(
            201,
            False,
            "Book created",
            {
                "id": book.id,
                "titulo": book.titulo,
            },
        )

    except ValueError:
        return json_response(400, True, "Invalid numeric values for precio, stock, or precio_oferta")
    except Exception as e:
        db.session.rollback()
        return json_response(500, True, str(e))


@app.route("/api/books/<int:id>", methods=["PUT"])
@token_required
def update_book(current_user, id):
    try:
        book = Book.query.get_or_404(id)
        data = request.get_json() or {}

        if "titulo" in data:
            book.titulo = data["titulo"]

        if "autor" in data:
            book.autor = data["autor"]

        if "precio" in data:
            book.precio = float(data["precio"])

        if "descripcion" in data:
            book.descripcion = data["descripcion"]

        if "stock" in data:
            book.stock = int(data["stock"])

        if "category_id" in data:
            category_id = data["category_id"]
            if category_id is not None:
                category = db.session.get(Category, category_id)
                if not category:
                    return json_response(404, True, "Category not found")
            book.category_id = category_id

        if "oferta" in data:
            book.oferta = bool(data["oferta"])

        if "precio_oferta" in data:
            book.precio_oferta = (
                float(data["precio_oferta"])
                if data["precio_oferta"] not in [None, ""]
                else None
            )

        if "imagen" in data:
            book.imagen = data["imagen"]

        db.session.commit()

        return json_response(200, False, "Book updated")

    except ValueError:
        return json_response(400, True, "Invalid numeric values for precio, stock, or precio_oferta")
    except Exception as e:
        db.session.rollback()
        return json_response(500, True, str(e))


@app.route("/api/books/<int:id>", methods=["DELETE"])
@token_required
def delete_book(current_user, id):
    try:
        book = Book.query.get_or_404(id)

        db.session.delete(book)
        db.session.commit()

        return json_response(200, False, "Book deleted")

    except Exception as e:
        db.session.rollback()
        return json_response(500, True, str(e))


# =========================
# CATEGORIES
# =========================
@app.route("/api/categories", methods=["GET"])
def get_categories():
    try:
        categories = Category.query.all()

        return json_response(
            200,
            False,
            "Categories fetched",
            [
                {
                    "id": c.id,
                    "nombre": c.nombre,
                }
                for c in categories
            ],
        )

    except Exception as e:
        return json_response(500, True, str(e))


@app.route("/api/categories", methods=["POST"])
@token_required
def add_category(current_user):
    try:
        data = request.get_json() or {}
        nombre = data.get("nombre", "").strip()

        if not nombre:
            return json_response(400, True, "Category name is required")

        category = Category(nombre=nombre)

        db.session.add(category)
        db.session.commit()

        return json_response(
            201,
            False,
            "Category created",
            {
                "id": category.id,
                "nombre": category.nombre,
            },
        )

    except Exception as e:
        db.session.rollback()
        return json_response(500, True, str(e))


@app.route("/api/categories/<int:id>", methods=["DELETE"])
@token_required
def delete_category(current_user, id):
    try:
        category = Category.query.get_or_404(id)

        db.session.delete(category)
        db.session.commit()

        return json_response(200, False, "Category deleted")

    except Exception as e:
        db.session.rollback()
        return json_response(500, True, str(e))


# =========================
# START APP
# =========================
if __name__ == "__main__":
    with app.app_context():
        db.create_all()

    app.run(debug=True)
