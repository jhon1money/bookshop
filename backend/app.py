import csv
import datetime
import html
import json
import os
import re
import smtplib
import time
from email.message import EmailMessage
from functools import wraps
from io import StringIO
from urllib.parse import quote, urlparse

import jwt
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from sqlalchemy import inspect, text
from werkzeug.exceptions import HTTPException
from werkzeug.security import check_password_hash
from werkzeug.utils import secure_filename

from config import Config
from models import Admin, BlogComment, BlogPost, Book, Category, Order, OrderItem, SiteSection, db


app = Flask(__name__)
app.config.from_object(Config)
app.config["JWT_SECRET"] = app.config["SECRET_KEY"]

db.init_app(app)
CORS(
    app,
    resources={
        r"/api/*": {
            "origins": app.config.get("CORS_ORIGINS", []),
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "max_age": 600,
        }
    },
    supports_credentials=False,
)

TEXT_CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
HTML_TAG_RE = re.compile(r"<[^>]+>")
ORDER_NUMBER_RE = re.compile(r"^BS-\d{8}-\d{5}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
RATE_LIMIT_BUCKETS = {}
FORMDATA_ENDPOINTS = {"/api/checkout"}
LOCAL_DELIVERY_PROVINCES = {"Distrito Nacional", "Santo Domingo"}
DELIVERY_TYPE_LABELS = {
    "local": "Santo Domingo / Distrito Nacional",
    "province": "Otras provincias",
}
SHIPPING_COSTS = {
    "local": 250,
    "province": 300,
}
PAYMENT_METHOD_LABELS = {
    "transfer": "Transferencia bancaria",
    "card_whatsapp": "Tarjeta / pago coordinado por WhatsApp",
}
PAYMENT_STATUS_LABELS = {
    "pending": "Pendiente",
    "transfer_sent": "Transferencia enviada",
    "confirmed": "Pago confirmado",
    "pending_whatsapp": "Pendiente por WhatsApp",
    "rejected": "Rechazado",
}
ALLOWED_RECEIPT_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "pdf"}
BM_CARGO_BRANCH_ADDRESSES = {
    "Piantini": "Av. Abraham Lincoln, No. 1009, Piantini, Distrito Nacional",
    "Oficina Principal (Piantini)": "Av. Abraham Lincoln, No. 1009, Piantini, Distrito Nacional",
    "Arroyo Hondo": "Doctores Mallén, No. 28 A, Arroyo Hondo, Distrito Nacional",
    "El Millón": "Plaza Roaldi, C/ Guarocuya, Esq. Presa de Valdesia, El Millón, Distrito Nacional",
    "Bella Vista": "Ave. Rómulo Betancourt, No. 491, Plaza Maria Colombina, 1er nivel, Bella Vista, Distrito Nacional",
    "Las Praderas": "Av. Gustavo Mejía Ricart No. 121, Esq. Teodoro Chassériau, Las Praderas, Distrito Nacional",
    "Evaristo Morales": "Calle Paseo de los Locutores, No. 45, Evaristo Morales, Distrito Nacional",
    "Gazcue": "Calle Josefa Perdomo, No. 202, Gazcue, Distrito Nacional",
    "Naco": "Ave. Gustavo Mejía Ricart, No. 7, Naco, Distrito Nacional",
    "Sambil": "Local SM-5, Primer Nivel, con acceso desde la San Martín, Sambil, Distrito Nacional",
    "La Julia / Winston Churchill": "Ave. Jiménez Moya, #51, Plaza Cuvas, Ensanche La Julia, Distrito Nacional",
    "La Julia (Av. Winston Churchill)": "Ave. Jiménez Moya, #51, Plaza Cuvas, Ensanche La Julia, Distrito Nacional",
    "Los Alcarrizos": "Autopista Duarte, Km. 14, Plaza Ferrecentro, Local A, Los Alcarrizos, Santo Domingo",
    "Herrera / Av. Luperón": "Ave. Luperón No. 77, Plaza Mall 77, Local 3 B, Herrera, Santo Domingo Oeste",
    "Herrera (Av. Luperón)": "Ave. Luperón No. 77, Plaza Mall 77, Local 3 B, Herrera, Santo Domingo Oeste",
    "Villa Mella": "Ave. Hermanas Mirabal, No. 328, Plaza Riverside, Local 110, Santo Domingo Norte",
    "Cancino": "Av. Charles de Gaulle, Esq. Gabriela Mistral 68, Santo Domingo Este",
    "Ciudad Juan Bosch": "Avenida Camino Real, esquina Calle Carmen Quidiello de Bosch, Plaza La Marquesa I, 2do piso, Local 87, Ciudad Juan Bosch, Santo Domingo Este",
    "San Isidro": "Autopista Coronel Rafael Tomás Fernández Domínguez (Aut. San Isidro), Plaza Comercial Casa Blanca, 1er nivel, No. 101, Santo Domingo Este",
    "Ensanche Ozama": "Calle Bonaire No. 62, esq. Masonería, Ensanche Ozama, Santo Domingo Este",
    "Los Mina": "Ave. San Vicente de Paúl, No. 52, Estación de combustible Total Aurora, Los Mina, Santo Domingo Este",
    "Boca Chica": "Ave. 20 de Diciembre, No. 16B, Boca Chica",
    "Santiago Jardines Metropolitanos": "Calle 7, No. 22, Jardines Metropolitanos, Santiago",
    "Santiago Gurabo": "Carretera turística KM 6, Plaza Jardín Luperón, Módulo 102, Gurabo, Santiago",
    "Santiago Villa Olga": "Calle Juan Bautista Almonte, #9, Módulo 102, Santiago",
    "Santiago Colinas Mall": "Ave. 27 de Febrero, Colinas Mall Módulo 237, Las Colinas, Santiago",
    "Higüey": "Calle B No. 7, próximo a la Ave. Juan XXIII, Higüey",
    "Bávaro": "Naves San Rafael, Av. Barceló KM. 5, Local 3, Bávaro",
    "Friusa": "Plaza Progreso, Local 104, Friusa, Bávaro",
    "Punta Cana": "Punta Cana Village, Local 60-A, Punta Cana",
    "Cap Cana": "Green Village Plaza, Local No. 11, Cap Cana, Punta Cana",
    "La Romana": "Calle Francisco Richiez, No. 15, Esq. Calle Altagracia, Plaza Galería, Local 2, La Romana",
    "Casa de Campo": "Altos de Chavón, Local I2 (Antigua Esquinita PBO), La Romana",
    "San Cristóbal": "Calle Ramón Matías Mella, No. 3, entre Ave. Constitución y General Cabral, San Cristóbal",
    "Haina": "Calle Guinea, No. 3, Plaza J&J, Local 1-1, Sector Piedra Blanca Norte, Bajos de Haina",
    "La Vega": "Calle Chefito Batista, No. 28, Plaza Wendy, La Vega",
    "Constanza": "Av. Antonio Abud Isaac, No. 102, Local No. 6, Edificio Plaza Carmen, Constanza",
    "Jarabacoa": "Calle Hermanas Mirabal, Plaza Hostal Jarabacoa, Módulo 205, Jarabacoa",
    "Puerto Plata": "Av. Circunvalación Sur (Manolo Tavárez Justo), Plaza Turisol, Local 33-34, Primer Módulo, Puerto Plata",
    "Sosúa": "Carretera Sosúa-Cabarete, Plaza Erick Hauser I, Local 1-B, Sosúa",
    "San Francisco de Macorís": "Ave. Los Mártires, No. 16, San Francisco de Macorís",
    "Baní": "Ave. Presidente Billini, No. 22, Plaza Villar, Local No. 5, Baní",
    "Azua": "Ave. Duarte, No. 25, Azua",
    "Barahona": "Luis Eduardo del Monte, No. 66, Barahona",
    "San Juan de la Maguana": "Pedro J. Heyaime, Plaza Comercial Wao Gallery, Local No. 7-B, San Juan de la Maguana",
    "Nagua": "Francisco Yapor, esq. Enriquillo, Jhay Plaza, Nagua, María Trinidad Sánchez",
    "Cabrera": "Plaza Comercial del Parque, Calle Lorenzo Alvarez esq. Gabriel Acosta, Cabrera, María Trinidad Sánchez",
    "Las Terrenas": "Calle Duarte #141, Plaza Italia, Las Terrenas, Samaná",
    "Bonao": "Calle Padre Billini esq. Luperón, Edificio Samuel Miller, Local #1B, Bonao, Monseñor Nouel",
    "Cotuí": "Calle 27 de Febrero No. 16, Plaza Doña Nena, Local No. 101, Cotuí, Sánchez Ramírez",
    "Moca": "Calle Club de Leones, No. 1, Reparto del Este, Moca",
    "Hato Mayor": "Calle Pedro Guillermo, No. 26, Hato Mayor del Rey",
    "Monte Plata": "Calle Duarte #20, Monte Plata",
    "San Pedro de Macorís": "Ave. Francisco Alberto Caamaño Deñó, Plaza Los Colonos, Local 1-3, San Pedro de Macorís",
}


def json_response(code, error, message, data=None):
    response = {
        "code": code,
        "error": error,
        "message": message,
    }
    if data is not None:
        response["data"] = data
    return jsonify(response), code


def server_error_response(data=None):
    return json_response(500, True, "Ocurrió un error.", data)


def get_client_ip():
    forwarded_for = request.headers.get("X-Forwarded-For", "")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.remote_addr or "unknown"


def rate_limit_key():
    path = request.path
    if path == "/api/login":
        return "login", 8, 300
    if path.startswith("/api/orders") or path == "/api/checkout":
        return "orders", 20, 300
    if path.startswith("/api/blog"):
        return "blog", 24, 300
    if path.startswith("/api/admin") or request.method in {"POST", "PUT", "DELETE"}:
        return "admin_write", 120, 300
    return "general", 240, 300


def check_rate_limit():
    bucket_name, limit, window_seconds = rate_limit_key()
    now = time.monotonic()
    key = (bucket_name, get_client_ip())
    attempts = [
        timestamp
        for timestamp in RATE_LIMIT_BUCKETS.get(key, [])
        if now - timestamp < window_seconds
    ]

    if len(attempts) >= limit:
        RATE_LIMIT_BUCKETS[key] = attempts
        return False

    attempts.append(now)
    RATE_LIMIT_BUCKETS[key] = attempts
    return True


@app.before_request
def security_gate():
    if request.method == "OPTIONS":
        return None

    if request.path.startswith("/api/") and not check_rate_limit():
        return json_response(429, True, "Demasiados intentos. Espera un poco.")

    if request.method in {"POST", "PUT", "PATCH"} and request.path.startswith("/api/"):
        is_checkout_form = (
            request.path in FORMDATA_ENDPOINTS
            and request.content_type
            and request.content_type.startswith(("multipart/form-data", "application/x-www-form-urlencoded"))
        )
        if not request.is_json and not is_checkout_form:
            return json_response(415, True, "Envía datos en formato JSON.")

    return None


@app.after_request
def add_security_headers(response):
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()")
    response.headers.setdefault("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'")
    if request.is_secure or not app.config.get("DEBUG", False):
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    return response


@app.errorhandler(HTTPException)
def handle_http_exception(error):
    messages = {
        400: "Solicitud inválida.",
        404: "Recurso no encontrado.",
        405: "Método no permitido.",
        413: "El contenido enviado es muy grande.",
        415: "Envía datos en formato JSON.",
    }
    return json_response(error.code or 500, True, messages.get(error.code, "Solicitud inválida."))


def get_json_body():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ValueError("Datos inválidos.")
    return data


def reject_html(value):
    if HTML_TAG_RE.search(value or ""):
        raise ValueError("No uses HTML ni scripts.")


def normalize_text(value, field_name, max_length, required=False, min_length=0, allow_newlines=False):
    if value is None:
        value = ""
    if not isinstance(value, str):
        value = str(value)

    cleaned = TEXT_CONTROL_RE.sub("", value).replace("\r\n", "\n").replace("\r", "\n")
    if not allow_newlines:
        cleaned = " ".join(cleaned.split())
    else:
        cleaned = "\n".join(" ".join(line.split()) for line in cleaned.split("\n")).strip()
    cleaned = cleaned.strip()
    reject_html(cleaned)

    if required and not cleaned:
        raise ValueError(f"{field_name} es requerido.")
    if cleaned and len(cleaned) < min_length:
        raise ValueError(f"{field_name} es muy corto.")
    if len(cleaned) > max_length:
        raise ValueError(f"{field_name} es muy largo.")

    return cleaned


def normalize_email(value, required=False):
    email_value = normalize_text(value, "Correo", 150, required=required).lower()
    if email_value and not EMAIL_RE.match(email_value):
        raise ValueError("Correo inválido.")
    return email_value


def normalize_phone(value, required=False):
    phone = normalize_text(value, "Teléfono", 50, required=required)
    if not phone:
        return ""
    digits = "".join(character for character in phone if character.isdigit())
    if len(digits) < 8 or len(digits) > 15:
        raise ValueError("Teléfono inválido.")
    return phone


def parse_non_negative_int(value, field_name, max_value=10000):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field_name} inválido.")
    if parsed < 0 or parsed > max_value:
        raise ValueError(f"{field_name} inválido.")
    return parsed


def parse_positive_int(value, field_name, max_value=20):
    parsed = parse_non_negative_int(value, field_name, max_value=max_value)
    if parsed <= 0:
        raise ValueError(f"{field_name} inválido.")
    return parsed


def parse_money(value, field_name, required=False, max_value=1000000):
    if value in [None, ""]:
        if required:
            raise ValueError(f"{field_name} es requerido.")
        return None
    try:
        parsed = round(float(value), 2)
    except (TypeError, ValueError):
        raise ValueError(f"{field_name} inválido.")
    if parsed < 0 or parsed > max_value:
        raise ValueError(f"{field_name} inválido.")
    return parsed


def normalize_id(value, field_name, required=False):
    if value in [None, ""]:
        if required:
            raise ValueError(f"{field_name} es requerido.")
        return None
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field_name} inválido.")
    if parsed <= 0:
        raise ValueError(f"{field_name} inválido.")
    return parsed


def sanitize_url(value, field_name, max_length=400, allow_relative=True):
    url_value = normalize_text(value, field_name, max_length)
    if not url_value:
        return ""
    parsed = urlparse(url_value)
    if parsed.scheme and parsed.scheme not in {"http", "https"}:
        raise ValueError(f"{field_name} inválido.")
    if not parsed.scheme and not (allow_relative and url_value.startswith("/")):
        raise ValueError(f"{field_name} inválido.")
    if parsed.scheme and not parsed.netloc:
        raise ValueError(f"{field_name} inválido.")
    return url_value


def sanitize_cta_link(value):
    link = normalize_text(value, "CTA link", 200)
    if not link:
        return ""
    parsed = urlparse(link)
    if parsed.scheme and parsed.scheme not in {"http", "https"}:
        raise ValueError("CTA link inválido.")
    if not parsed.scheme and not link.startswith(("/", "#")):
        raise ValueError("CTA link inválido.")
    return link


def escape_csv_value(value):
    text_value = str(value or "")
    if text_value[:1] in {"=", "+", "-", "@"}:
        return f"'{text_value}"
    return text_value


def escape_html(value):
    return html.escape(str(value or ""), quote=True)


def ensure_order_schema():
    inspector = inspect(db.engine)
    existing_columns = {column["name"] for column in inspector.get_columns("order")}
    missing_sql = {
        "order_number": 'ALTER TABLE "order" ADD COLUMN order_number VARCHAR(50)',
        "customer_cedula": 'ALTER TABLE "order" ADD COLUMN customer_cedula VARCHAR(30)',
        "customer_email": 'ALTER TABLE "order" ADD COLUMN customer_email VARCHAR(150)',
        "delivery_type": 'ALTER TABLE "order" ADD COLUMN delivery_type VARCHAR(50)',
        "province": 'ALTER TABLE "order" ADD COLUMN province VARCHAR(100)',
        "municipality_sector": 'ALTER TABLE "order" ADD COLUMN municipality_sector VARCHAR(150)',
        "bm_cargo_branch": 'ALTER TABLE "order" ADD COLUMN bm_cargo_branch VARCHAR(150)',
        "bm_cargo_branch_address": 'ALTER TABLE "order" ADD COLUMN bm_cargo_branch_address VARCHAR(300)',
        "delivery_note": 'ALTER TABLE "order" ADD COLUMN delivery_note TEXT',
        "payment_method": 'ALTER TABLE "order" ADD COLUMN payment_method VARCHAR(50)',
        "payment_status": 'ALTER TABLE "order" ADD COLUMN payment_status VARCHAR(50) DEFAULT \'pending\'',
        "order_status": 'ALTER TABLE "order" ADD COLUMN order_status VARCHAR(50) DEFAULT \'pending\'',
        "status": 'ALTER TABLE "order" ADD COLUMN status VARCHAR(50) DEFAULT \'pending\'',
        "subtotal": 'ALTER TABLE "order" ADD COLUMN subtotal FLOAT',
        "discount_rate": 'ALTER TABLE "order" ADD COLUMN discount_rate FLOAT DEFAULT 0',
        "discount_amount": 'ALTER TABLE "order" ADD COLUMN discount_amount FLOAT DEFAULT 0',
        "promo_discount_amount": 'ALTER TABLE "order" ADD COLUMN promo_discount_amount FLOAT DEFAULT 0',
        "shipping_cost": 'ALTER TABLE "order" ADD COLUMN shipping_cost FLOAT DEFAULT 0',
        "transfer_receipt_url": 'ALTER TABLE "order" ADD COLUMN transfer_receipt_url VARCHAR(300)',
    }

    with db.engine.begin() as connection:
        for column_name, sql_statement in missing_sql.items():
            if column_name not in existing_columns:
                connection.execute(text(sql_statement))


def ensure_order_item_schema():
    inspector = inspect(db.engine)
    existing_columns = {column["name"] for column in inspector.get_columns("order_item")}
    missing_sql = {
        "product_name": "ALTER TABLE order_item ADD COLUMN product_name VARCHAR(200)",
        "unit_price": "ALTER TABLE order_item ADD COLUMN unit_price FLOAT",
        "total_price": "ALTER TABLE order_item ADD COLUMN total_price FLOAT",
    }

    with db.engine.begin() as connection:
        for column_name, sql_statement in missing_sql.items():
            if column_name not in existing_columns:
                connection.execute(text(sql_statement))


def ensure_book_schema():
    inspector = inspect(db.engine)
    existing_columns = {column["name"] for column in inspector.get_columns("book")}
    missing_sql = {
    "active": 'ALTER TABLE book ADD COLUMN active BOOLEAN DEFAULT TRUE',
    "destacado": 'ALTER TABLE book ADD COLUMN destacado BOOLEAN DEFAULT FALSE',
    "novedad": 'ALTER TABLE book ADD COLUMN novedad BOOLEAN DEFAULT FALSE',
    "preventa": 'ALTER TABLE book ADD COLUMN preventa BOOLEAN DEFAULT FALSE',
    "recomendado": 'ALTER TABLE book ADD COLUMN recomendado BOOLEAN DEFAULT FALSE',
    "promo_2x1": 'ALTER TABLE book ADD COLUMN promo_2x1 BOOLEAN DEFAULT FALSE',
    "promo_2x1_partner_id": 'ALTER TABLE book ADD COLUMN promo_2x1_partner_id INTEGER',
}

    with db.engine.begin() as connection:
        for column_name, sql_statement in missing_sql.items():
            if column_name not in existing_columns:
                connection.execute(text(sql_statement))


SITE_SECTION_DEFAULTS = {
    "hero": {
        "title": "Descubre tu próxima lectura sin salir de casa",
        "subtitle": "Librería online",
        "body": "Explora libros físicos, novedades editoriales y recomendaciones elegidas para lectores exigentes.",
        "cta_text": "Ver novedades",
        "cta_link": "/#catalogo",
        "items_json": json.dumps(
            [
                "Envíos nacionales de libros físicos",
                "Atención rápida por WhatsApp",
                "Confirmación por correo y número de orden",
            ],
            ensure_ascii=True,
        ),
    },
    "banner_primary": {
        "title": "Colecciones curadas cada semana",
        "subtitle": "Banner principal",
        "body": "Agrupa tus libros por temática, autor, saga o temporada para guiar mejor la compra.",
        "cta_text": "Explorar destacados",
        "cta_link": "/#destacados",
        "items_json": json.dumps(
            ["Destacados", "Recomendados", "Novedades", "Preventa"],
            ensure_ascii=True,
        ),
    },
    "banner_secondary": {
        "title": "Compra libros físicos con seguimiento claro",
        "subtitle": "Banner secundario",
        "body": "Cada pedido genera confirmación por WhatsApp y correo con el resumen de tu compra.",
        "cta_text": "Ver políticas",
        "cta_link": "/politicas",
        "items_json": json.dumps(
            ["Orden por WhatsApp", "Correo de confirmación", "Atención personalizada"],
            ensure_ascii=True,
        ),
    },
    "about": {
        "title": "Sobre Librería SJ",
        "subtitle": "Nosotros",
        "body": "Somos una librería enfocada en libros físicos, con recomendaciones editoriales, atención cercana y seguimiento real de cada pedido.",
        "cta_text": "Contactar",
        "cta_link": "/contacto",
        "items_json": json.dumps(
            [
                "Libros físicos originales",
                "Catálogo curado por categorías",
                "Atención por WhatsApp y correo",
            ],
            ensure_ascii=True,
        ),
    },
    "faq": {
        "title": "Preguntas frecuentes",
        "subtitle": "Ayuda",
        "body": "Respuestas rápidas para compra, envíos y seguimiento.",
        "items_json": json.dumps(
            [
                {"title": "¿Cómo confirmo mi pedido?", "body": "Recibirás un número de orden y el mensaje listo para WhatsApp."},
                {"title": "¿Venden libros digitales?", "body": "No. La tienda está enfocada solo en libros físicos."},
                {"title": "¿Puedo pedir varios libros juntos?", "body": "Sí, el carrito permite combinar varios títulos en una sola orden."},
            ],
            ensure_ascii=True,
        ),
    },
    "policies": {
        "title": "Políticas de compra",
        "subtitle": "Políticas",
        "body": "Información básica sobre confirmación, stock y atención postventa.",
        "items_json": json.dumps(
            [
                "Las órdenes se confirman según disponibilidad real de inventario.",
                "Los precios y ofertas pueden variar por campaña.",
                "Los libros archivados salen de la tienda pública pero conservan historial administrativo.",
            ],
            ensure_ascii=True,
        ),
    },
    "shipping": {
        "title": "Envíos y entregas",
        "subtitle": "Envíos",
        "body": "Coordinamos entregas de libros físicos dentro de República Dominicana.",
        "items_json": json.dumps(
            [
                "Entrega local coordinada por WhatsApp",
                "Seguimiento por número de orden",
                "Tiempo estimado según zona y disponibilidad",
            ],
            ensure_ascii=True,
        ),
    },
    "contact": {
        "title": "Contacto",
        "subtitle": "Hablemos",
        "body": "Si necesitas ayuda para elegir o seguir tu pedido, estamos listos para responderte.",
        "items_json": json.dumps(
            [
                {"title": "WhatsApp", "body": "829-447-5730"},
                {"title": "Correo", "body": "librerisj@gmail.com"},
                {"title": "Horario", "body": "Lunes a sábado de 9:00am a 10:00pm"},
            ],
            ensure_ascii=True,
        ),
    },
}


def seed_site_sections():
    for key, values in SITE_SECTION_DEFAULTS.items():
        existing_section = SiteSection.query.filter_by(key=key).first()
        if existing_section:
            continue

        db.session.add(
            SiteSection(
                key=key,
                title=values.get("title"),
                subtitle=values.get("subtitle"),
                body=values.get("body"),
                image_url=values.get("image_url"),
                cta_text=values.get("cta_text"),
                cta_link=values.get("cta_link"),
                items_json=values.get("items_json"),
                is_active=True,
            )
        )

    db.session.commit()


with app.app_context():
    db.create_all()
    ensure_order_schema()
    ensure_order_item_schema()
    ensure_book_schema()
    seed_site_sections()


@app.route("/", methods=["GET"])
def healthcheck():
    return json_response(200, False, "API activa.", {"service": "bookshop-api"})


def generate_token(admin):
    now = datetime.datetime.utcnow()
    payload = {
        "id": admin.id,
        "username": admin.username,
        "iat": now,
        "nbf": now,
        "iss": app.config.get("JWT_ISSUER"),
        "aud": app.config.get("JWT_AUDIENCE"),
        "exp": now + datetime.timedelta(minutes=app.config.get("JWT_EXPIRATION_MINUTES", 120)),
    }
    return jwt.encode(payload, app.config["JWT_SECRET"], algorithm="HS256")


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "").strip()

        if not auth_header:
            return json_response(401, True, "Falta iniciar sesión.")

        parts = auth_header.split()
        if len(parts) != 2 or parts[0] != "Bearer":
            return json_response(401, True, "Acceso inválido.")

        token = parts[1]

        try:
            data = jwt.decode(
                token,
                app.config["JWT_SECRET"],
                algorithms=["HS256"],
                issuer=app.config.get("JWT_ISSUER"),
                audience=app.config.get("JWT_AUDIENCE"),
            )
            current_user = db.session.get(Admin, data["id"])
            if not current_user:
                return json_response(401, True, "Usuario no encontrado.")
        except jwt.ExpiredSignatureError:
            return json_response(401, True, "Sesión vencida.")
        except jwt.InvalidTokenError:
            return json_response(401, True, "Sesión inválida.")
        except Exception:
            return json_response(401, True, "Sesión inválida.")

        return f(current_user, *args, **kwargs)

    return decorated


def slugify(value):
    cleaned = "".join(
        character.lower() if character.isalnum() else "-" for character in (value or "").strip()
    )
    while "--" in cleaned:
        cleaned = cleaned.replace("--", "-")
    return cleaned.strip("-") or "libro"


def parse_bool(value, default=False):
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    return str(value).strip().lower() in {"true", "1", "yes", "si", "on"}


def sanitize_order_number(value):
    order_number = normalize_text(value, "Número de orden", 50, required=True).upper()
    if not ORDER_NUMBER_RE.match(order_number):
        raise ValueError("Número de orden inválido.")
    return order_number


def sanitize_category_id(value):
    category_id = normalize_id(value, "Categoría")
    if category_id is None:
        return None
    category = db.session.get(Category, category_id)
    if not category:
        raise LookupError("Categoría no encontrada.")
    return category_id


def sanitize_book_payload(data, required=False):
    payload = {}

    text_fields = {
        "titulo": ("Título", 200),
        "autor": ("Autor", 200),
        "descripcion": ("Descripción", 2500),
    }
    for field, (label, max_length) in text_fields.items():
        if field in data or required:
            payload[field] = normalize_text(
                data.get(field),
                label,
                max_length,
                required=required,
                min_length=2 if field != "descripcion" else 8,
                allow_newlines=field == "descripcion",
            )

    if "precio" in data or required:
        payload["precio"] = parse_money(data.get("precio"), "Precio", required=True)
    if "stock" in data or required:
        payload["stock"] = parse_non_negative_int(data.get("stock"), "Stock", max_value=100000)
    if "precio_oferta" in data:
        payload["precio_oferta"] = parse_money(data.get("precio_oferta"), "Precio oferta")
    if "category_id" in data:
        payload["category_id"] = sanitize_category_id(data.get("category_id"))
    if "imagen" in data:
        payload["imagen"] = sanitize_url(data.get("imagen"), "Imagen", allow_relative=True)

    for field in ["oferta", "destacado", "novedad", "preventa", "recomendado"]:
        if field in data:
            payload[field] = parse_bool(data.get(field), False)

    if "promo_2x1" in data:
        payload["promo_2x1"] = parse_bool(data.get("promo_2x1"), False)
    if "promo_2x1_partner_id" in data:
        payload["promo_2x1_partner_id"] = normalize_id(data.get("promo_2x1_partner_id"), "Libro 2x1")

    price = payload.get("precio")
    offer_price = payload.get("precio_oferta")
    if price is not None and offer_price is not None and offer_price >= price:
        raise ValueError("La oferta debe ser menor que el precio.")

    return payload


def sanitize_section_items(items):
    if items in [None, ""]:
        return []
    if not isinstance(items, list):
        raise ValueError("Items extra inválidos.")
    if len(items) > 20:
        raise ValueError("Máximo 20 items extra.")

    sanitized_items = []
    for item in items:
        if isinstance(item, str):
            sanitized_items.append(normalize_text(item, "Item extra", 180))
            continue
        if isinstance(item, dict):
            sanitized_items.append(
                {
                    "title": normalize_text(item.get("title"), "Título de item", 120, required=True),
                    "body": normalize_text(item.get("body"), "Texto de item", 280),
                }
            )
            continue
        raise ValueError("Items extra inválidos.")

    return [item for item in sanitized_items if item]


def safe_load_json(value, fallback):
    if not value:
        return fallback
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return fallback


def get_active_book_price(book):
    return float(book.precio_oferta) if book.oferta and book.precio_oferta else float(book.precio)


def serialize_2x1_partner(book):
    partner_id = getattr(book, "promo_2x1_partner_id", None)
    if not partner_id:
        return None

    partner = db.session.get(Book, partner_id)
    if not partner:
        return None

    return {
        "id": partner.id,
        "titulo": partner.titulo,
    }


def serialize_book(book):
    promo_partner = serialize_2x1_partner(book) if getattr(book, "promo_2x1", False) else None
    return {
        "id": book.id,
        "titulo": book.titulo,
        "slug": f"{slugify(book.titulo)}-{book.id}",
        "autor": book.autor,
        "precio": book.precio,
        "descripcion": book.descripcion,
        "precio_oferta": book.precio_oferta,
        "imagen": book.imagen,
        "oferta": book.oferta,
        "stock": book.stock,
        "category_id": book.category_id,
        "active": bool(getattr(book, "active", True)),
        "destacado": bool(getattr(book, "destacado", False)),
        "novedad": bool(getattr(book, "novedad", False)),
        "preventa": bool(getattr(book, "preventa", False)),
        "recomendado": bool(getattr(book, "recomendado", False)),
        "promo_2x1": bool(getattr(book, "promo_2x1", False) and promo_partner),
        "promo_2x1_partner_id": promo_partner["id"] if promo_partner else None,
        "promo_2x1_partner_title": promo_partner["titulo"] if promo_partner else "",
    }


def serialize_admin_book(book):
    sold_units = sum(
        item.quantity
        for item in book.order_items
        if item.order and normalize_order_status(item.order.status) == "delivered"
    )
    active_price = book.precio_oferta if book.oferta and book.precio_oferta else book.precio
    return {
        **serialize_book(book),
        "category_name": book.category.nombre if book.category else "Sin categoría",
        "created_at": book.created_at.isoformat() if book.created_at else None,
        "sold_units": sold_units,
        "inventory_value": round((book.stock or 0) * float(active_price or 0), 2),
        "status_label": (
            "Archivado"
            if not bool(getattr(book, "active", True))
            else "Sin stock" if (book.stock or 0) <= 0 else "Disponible"
        ),
    }


def serialize_site_section(section):
    return {
        "id": section.id,
        "key": section.key,
        "title": section.title or "",
        "subtitle": section.subtitle or "",
        "body": section.body or "",
        "image_url": section.image_url or "",
        "cta_text": section.cta_text or "",
        "cta_link": section.cta_link or "",
        "items": safe_load_json(section.items_json, []),
        "is_active": bool(section.is_active),
        "updated_at": section.updated_at.isoformat() if section.updated_at else None,
    }


def sync_order_inventory(previous_status, new_status, order):
    previous_normalized = normalize_order_status(previous_status) or "pending"
    new_normalized = normalize_order_status(new_status) or previous_normalized

    if previous_normalized == new_normalized:
        return

    if previous_normalized != "cancelled" and new_normalized == "cancelled":
        for item in order.items:
            if item.book:
                item.book.stock = (item.book.stock or 0) + item.quantity

    if previous_normalized == "cancelled" and new_normalized != "cancelled":
        for item in order.items:
            if item.book:
                if (item.book.stock or 0) < item.quantity:
                    raise ValueError(f"Stock insuficiente: {item.book.titulo}.")
                item.book.stock = (item.book.stock or 0) - item.quantity


def serialize_order_item(item):
    unit_price = item.unit_price if item.unit_price is not None else item.price
    line_total = item.total_price if item.total_price is not None else float(unit_price) * item.quantity
    return {
        "id": item.id,
        "book_id": item.book_id,
        "titulo": item.product_name or (item.book.titulo if item.book else "Libro eliminado"),
        "autor": item.book.autor if item.book else "",
        "quantity": item.quantity,
        "price": unit_price,
        "unit_price": unit_price,
        "line_total": round(float(line_total), 2),
        "total_price": round(float(line_total), 2),
    }


def serialize_order(order):
    items_subtotal = round(sum(float(item.price) * item.quantity for item in order.items), 2)
    subtotal = float(order.subtotal) if order.subtotal is not None else items_subtotal
    discount_amount = float(order.discount_amount or 0)
    promo_discount_amount = float(order.promo_discount_amount or 0)
    shipping_cost = float(getattr(order, "shipping_cost", 0) or 0)
    total = (
        float(order.total)
        if order.total is not None
        else max(subtotal - discount_amount - promo_discount_amount + shipping_cost, 0)
    )
    status = getattr(order, "order_status", None) or order.status or "pending"
    payment_method = getattr(order, "payment_method", "") or ""
    payment_status = getattr(order, "payment_status", "") or "pending"

    return {
        "id": order.id,
        "order_number": order.order_number,
        "customer_name": order.customer_name,
        "customer_cedula": getattr(order, "customer_cedula", "") or "",
        "customer_email": order.customer_email,
        "customer_phone": order.customer_phone,
        "customer_address": order.customer_address,
        "delivery_type": getattr(order, "delivery_type", "") or "",
        "delivery_type_label": DELIVERY_TYPE_LABELS.get(getattr(order, "delivery_type", ""), ""),
        "province": getattr(order, "province", "") or "",
        "municipality_sector": getattr(order, "municipality_sector", "") or "",
        "bm_cargo_branch": getattr(order, "bm_cargo_branch", "") or "",
        "bm_cargo_branch_address": getattr(order, "bm_cargo_branch_address", "") or "",
        "delivery_note": getattr(order, "delivery_note", "") or "",
        "payment_method": payment_method,
        "payment_method_label": PAYMENT_METHOD_LABELS.get(payment_method, payment_method),
        "payment_status": payment_status,
        "payment_status_label": PAYMENT_STATUS_LABELS.get(payment_status, payment_status),
        "order_status": status,
        "status": status,
        "subtotal": round(subtotal, 2),
        "discount_rate": float(order.discount_rate or 0),
        "discount_amount": round(discount_amount, 2),
        "promo_discount_amount": round(promo_discount_amount, 2),
        "shipping_cost": round(shipping_cost, 2),
        "total": round(total, 2),
        "transfer_receipt_url": getattr(order, "transfer_receipt_url", "") or "",
        "date": order.date.isoformat() if order.date else None,
        "items_count": sum(item.quantity for item in order.items),
        "items": [serialize_order_item(item) for item in order.items],
    }


def create_order_number(order_id):
    date_stamp = datetime.datetime.utcnow().strftime("%Y%m%d")
    return f"BS-{date_stamp}-{order_id:05d}"


def calculate_promo_2x1_discount(order_lines):
    line_by_book_id = {line["book"].id: line for line in order_lines}
    processed_pairs = set()
    promo_book_ids = set()
    promotions = []
    discount = 0

    for line in order_lines:
        book = line["book"]
        partner_id = getattr(book, "promo_2x1_partner_id", None)
        if not getattr(book, "promo_2x1", False) or not partner_id:
            continue

        partner_line = line_by_book_id.get(partner_id)
        if not partner_line:
            continue

        pair_key = tuple(sorted([book.id, partner_id]))
        if pair_key in processed_pairs:
            continue

        processed_pairs.add(pair_key)
        pairs_count = min(line["quantity"], partner_line["quantity"])
        if pairs_count <= 0:
            continue

        promo_book_ids.update(pair_key)
        free_unit_price = min(float(line["price"]), float(partner_line["price"]))
        pair_discount = round(free_unit_price * pairs_count, 2)
        discount += pair_discount
        promotions.append(
            {
                "label": f"2x1: {book.titulo} + {partner_line['book'].titulo}",
                "pairs": pairs_count,
                "discount": pair_discount,
            }
        )

    return round(discount, 2), promotions, promo_book_ids


def calculate_checkout_summary(order_lines):
    subtotal = round(sum(float(line["line_total"]) for line in order_lines), 2)
    total_units = sum(int(line["quantity"]) for line in order_lines)
    promo_discount_amount, promotions, promo_book_ids = calculate_promo_2x1_discount(order_lines)
    eligible_discount_lines = [
        line for line in order_lines if line["book"].id not in promo_book_ids
    ]
    eligible_discount_units = sum(int(line["quantity"]) for line in eligible_discount_lines)
    eligible_discount_base = round(
        sum(float(line["line_total"]) for line in eligible_discount_lines),
        2,
    )

    if eligible_discount_units >= 3:
        discount_rate = 0.20
    elif eligible_discount_units == 2:
        discount_rate = 0.15
    else:
        discount_rate = 0

    discount_amount = round(eligible_discount_base * discount_rate, 2)
    total = round(max(subtotal - promo_discount_amount - discount_amount, 0), 2)

    return {
        "subtotal": subtotal,
        "total_units": total_units,
        "discount_eligible_units": eligible_discount_units,
        "discount_rate": discount_rate,
        "discount_amount": discount_amount,
        "promo_discount_amount": promo_discount_amount,
        "promotions": promotions,
        "total": total,
    }


def build_order_lines(items):
    if not isinstance(items, list) or not items:
        raise ValueError("Agrega libros al pedido.")
    if len(items) > 30:
        raise ValueError("Demasiados libros en un pedido.")

    requested_quantities = {}
    for item in items:
        if not isinstance(item, dict):
            raise ValueError("Libro inválido.")
        book_id = normalize_id(item.get("book_id"), "Libro", required=True)
        quantity = parse_positive_int(item.get("quantity", 0), "Cantidad", max_value=20)
        requested_quantities[book_id] = requested_quantities.get(book_id, 0) + quantity
        if requested_quantities[book_id] > 20:
            raise ValueError("Cantidad inválida.")

    order_lines = []
    for book_id, quantity in requested_quantities.items():
        book = Book.query.filter_by(id=book_id).with_for_update().first()
        if not book:
            raise LookupError("Libro no encontrado.")
        if not bool(getattr(book, "active", True)):
            raise ValueError("Libro no disponible.")
        if book.stock < quantity:
            raise ValueError(f"Stock insuficiente: {book.titulo}.")

        unit_price = get_active_book_price(book)
        line_total = round(unit_price * quantity, 2)

        order_lines.append(
            {
                "book": book,
                "quantity": quantity,
                "price": unit_price,
                "line_total": line_total,
                "titulo": book.titulo,
            }
        )

    return order_lines


def normalize_delivery_type(value, province=""):
    normalized = normalize_text(value, "Tipo de envío", 50).lower()
    aliases = {
        "santo_domingo": "local",
        "santo-domingo": "local",
        "local": "local",
        "dn": "local",
        "province": "province",
        "provinces": "province",
        "other": "province",
        "otras_provincias": "province",
        "otras-provincias": "province",
    }
    delivery_type = aliases.get(normalized, "")
    if not delivery_type and province:
        delivery_type = "local" if province in LOCAL_DELIVERY_PROVINCES else "province"
    if delivery_type not in SHIPPING_COSTS:
        raise ValueError("Tipo de envío inválido.")
    return delivery_type


def calculate_shipping_cost(delivery_type, province):
    delivery_type = normalize_delivery_type(delivery_type, province)
    if delivery_type == "local" and province not in LOCAL_DELIVERY_PROVINCES:
        raise ValueError("Selecciona Distrito Nacional o Santo Domingo para este tipo de envío.")
    if delivery_type == "province" and province in LOCAL_DELIVERY_PROVINCES:
        raise ValueError("Para Santo Domingo o Distrito Nacional usa el tipo de envío local.")
    return SHIPPING_COSTS[delivery_type]


def normalize_payment_method(value):
    payment_method = normalize_text(value, "Método de pago", 50, required=True).lower()
    aliases = {
        "transfer": "transfer",
        "transferencia": "transfer",
        "transferencia_bancaria": "transfer",
        "bank_transfer": "transfer",
        "card": "card_whatsapp",
        "tarjeta": "card_whatsapp",
        "card_whatsapp": "card_whatsapp",
        "tarjeta_whatsapp": "card_whatsapp",
        "whatsapp": "card_whatsapp",
    }
    normalized = aliases.get(payment_method, "")
    if not normalized:
        raise ValueError("Método de pago inválido.")
    return normalized


def normalize_payment_status(status):
    allowed_statuses = {
        "pending": "pending",
        "pendiente": "pending",
        "transfer_sent": "transfer_sent",
        "transferencia_enviada": "transfer_sent",
        "transferencia enviada": "transfer_sent",
        "confirmed": "confirmed",
        "pago_confirmado": "confirmed",
        "pago confirmado": "confirmed",
        "pending_whatsapp": "pending_whatsapp",
        "pendiente_whatsapp": "pending_whatsapp",
        "pendiente por whatsapp": "pending_whatsapp",
        "rejected": "rejected",
        "rechazado": "rejected",
        "rechazada": "rejected",
    }
    return allowed_statuses.get((status or "").strip().lower(), "")


def normalize_branch_lookup_key(value):
    cleaned = normalize_text(value, "Sucursal BM Cargo", 180)
    if cleaned.endswith(")") and " (" in cleaned:
        cleaned = cleaned.rsplit(" (", 1)[0].strip()
    return cleaned


def resolve_bm_cargo_branch_address(branch_name):
    lookup_key = normalize_branch_lookup_key(branch_name)
    if not lookup_key:
        return ""
    if lookup_key in BM_CARGO_BRANCH_ADDRESSES:
        return BM_CARGO_BRANCH_ADDRESSES[lookup_key]

    normalized_lookup = lookup_key.lower()
    for branch, address in BM_CARGO_BRANCH_ADDRESSES.items():
        if branch.lower() == normalized_lookup:
            return address

    return ""


def get_checkout_body():
    if request.is_json:
        return get_json_body()

    data = dict(request.form)
    raw_items = data.get("items", "[]")
    try:
        data["items"] = json.loads(raw_items)
    except (TypeError, json.JSONDecodeError):
        raise ValueError("Carrito inválido.")
    return data


def validate_transfer_receipt(file_storage):
    if not file_storage or not file_storage.filename:
        raise ValueError("Debes cargar el comprobante de transferencia.")

    filename = secure_filename(file_storage.filename)
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if extension not in ALLOWED_RECEIPT_EXTENSIONS:
        raise ValueError("El comprobante debe ser jpg, jpeg, png, webp o pdf.")

    file_storage.stream.seek(0, os.SEEK_END)
    file_size = file_storage.stream.tell()
    file_storage.stream.seek(0)

    if file_size <= 0:
        raise ValueError("El comprobante está vacío.")
    if file_size > app.config.get("TRANSFER_RECEIPT_MAX_BYTES", 5 * 1024 * 1024):
        raise ValueError("El comprobante no puede exceder 5MB.")

    return filename, extension


def save_transfer_receipt(file_storage, order):
    filename, extension = validate_transfer_receipt(file_storage)
    upload_dir = app.config.get("TRANSFER_RECEIPT_UPLOAD_DIR")
    os.makedirs(upload_dir, exist_ok=True)

    base_name = os.path.splitext(filename)[0][:70] or "comprobante"
    stored_filename = secure_filename(
        f"{order.order_number}-{int(time.time())}-{base_name}.{extension}"
    )
    file_path = os.path.join(upload_dir, stored_filename)
    file_storage.save(file_path)
    return f"uploads/receipts/{stored_filename}"


def build_whatsapp_message(order, items):
    lines = [
        "Nueva orden en Librería SJ",
        "",
        f"Número de orden: {order.order_number}",
        f"Nombre del cliente: {order.customer_name}",
        f"Cédula: {getattr(order, 'customer_cedula', '') or 'No indicada'}",
        f"WhatsApp: {order.customer_phone}",
        f"Correo: {order.customer_email or 'No indicado'}",
        f"Provincia: {getattr(order, 'province', '') or 'No indicada'}",
        f"Municipio / sector: {getattr(order, 'municipality_sector', '') or 'No indicado'}",
        f"Sucursal BM Cargo: {getattr(order, 'bm_cargo_branch', '') or 'No indicada'}",
        f"Dirección sucursal BM Cargo: {getattr(order, 'bm_cargo_branch_address', '') or 'No indicada'}",
        f"Nota adicional: {getattr(order, 'delivery_note', '') or 'Sin nota'}",
        "",
        "Productos:",
    ]

    for item in items:
        lines.append(
            f"* {item['titulo']} x{item['quantity']} - RD$ {float(item['line_total']):.2f}"
        )

    payment_method = getattr(order, "payment_method", "") or ""
    payment_status = getattr(order, "payment_status", "") or "pending"
    receipt_url = getattr(order, "transfer_receipt_url", "") or "No aplica"

    lines.extend(
        [
            "",
            f"Subtotal: RD$ {float(order.subtotal or 0):.2f}",
            f"Promoción 2x1: -RD$ {float(order.promo_discount_amount or 0):.2f}",
            f"Descuento por cantidad: -RD$ {float(order.discount_amount or 0):.2f}",
            f"Envío: RD$ {float(getattr(order, 'shipping_cost', 0) or 0):.2f}",
            f"Total final: RD$ {float(order.total or 0):.2f}",
            "",
            f"Método de pago: {PAYMENT_METHOD_LABELS.get(payment_method, payment_method)}",
            f"Estado del pago: {PAYMENT_STATUS_LABELS.get(payment_status, payment_status)}",
            f"Comprobante: {receipt_url}",
        ]
    )

    if payment_method == "card_whatsapp":
        lines.extend(["", "El cliente desea pagar con tarjeta por WhatsApp."])

    return "\n".join(lines)


def build_whatsapp_link(message):
    whatsapp_number = app.config.get("WHATSAPP_NUMBER", "").strip()
    if not whatsapp_number:
        return ""
    return f"https://wa.me/{whatsapp_number}?text={quote(message)}"


def build_customer_whatsapp_link(order):
    customer_phone = "".join(character for character in (order.customer_phone or "") if character.isdigit())
    if not customer_phone:
        return ""

    message = "\n".join(
        [
            f"Hola {order.customer_name},",
            f"Te damos seguimiento a tu pedido {order.order_number}.",
            "En breve te confirmaremos disponibilidad, entrega y siguientes pasos.",
            "Gracias por comprar libros físicos con Librería SJ.",
        ]
    )
    return f"https://wa.me/{customer_phone}?text={quote(message)}"


def send_order_email(order, items):
    smtp_host = app.config.get("SMTP_HOST")
    smtp_user = app.config.get("SMTP_USER")
    smtp_password = app.config.get("SMTP_PASSWORD")
    smtp_from = app.config.get("SMTP_FROM")

    if not smtp_host or not smtp_user or not smtp_password or not smtp_from or not order.customer_email:
        return False

    email_body = [
        f"Hola {order.customer_name},",
        "",
        f"Tu pedido {order.order_number} fue registrado.",
        "",
        "Detalle del pedido:",
    ]

    for item in items:
        email_body.append(
            f"- {item['titulo']} x{item['quantity']} | RD$ {item['line_total']:.2f}"
        )

    email_body.extend(
        [
            "",
            f"Subtotal: RD$ {float(order.subtotal or 0):.2f}",
            f"Promoción 2x1: -RD$ {float(order.promo_discount_amount or 0):.2f}",
            f"Descuento por cantidad: -RD$ {float(order.discount_amount or 0):.2f}",
            f"Envío: RD$ {float(getattr(order, 'shipping_cost', 0) or 0):.2f}",
            f"Total: RD$ {order.total:.2f}",
            "",
            "Datos de retiro BM Cargo:",
            f"Sucursal: {getattr(order, 'bm_cargo_branch', '') or 'No indicada'}",
            f"Dirección completa: {getattr(order, 'bm_cargo_branch_address', '') or 'No indicada'}",
            f"Provincia: {getattr(order, 'province', '') or 'No indicada'}",
            f"Municipio / sector: {getattr(order, 'municipality_sector', '') or 'No indicado'}",
            f"Dirección de entrega: {order.customer_address}",
            "",
            "Gracias por comprar libros físicos con nosotros.",
        ]
    )

    safe_customer_name = escape_html(order.customer_name)
    safe_customer_address = escape_html(order.customer_address)
    safe_bm_cargo_branch = escape_html(getattr(order, "bm_cargo_branch", "") or "No indicada")
    safe_bm_cargo_branch_address = escape_html(getattr(order, "bm_cargo_branch_address", "") or "No indicada")
    safe_province = escape_html(getattr(order, "province", "") or "No indicada")
    safe_municipality_sector = escape_html(getattr(order, "municipality_sector", "") or "No indicado")
    safe_order_number = escape_html(order.order_number)
    html_items = "".join(
        [
            f"<tr><td style='padding:10px 0;border-bottom:1px solid #e8e1d2;font-size:14px;line-height:1.5'>{escape_html(item['titulo'])}</td><td style='padding:10px 0;border-bottom:1px solid #e8e1d2;text-align:center;font-size:14px'>{item['quantity']}</td><td style='padding:10px 0;border-bottom:1px solid #e8e1d2;text-align:right;font-size:14px'>RD$ {item['line_total']:.2f}</td></tr>"
            for item in items
        ]
    )

    message = EmailMessage()
    message["Subject"] = f"Confirmación de pedido {order.order_number}"
    message["From"] = smtp_from
    message["To"] = order.customer_email
    message.set_content("\n".join(email_body))
    message.add_alternative(
        f"""
        <html>
          <body style="margin:0;background:#f5f1e6;padding:20px;font-family:Arial,sans-serif;color:#1a1a1a;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#fffdf8;border-radius:18px;border:1px solid #ebe2d2;">
              <tr>
                <td style="padding:22px 24px;background:#1a1a1a;color:#fffdf8;">
                  <div style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:700;">Librería SJ</div>
                  <div style="margin-top:6px;font-size:13px;line-height:1.5;opacity:0.9;">Confirmación de pedido de libros físicos</div>
                </td>
              </tr>
              <tr>
                <td style="padding:24px;">
                  <p style="margin:0 0 12px;font-size:15px;">Hola {safe_customer_name},</p>
                  <p style="margin:0 0 16px;line-height:1.7;color:#555;font-size:14px;">
                    Tu pedido <strong>{safe_order_number}</strong> fue registrado.
                  </p>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;">
                    <thead>
                      <tr>
                        <th style="text-align:left;padding:0 0 10px;color:#6b6b6b;font-size:12px;">Libro</th>
                        <th style="text-align:center;padding:0 0 10px;color:#6b6b6b;font-size:12px;">Cant.</th>
                        <th style="text-align:right;padding:0 0 10px;color:#6b6b6b;font-size:12px;">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>{html_items}</tbody>
                  </table>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;background:#f8f3e8;border-radius:14px;">
                    <tr>
                      <td style="padding:14px 16px 6px;font-size:14px;color:#555;">Subtotal</td>
                      <td style="padding:14px 16px 6px;text-align:right;font-size:14px;font-weight:700;">RD$ {float(order.subtotal or 0):.2f}</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 16px;font-size:14px;color:#555;">Promoción 2x1</td>
                      <td style="padding:6px 16px;text-align:right;font-size:14px;font-weight:700;">-RD$ {float(order.promo_discount_amount or 0):.2f}</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 16px;font-size:14px;color:#555;">Descuento por cantidad</td>
                      <td style="padding:6px 16px;text-align:right;font-size:14px;font-weight:700;">-RD$ {float(order.discount_amount or 0):.2f}</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 16px;font-size:14px;color:#555;">Envío</td>
                      <td style="padding:6px 16px;text-align:right;font-size:14px;font-weight:700;">RD$ {float(getattr(order, 'shipping_cost', 0) or 0):.2f}</td>
                    </tr>
                    <tr>
                      <td style="padding:14px 16px;font-size:14px;color:#555;">Total</td>
                      <td style="padding:14px 16px;text-align:right;font-size:16px;font-weight:700;">RD$ {order.total:.2f}</td>
                    </tr>
                  </table>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;background:#fff9ee;border:1px solid #eadfcb;border-radius:14px;">
                    <tr>
                      <td style="padding:16px 16px 4px;font-size:12px;font-weight:700;color:#255449;text-transform:uppercase;letter-spacing:0.02em;">Retiro en BM Cargo</td>
                    </tr>
                    <tr>
                      <td style="padding:4px 16px;font-size:14px;line-height:1.6;color:#1a1a1a;">
                        <strong>Sucursal:</strong> {safe_bm_cargo_branch}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:4px 16px;font-size:14px;line-height:1.6;color:#1a1a1a;">
                        <strong>Dirección completa:</strong> {safe_bm_cargo_branch_address}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:4px 16px;font-size:14px;line-height:1.6;color:#555;">
                        <strong>Provincia:</strong> {safe_province} &nbsp; | &nbsp; <strong>Municipio / sector:</strong> {safe_municipality_sector}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:4px 16px 16px;font-size:14px;line-height:1.6;color:#555;">
                        <strong>Referencia de entrega:</strong> {safe_customer_address}
                      </td>
                    </tr>
                  </table>
                  <p style="margin:18px 0 0;line-height:1.7;color:#555;font-size:14px;">
                    Gracias por confiar en nuestra librería. Te escribiremos para confirmar disponibilidad y entrega.
                  </p>
                </td>
              </tr>
            </table>
          </body>
        </html>
        """,
        subtype="html",
    )

    with smtplib.SMTP(app.config["SMTP_HOST"], app.config["SMTP_PORT"]) as server:
        if app.config.get("SMTP_USE_TLS", True):
            server.starttls()
        server.login(smtp_user, smtp_password)
        server.send_message(message)

    return True


def normalize_order_status(status):
    allowed_statuses = {
        "pending": "pending",
        "pendiente": "pending",
        "confirmed": "confirmed",
        "confirmada": "confirmed",
        "confirmedo": "confirmed",
        "processing": "processing",
        "preparando": "processing",
        "en_proceso": "processing",
        "shipped": "shipped",
        "enviado": "shipped",
        "ready_for_pickup": "ready_for_pickup",
        "lista_para_retirar": "ready_for_pickup",
        "lista para retirar": "ready_for_pickup",
        "delivered": "delivered",
        "entregada": "delivered",
        "entregado": "delivered",
        "cancelled": "cancelled",
        "cancelada": "cancelled",
        "cancelado": "cancelled",
    }
    return allowed_statuses.get((status or "").strip().lower(), "")


def start_of_month(value):
    return value.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def parse_iso_date(value, end_of_day=False):
    if not value:
        return None
    try:
        parsed = datetime.datetime.strptime(value, "%Y-%m-%d")
        if end_of_day:
            return parsed.replace(hour=23, minute=59, second=59, microsecond=999999)
        return parsed
    except ValueError:
        return None


def filter_orders_list(orders, start_date=None, end_date=None, status_filter="", search=""):
    filtered_orders = list(orders)

    if start_date:
        filtered_orders = [order for order in filtered_orders if order.date and order.date >= start_date]
    if end_date:
        filtered_orders = [order for order in filtered_orders if order.date and order.date <= end_date]
    if status_filter:
        filtered_orders = [
            order for order in filtered_orders if normalize_order_status(order.status) == status_filter
        ]
    if search:
        search_term = search.strip().lower()
        filtered_orders = [
            order
            for order in filtered_orders
            if search_term in (order.order_number or "").lower()
            or search_term in (order.customer_name or "").lower()
            or search_term in (order.customer_email or "").lower()
            or search_term in (order.customer_phone or "").lower()
            or search_term in (getattr(order, "customer_cedula", "") or "").lower()
            or search_term in (getattr(order, "province", "") or "").lower()
            or search_term in (getattr(order, "bm_cargo_branch", "") or "").lower()
        ]

    return filtered_orders


def sync_book_promo_pair(book, partner_id):
    if partner_id not in [None, ""]:
        partner_id = normalize_id(partner_id, "Libro 2x1")

    previous_partner_id = getattr(book, "promo_2x1_partner_id", None)

    if previous_partner_id and previous_partner_id != partner_id:
        previous_partner = db.session.get(Book, previous_partner_id)
        if previous_partner and previous_partner.promo_2x1_partner_id == book.id:
            previous_partner.promo_2x1 = False
            previous_partner.promo_2x1_partner_id = None

    if not partner_id:
        book.promo_2x1 = False
        book.promo_2x1_partner_id = None
        paired_books = Book.query.filter(Book.promo_2x1_partner_id == book.id).all()
        for paired_book in paired_books:
            paired_book.promo_2x1 = False
            paired_book.promo_2x1_partner_id = None
        return

    partner = db.session.get(Book, partner_id)
    if not partner:
        raise ValueError("Libro 2x1 no existe.")
    if partner.id == book.id:
        raise ValueError("Elige otro libro 2x1.")
    if not bool(getattr(partner, "active", True)):
        raise ValueError("Libro 2x1 no disponible.")

    if partner.promo_2x1_partner_id and partner.promo_2x1_partner_id != book.id:
        previous_partner = db.session.get(Book, partner.promo_2x1_partner_id)
        if previous_partner:
            previous_partner.promo_2x1 = False
            previous_partner.promo_2x1_partner_id = None

    book.promo_2x1 = True
    book.promo_2x1_partner_id = partner.id
    partner.promo_2x1 = True
    partner.promo_2x1_partner_id = book.id


def validate_blog_order_number(order_number):
    normalized_order_number = sanitize_order_number(order_number)

    order = Order.query.filter_by(order_number=normalized_order_number).first()
    if not order or normalize_order_status(order.status) == "cancelled":
        raise ValueError("Orden no válida. Compra primero.")

    return order


def serialize_blog_comment(comment):
    return {
        "id": comment.id,
        "author_name": comment.author_name,
        "body": comment.body,
        "created_at": comment.created_at.isoformat() if comment.created_at else None,
    }


def serialize_blog_post(post):
    return {
        "id": post.id,
        "author_name": post.author_name,
        "title": post.title,
        "body": post.body,
        "created_at": post.created_at.isoformat() if post.created_at else None,
        "comments": [serialize_blog_comment(comment) for comment in post.comments],
    }


@app.route("/api/login", methods=["POST"])
def login():
    try:
        data = get_json_body()
        username = normalize_email(data.get("username"), required=True)
        password = str(data.get("password") or "")

        if not username or not password:
            return json_response(400, True, "Completa usuario y clave.")
        if len(password) > 200:
            return json_response(400, True, "Credenciales inválidas.")

        admin = Admin.query.filter(Admin.username.ilike(username)).first()
        if not admin or not check_password_hash(admin.password, password):
            return json_response(401, True, "Credenciales inválidas.")

        token = generate_token(admin)
        return json_response(
            200,
            False,
            "Sesión iniciada.",
            {
                "token": token,
                "user": {
                    "id": admin.id,
                    "username": admin.username,
                },
            },
        )
    except ValueError:
        return json_response(400, True, "Credenciales inválidas.")
    except Exception as error:
        return server_error_response()


@app.route("/api/site/content", methods=["GET"])
def get_site_content():
    try:
        sections = SiteSection.query.order_by(SiteSection.key.asc()).all()
        return json_response(
            200,
            False,
            "Contenido cargado.",
            {section.key: serialize_site_section(section) for section in sections if section.is_active},
        )
    except Exception as error:
        return server_error_response()


@app.route("/api/admin/site-content", methods=["GET"])
@token_required
def admin_site_content(current_user):
    try:
        sections = SiteSection.query.order_by(SiteSection.key.asc()).all()
        return json_response(
            200,
            False,
            "Contenido cargado.",
            [serialize_site_section(section) for section in sections],
        )
    except Exception as error:
        return server_error_response()


@app.route("/api/admin/site-content/<string:key>", methods=["PUT"])
@token_required
def update_site_content(current_user, key):
    try:
        data = get_json_body()
        if key not in SITE_SECTION_DEFAULTS:
            return json_response(400, True, "Sección inválida.")
        section = SiteSection.query.filter_by(key=key).first()
        if not section:
            section = SiteSection(key=key)
            db.session.add(section)

        section.title = normalize_text(data.get("title"), "Título", 200)
        section.subtitle = normalize_text(data.get("subtitle"), "Subtítulo", 250)
        section.body = normalize_text(data.get("body"), "Descripción", 2500, allow_newlines=True)
        section.image_url = sanitize_url(data.get("image_url"), "Imagen o fondo", allow_relative=True)
        section.cta_text = normalize_text(data.get("cta_text"), "CTA texto", 120)
        section.cta_link = sanitize_cta_link(data.get("cta_link"))
        section.items_json = json.dumps(sanitize_section_items(data.get("items", [])), ensure_ascii=True)
        section.is_active = parse_bool(data.get("is_active", True), True)

        db.session.commit()
        return json_response(200, False, "Sección guardada.", serialize_site_section(section))
    except ValueError as error:
        db.session.rollback()
        return json_response(400, True, str(error))
    except Exception as error:
        db.session.rollback()
        return server_error_response()


@app.route("/api/blog/posts", methods=["GET"])
def get_blog_posts():
    try:
        posts = BlogPost.query.filter_by(status="published").order_by(BlogPost.created_at.desc()).all()
        return json_response(200, False, "Blog cargado.", [serialize_blog_post(post) for post in posts])
    except Exception as error:
        return server_error_response()


@app.route("/api/blog/validate-order", methods=["POST"])
def validate_blog_order():
    try:
        data = get_json_body()
        order = validate_blog_order_number(data.get("order_number"))
        return json_response(
            200,
            False,
            "Orden validada.",
            {
                "valid": True,
                "order_number": order.order_number,
                "customer_name": order.customer_name,
            },
        )
    except ValueError as error:
        return json_response(400, True, str(error), {"valid": False})
    except Exception as error:
        return server_error_response({"valid": False})


@app.route("/api/blog/posts", methods=["POST"])
def create_blog_post():
    try:
        data = get_json_body()
        order = validate_blog_order_number(data.get("order_number"))
        author_name = normalize_text(
            data.get("author_name") or order.customer_name or "Lector SJ",
            "Nombre",
            150,
            required=True,
            min_length=2,
        )
        title = normalize_text(data.get("title"), "Título", 180, required=True, min_length=4)
        body = normalize_text(
            data.get("body"),
            "Comentario principal",
            2500,
            required=True,
            min_length=12,
            allow_newlines=True,
        )

        post = BlogPost(
            order_id=order.id,
            order_number=order.order_number,
            author_name=author_name,
            title=title,
            body=body,
            status="published",
        )
        db.session.add(post)
        db.session.commit()

        return json_response(201, False, "Publicación creada.", serialize_blog_post(post))
    except ValueError as error:
        db.session.rollback()
        return json_response(400, True, str(error))
    except Exception as error:
        db.session.rollback()
        return server_error_response()


@app.route("/api/blog/posts/<int:post_id>/comments", methods=["POST"])
def create_blog_comment(post_id):
    try:
        post = BlogPost.query.filter_by(id=post_id, status="published").first_or_404()
        data = get_json_body()
        order = validate_blog_order_number(data.get("order_number"))
        author_name = normalize_text(
            data.get("author_name") or order.customer_name or "Lector SJ",
            "Nombre",
            150,
            required=True,
            min_length=2,
        )
        body = normalize_text(data.get("body"), "Comentario", 1200, required=True, min_length=4, allow_newlines=True)

        comment = BlogComment(
            post_id=post.id,
            order_id=order.id,
            order_number=order.order_number,
            author_name=author_name,
            body=body,
        )
        db.session.add(comment)
        db.session.commit()

        return json_response(201, False, "Comentario agregado.", serialize_blog_comment(comment))
    except ValueError as error:
        db.session.rollback()
        return json_response(400, True, str(error))
    except Exception as error:
        db.session.rollback()
        return server_error_response()


@app.route("/api/books", methods=["GET"])
def get_books():
    try:
        search = normalize_text(request.args.get("search", ""), "Búsqueda", 80)
        category = request.args.get("category", "").strip()
        ofertas = request.args.get("ofertas", "").strip().lower()

        query = Book.query.filter(Book.active.is_(True))

        if search:
            query = query.filter(
                (Book.titulo.contains(search)) |
                (Book.autor.contains(search))
            )

        if category:
            query = query.filter(Book.category_id == normalize_id(category, "Categoría", required=True))

        if ofertas in ["true", "1", "yes"]:
            query = query.filter(Book.oferta.is_(True))

        books = query.order_by(Book.created_at.desc()).all()
        return json_response(
            200,
            False,
            "Libros cargados.",
            [serialize_book(book) for book in books],
        )
    except ValueError as error:
        return json_response(400, True, str(error))
    except Exception as error:
        return server_error_response()


@app.route("/api/books", methods=["POST"])
@token_required
def add_book(current_user):
    try:
        data = get_json_body()
        payload = sanitize_book_payload(data, required=True)

        book = Book(
            titulo=payload["titulo"],
            autor=payload["autor"],
            precio=payload["precio"],
            descripcion=payload["descripcion"],
            stock=payload["stock"],
            category_id=payload.get("category_id"),
            oferta=payload.get("oferta", False),
            destacado=payload.get("destacado", False),
            novedad=payload.get("novedad", False),
            preventa=payload.get("preventa", False),
            recomendado=payload.get("recomendado", False),
            precio_oferta=payload.get("precio_oferta"),
            imagen=payload.get("imagen"),
        )

        db.session.add(book)
        db.session.flush()
        sync_book_promo_pair(
            book,
            payload.get("promo_2x1_partner_id") if payload.get("promo_2x1", False) else None,
        )
        db.session.commit()

        return json_response(201, False, "Libro creado.", {"id": book.id, "titulo": book.titulo})
    except LookupError as error:
        db.session.rollback()
        return json_response(404, True, str(error))
    except ValueError as error:
        db.session.rollback()
        return json_response(400, True, str(error) or "Revisa precio y stock.")
    except Exception as error:
        db.session.rollback()
        return server_error_response()


@app.route("/api/books/<int:id>", methods=["PUT"])
@token_required
def update_book(current_user, id):
    try:
        book = Book.query.get_or_404(id)
        data = get_json_body()
        payload = sanitize_book_payload(data)
        effective_price = payload.get("precio", book.precio)
        effective_offer_price = payload.get("precio_oferta", book.precio_oferta)
        if effective_offer_price is not None and effective_offer_price >= effective_price:
            raise ValueError("La oferta debe ser menor que el precio.")

        for field in [
            "titulo",
            "autor",
            "precio",
            "descripcion",
            "stock",
            "category_id",
            "oferta",
            "destacado",
            "novedad",
            "preventa",
            "recomendado",
            "precio_oferta",
            "imagen",
        ]:
            if field in payload:
                setattr(book, field, payload[field])

        if "promo_2x1" in data or "promo_2x1_partner_id" in data:
            sync_book_promo_pair(
                book,
                payload.get("promo_2x1_partner_id") if payload.get("promo_2x1", False) else None,
            )

        db.session.commit()
        return json_response(200, False, "Libro actualizado.")
    except LookupError as error:
        db.session.rollback()
        return json_response(404, True, str(error))
    except ValueError as error:
        db.session.rollback()
        return json_response(400, True, str(error) or "Revisa precio y stock.")
    except Exception as error:
        db.session.rollback()
        return server_error_response()


@app.route("/api/books/<int:id>", methods=["DELETE"])
@token_required
def delete_book(current_user, id):
    try:
        book = Book.query.get_or_404(id)
        sync_book_promo_pair(book, None)
        if len(book.order_items) > 0:
            book.active = False
            book.stock = 0
            db.session.commit()
            return json_response(200, False, "Libro archivado.")

        db.session.delete(book)
        db.session.commit()
        return json_response(200, False, "Libro eliminado.")
    except Exception as error:
        db.session.rollback()
        return server_error_response()


@app.route("/api/categories", methods=["GET"])
def get_categories():
    try:
        categories = Category.query.order_by(Category.nombre.asc()).all()
        return json_response(
            200,
            False,
            "Categorías cargadas.",
            [{"id": category.id, "nombre": category.nombre} for category in categories],
        )
    except Exception as error:
        return server_error_response()


@app.route("/api/categories", methods=["POST"])
@token_required
def add_category(current_user):
    try:
        data = get_json_body()
        nombre = normalize_text(data.get("nombre"), "Nombre de categoría", 100, required=True, min_length=2)

        existing_category = Category.query.filter(Category.nombre.ilike(nombre)).first()
        if existing_category:
            return json_response(409, True, "La categoría ya existe.")

        category = Category(nombre=nombre)
        db.session.add(category)
        db.session.commit()

        return json_response(
            201,
            False,
            "Categoría creada.",
            {"id": category.id, "nombre": category.nombre},
        )
    except ValueError as error:
        db.session.rollback()
        return json_response(400, True, str(error))
    except Exception as error:
        db.session.rollback()
        return server_error_response()


@app.route("/api/categories/<int:id>", methods=["DELETE"])
@token_required
def delete_category(current_user, id):
    try:
        category = Category.query.get_or_404(id)
        books_with_stock = Book.query.filter(
            Book.category_id == category.id,
            Book.active.is_(True),
            Book.stock > 0,
        ).all()

        if books_with_stock:
            return json_response(
                400,
                True,
                "La categoría tiene libros en stock.",
            )

        books_to_release = Book.query.filter(Book.category_id == category.id).all()
        for book in books_to_release:
            book.category_id = None

        db.session.delete(category)
        db.session.commit()
        return json_response(200, False, "Categoría eliminada.")
    except Exception as error:
        db.session.rollback()
        return server_error_response()


@app.route("/api/admin/overview", methods=["GET"])
@token_required
def admin_overview(current_user):
    try:
        now = datetime.datetime.utcnow()
        current_month_start = start_of_month(now)
        previous_month_end = current_month_start - datetime.timedelta(seconds=1)
        previous_month_start = start_of_month(previous_month_end)
        start_date = parse_iso_date(request.args.get("start_date"))
        end_date = parse_iso_date(request.args.get("end_date"), end_of_day=True)

        books = Book.query.order_by(Book.created_at.desc()).all()
        orders = Order.query.order_by(Order.date.desc()).all()
        filtered_orders = filter_orders_list(orders, start_date=start_date, end_date=end_date)
        categories = Category.query.order_by(Category.nombre.asc()).all()

        current_month_orders = [
            order for order in filtered_orders if order.date and order.date >= current_month_start
        ]
        previous_month_orders = [
            order
            for order in filtered_orders
            if order.date and previous_month_start <= order.date < current_month_start
        ]

        delivered_orders = [
            order
            for order in filtered_orders
            if normalize_order_status(order.status) == "delivered"
        ]
        delivered_current_month_orders = [
            order for order in current_month_orders if normalize_order_status(order.status) == "delivered"
        ]
        delivered_previous_month_orders = [
            order for order in previous_month_orders if normalize_order_status(order.status) == "delivered"
        ]

        total_revenue = round(sum(float(order.total or 0) for order in delivered_orders), 2)
        current_month_revenue = round(
            sum(float(order.total or 0) for order in delivered_current_month_orders), 2
        )
        previous_month_revenue = round(
            sum(float(order.total or 0) for order in delivered_previous_month_orders), 2
        )
        revenue_delta = round(current_month_revenue - previous_month_revenue, 2)

        low_stock_books = [book for book in books if (book.stock or 0) <= 3]
        out_of_stock_books = [book for book in books if (book.stock or 0) <= 0]
        inventory_value = round(
            sum(
                (book.stock or 0)
                * float(book.precio_oferta if book.oferta and book.precio_oferta else book.precio or 0)
                for book in books
            ),
            2,
        )

        status_counts = {
            "pending": 0,
            "confirmed": 0,
            "processing": 0,
            "shipped": 0,
            "ready_for_pickup": 0,
            "delivered": 0,
            "cancelled": 0,
        }
        for order in filtered_orders:
            normalized_status = normalize_order_status(order.status) or "pending"
            if normalized_status in status_counts:
                status_counts[normalized_status] += 1

        monthly_map = {}
        for offset in range(5, -1, -1):
            month_cursor = start_of_month(now) - datetime.timedelta(days=offset * 30)
            key = month_cursor.strftime("%Y-%m")
            monthly_map[key] = {
                "label": month_cursor.strftime("%b %Y"),
                "revenue": 0,
                "orders": 0,
            }

        for order in delivered_orders:
            if not order.date:
                continue
            key = order.date.strftime("%Y-%m")
            if key in monthly_map:
                monthly_map[key]["orders"] += 1
                monthly_map[key]["revenue"] = round(
                    monthly_map[key]["revenue"] + float(order.total or 0),
                    2,
                )

        top_books = sorted(
            books,
            key=lambda book: sum(
                item.quantity
                for item in book.order_items
                if item.order and normalize_order_status(item.order.status) == "delivered"
            ),
            reverse=True,
        )[:5]

        return json_response(
            200,
            False,
            "Panel cargado.",
            {
                "stats": {
                    "books_count": len(books),
                    "categories_count": len(categories),
                    "orders_count": len(filtered_orders),
                    "pending_orders": status_counts["pending"],
                    "delivered_orders": status_counts["delivered"],
                    "low_stock_count": len(low_stock_books),
                    "out_of_stock_count": len(out_of_stock_books),
                    "inventory_value": inventory_value,
                    "total_revenue": total_revenue,
                    "current_month_revenue": current_month_revenue,
                    "previous_month_revenue": previous_month_revenue,
                    "revenue_delta": revenue_delta,
                    "current_month_orders": len(current_month_orders),
                },
                "status_breakdown": status_counts,
                "monthly_sales": list(monthly_map.values()),
                "date_filter": {
                    "start_date": start_date.strftime("%Y-%m-%d") if start_date else "",
                    "end_date": end_date.strftime("%Y-%m-%d") if end_date else "",
                },
                "top_books": [
                    {
                        "id": book.id,
                        "titulo": book.titulo,
                        "autor": book.autor,
                        "sold_units": sum(
                            item.quantity
                            for item in book.order_items
                            if item.order and normalize_order_status(item.order.status) == "delivered"
                        ),
                        "stock": book.stock,
                    }
                    for book in top_books
                ],
                "recent_orders": [serialize_order(order) for order in filtered_orders[:5]],
                "alerts": {
                    "low_stock": [serialize_admin_book(book) for book in low_stock_books[:6]],
                    "out_of_stock": [serialize_admin_book(book) for book in out_of_stock_books[:6]],
                },
            },
        )
    except Exception as error:
        return server_error_response()


@app.route("/api/admin/books", methods=["GET"])
@token_required
def admin_books(current_user):
    try:
        books = Book.query.order_by(Book.active.desc(), Book.created_at.desc()).all()
        return json_response(
            200,
            False,
            "Libros cargados.",
            [serialize_admin_book(book) for book in books],
        )
    except Exception as error:
        return server_error_response()


@app.route("/api/admin/inventory", methods=["GET"])
@token_required
def admin_inventory(current_user):
    try:
        books = Book.query.order_by(Book.active.desc(), Book.stock.asc(), Book.titulo.asc()).all()
        summary = {
            "total_units": sum(book.stock or 0 for book in books),
            "inventory_value": round(
                sum(
                    (book.stock or 0)
                    * float(book.precio_oferta if book.oferta and book.precio_oferta else book.precio or 0)
                    for book in books
                ),
                2,
            ),
            "low_stock_count": sum(1 for book in books if (book.stock or 0) <= 3),
            "out_of_stock_count": sum(1 for book in books if (book.stock or 0) <= 0),
        }
        return json_response(
            200,
            False,
            "Inventario cargado.",
            {
                "summary": summary,
                "items": [serialize_admin_book(book) for book in books],
            },
        )
    except Exception as error:
        return server_error_response()


@app.route("/api/admin/orders", methods=["GET"])
@token_required
def admin_orders(current_user):
    try:
        status_filter = normalize_order_status(request.args.get("status", ""))
        search = normalize_text(request.args.get("search", ""), "Búsqueda", 80)
        start_date = parse_iso_date(request.args.get("start_date"))
        end_date = parse_iso_date(request.args.get("end_date"), end_of_day=True)

        orders = Order.query.order_by(Order.date.desc()).all()
        orders = filter_orders_list(
            orders,
            start_date=start_date,
            end_date=end_date,
            status_filter=status_filter,
            search=search,
        )

        return json_response(
            200,
            False,
            "Órdenes cargadas.",
            [serialize_order(order) for order in orders],
        )
    except Exception as error:
        return server_error_response()


@app.route("/api/admin/orders/<int:id>/status", methods=["PUT"])
@token_required
def update_order_status(current_user, id):
    try:
        order = Order.query.get_or_404(id)
        data = get_json_body()
        normalized_status = normalize_order_status(data.get("status"))

        if not normalized_status:
            return json_response(400, True, "Estado inválido.")

        previous_status = order.status
        sync_order_inventory(previous_status, normalized_status, order)
        order.status = normalized_status
        order.order_status = normalized_status
        db.session.commit()

        return json_response(200, False, "Estado actualizado.", serialize_order(order))
    except ValueError as error:
        db.session.rollback()
        return json_response(400, True, str(error))
    except Exception as error:
        db.session.rollback()
        return server_error_response()


@app.route("/api/admin/orders/<int:id>/payment-status", methods=["PUT"])
@token_required
def update_order_payment_status(current_user, id):
    try:
        order = Order.query.get_or_404(id)
        data = get_json_body()
        payment_status = normalize_payment_status(data.get("payment_status"))

        if not payment_status:
            return json_response(400, True, "Estado de pago inválido.")

        order.payment_status = payment_status
        db.session.commit()

        return json_response(200, False, "Estado de pago actualizado.", serialize_order(order))
    except Exception as error:
        db.session.rollback()
        return server_error_response()


@app.route("/api/admin/orders/export", methods=["GET"])
@token_required
def export_orders(current_user):
    try:
        status_filter = normalize_order_status(request.args.get("status", ""))
        search = normalize_text(request.args.get("search", ""), "Búsqueda", 80)
        start_date = parse_iso_date(request.args.get("start_date"))
        end_date = parse_iso_date(request.args.get("end_date"), end_of_day=True)

        orders = Order.query.order_by(Order.date.desc()).all()
        orders = filter_orders_list(
            orders,
            start_date=start_date,
            end_date=end_date,
            status_filter=status_filter,
            search=search,
        )

        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(
            [
                "Número de orden",
                "Fecha",
                "Estado",
                "Cliente",
                "Cédula",
                "Correo",
                "Teléfono",
                "Tipo de envío",
                "Provincia",
                "Municipio / sector",
                "Sucursal BM Cargo",
                "Dirección sucursal BM Cargo",
                "Nota adicional",
                "Método de pago",
                "Estado de pago",
                "Comprobante",
                "Dirección",
                "Subtotal RD$",
                "Promo 2x1 RD$",
                "Descuento RD$",
                "Envío RD$",
                "Total RD$",
                "Items",
            ]
        )
        for order in orders:
            items_summary = " | ".join(
                [f"{item.book.titulo if item.book else 'Libro'} x{item.quantity}" for item in order.items]
            )
            writer.writerow(
                [
                    escape_csv_value(order.order_number),
                    order.date.strftime("%Y-%m-%d %H:%M") if order.date else "",
                    escape_csv_value(order.status),
                    escape_csv_value(order.customer_name),
                    escape_csv_value(getattr(order, "customer_cedula", "")),
                    escape_csv_value(order.customer_email),
                    escape_csv_value(order.customer_phone),
                    escape_csv_value(DELIVERY_TYPE_LABELS.get(getattr(order, "delivery_type", ""), "")),
                    escape_csv_value(getattr(order, "province", "")),
                    escape_csv_value(getattr(order, "municipality_sector", "")),
                    escape_csv_value(getattr(order, "bm_cargo_branch", "")),
                    escape_csv_value(getattr(order, "bm_cargo_branch_address", "")),
                    escape_csv_value(getattr(order, "delivery_note", "")),
                    escape_csv_value(PAYMENT_METHOD_LABELS.get(getattr(order, "payment_method", ""), "")),
                    escape_csv_value(PAYMENT_STATUS_LABELS.get(getattr(order, "payment_status", ""), "")),
                    escape_csv_value(getattr(order, "transfer_receipt_url", "")),
                    escape_csv_value(order.customer_address),
                    f"{float(order.subtotal or order.total or 0):.2f}",
                    f"{float(order.promo_discount_amount or 0):.2f}",
                    f"{float(order.discount_amount or 0):.2f}",
                    f"{float(getattr(order, 'shipping_cost', 0) or 0):.2f}",
                    f"{float(order.total or 0):.2f}",
                    escape_csv_value(items_summary),
                ]
            )

        filename = f"ordenes-bookshop-{datetime.datetime.utcnow().strftime('%Y%m%d-%H%M%S')}.csv"
        return Response(
            output.getvalue(),
            mimetype="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as error:
        return server_error_response()


@app.route("/api/orders/quote", methods=["POST"])
def quote_order():
    try:
        data = get_json_body()
        order_lines = build_order_lines(data.get("items", []))
        summary = calculate_checkout_summary(order_lines)
        return json_response(
            200,
            False,
            "Resumen calculado.",
            {
                **summary,
                "items": [
                    {
                        "book_id": line["book"].id,
                        "titulo": line["titulo"],
                        "quantity": line["quantity"],
                        "price": line["price"],
                        "line_total": line["line_total"],
                    }
                    for line in order_lines
                ],
            },
        )
    except LookupError as error:
        return json_response(404, True, str(error))
    except ValueError as error:
        return json_response(400, True, str(error))
    except Exception as error:
        return server_error_response()


@app.route("/api/checkout", methods=["POST"])
def checkout_order():
    try:
        data = get_checkout_body()
        customer_name = normalize_text(data.get("customer_name"), "Nombre", 150, required=True, min_length=2)
        customer_cedula = normalize_text(data.get("customer_cedula"), "Cédula", 30, required=True, min_length=5)
        customer_email = normalize_email(data.get("customer_email"), required=False)
        customer_phone = normalize_phone(data.get("customer_phone"), required=True)
        province = normalize_text(data.get("province"), "Provincia", 100, required=True, min_length=2)
        municipality_sector = normalize_text(
            data.get("municipality_sector"),
            "Municipio / sector",
            150,
            required=True,
            min_length=2,
        )
        bm_cargo_branch = normalize_text(
            data.get("bm_cargo_branch"),
            "Sucursal BM Cargo",
            150,
            required=True,
            min_length=2,
        )
        bm_cargo_branch_address = resolve_bm_cargo_branch_address(bm_cargo_branch)
        if not bm_cargo_branch_address:
            bm_cargo_branch_address = normalize_text(
                data.get("bm_cargo_branch_address"),
                "Dirección de sucursal BM Cargo",
                300,
                required=True,
                min_length=6,
            )
        delivery_note = normalize_text(
            data.get("delivery_note"),
            "Nota adicional",
            500,
            allow_newlines=True,
        )
        delivery_type = normalize_delivery_type(data.get("delivery_type"), province)
        shipping_cost = calculate_shipping_cost(delivery_type, province)
        payment_method = normalize_payment_method(data.get("payment_method"))
        receipt_file = request.files.get("transfer_receipt")

        if payment_method == "transfer":
            validate_transfer_receipt(receipt_file)
            payment_status = "transfer_sent"
        else:
            payment_status = "pending_whatsapp"

        customer_address = normalize_text(
            data.get("customer_address"),
            "Dirección",
            250,
            allow_newlines=True,
        )
        if not customer_address:
            customer_address = (
                f"{municipality_sector}, {province}. Retiro BM Cargo: {bm_cargo_branch}"
            )

        order_lines = build_order_lines(data.get("items", []))
        summary = calculate_checkout_summary(order_lines)
        total = round(float(summary["total"]) + float(shipping_cost), 2)

        order = Order(
            customer_name=customer_name,
            customer_cedula=customer_cedula,
            customer_email=customer_email,
            customer_phone=customer_phone,
            customer_address=customer_address,
            delivery_type=delivery_type,
            province=province,
            municipality_sector=municipality_sector,
            bm_cargo_branch=bm_cargo_branch,
            bm_cargo_branch_address=bm_cargo_branch_address,
            delivery_note=delivery_note,
            payment_method=payment_method,
            payment_status=payment_status,
            order_status="pending",
            status="pending",
            subtotal=summary["subtotal"],
            discount_rate=summary["discount_rate"],
            discount_amount=summary["discount_amount"],
            promo_discount_amount=summary["promo_discount_amount"],
            shipping_cost=shipping_cost,
            total=total,
        )

        db.session.add(order)
        db.session.flush()
        order.order_number = create_order_number(order.id)

        if payment_method == "transfer":
            order.transfer_receipt_url = save_transfer_receipt(receipt_file, order)

        for line in order_lines:
            db.session.add(
                OrderItem(
                    order_id=order.id,
                    book_id=line["book"].id,
                    quantity=line["quantity"],
                    price=line["price"],
                    product_name=line["titulo"],
                    unit_price=line["price"],
                    total_price=line["line_total"],
                )
            )
            line["book"].stock -= line["quantity"]

        db.session.commit()

        whatsapp_message = build_whatsapp_message(order, order_lines)
        whatsapp_link = build_whatsapp_link(whatsapp_message)
        customer_whatsapp_link = build_customer_whatsapp_link(order)

        email_sent = False
        try:
            email_sent = send_order_email(order, order_lines)
        except Exception:
            email_sent = False

        return json_response(
            201,
            False,
            "Pedido creado.",
            {
                "order_number": order.order_number,
                "subtotal": summary["subtotal"],
                "discount_rate": summary["discount_rate"],
                "discount_amount": summary["discount_amount"],
                "promo_discount_amount": summary["promo_discount_amount"],
                "promotions": summary["promotions"],
                "shipping_cost": shipping_cost,
                "total": total,
                "payment_method": payment_method,
                "payment_status": payment_status,
                "transfer_receipt_url": order.transfer_receipt_url or "",
                "whatsapp_link": whatsapp_link,
                "owner_whatsapp_link": whatsapp_link,
                "customer_whatsapp_link": customer_whatsapp_link,
                "email_sent": email_sent,
                "items": [
                    {
                        "titulo": line["titulo"],
                        "quantity": line["quantity"],
                        "price": line["price"],
                        "line_total": line["line_total"],
                    }
                    for line in order_lines
                ],
            },
        )
    except LookupError as error:
        db.session.rollback()
        return json_response(404, True, str(error))
    except ValueError as error:
        db.session.rollback()
        return json_response(400, True, str(error))
    except Exception as error:
        db.session.rollback()
        return server_error_response()


@app.route("/api/orders", methods=["POST"])
def create_order():
    try:
        data = get_json_body()
        customer_name = normalize_text(data.get("customer_name"), "Nombre", 150, required=True, min_length=2)
        customer_email = normalize_email(data.get("customer_email"), required=True)
        customer_phone = normalize_phone(data.get("customer_phone"), required=True)
        customer_address = normalize_text(
            data.get("customer_address"),
            "Dirección",
            250,
            required=True,
            min_length=6,
            allow_newlines=True,
        )
        items = data.get("items", [])

        order_lines = build_order_lines(items)
        summary = calculate_checkout_summary(order_lines)

        order = Order(
            customer_name=customer_name,
            customer_email=customer_email,
            customer_phone=customer_phone,
            customer_address=customer_address,
            subtotal=summary["subtotal"],
            discount_rate=summary["discount_rate"],
            discount_amount=summary["discount_amount"],
            promo_discount_amount=summary["promo_discount_amount"],
            shipping_cost=0,
            total=summary["total"],
            order_status="pending",
            status="pending",
        )

        db.session.add(order)
        db.session.flush()
        order.order_number = create_order_number(order.id)

        for line in order_lines:
            db.session.add(
                OrderItem(
                    order_id=order.id,
                    book_id=line["book"].id,
                    quantity=line["quantity"],
                    price=line["price"],
                    product_name=line["titulo"],
                    unit_price=line["price"],
                    total_price=line["line_total"],
                )
            )
            line["book"].stock -= line["quantity"]

        db.session.commit()

        whatsapp_message = build_whatsapp_message(order, order_lines)
        whatsapp_link = build_whatsapp_link(whatsapp_message)
        customer_whatsapp_link = build_customer_whatsapp_link(order)

        email_sent = False
        try:
            email_sent = send_order_email(order, order_lines)
        except Exception:
            email_sent = False

        return json_response(
            201,
            False,
            "Pedido creado.",
            {
                "order_number": order.order_number,
                "subtotal": summary["subtotal"],
                "discount_rate": summary["discount_rate"],
                "discount_amount": summary["discount_amount"],
                "promo_discount_amount": summary["promo_discount_amount"],
                "promotions": summary["promotions"],
                "total": summary["total"],
                "whatsapp_link": whatsapp_link,
                "owner_whatsapp_link": whatsapp_link,
                "customer_whatsapp_link": customer_whatsapp_link,
                "email_sent": email_sent,
                "items": [
                    {
                        "titulo": line["titulo"],
                        "quantity": line["quantity"],
                        "price": line["price"],
                        "line_total": line["line_total"],
                    }
                    for line in order_lines
                ],
            },
        )
    except LookupError as error:
        db.session.rollback()
        return json_response(404, True, str(error))
    except ValueError as error:
        db.session.rollback()
        return json_response(400, True, str(error))
    except Exception as error:
        db.session.rollback()
        return server_error_response()


if __name__ == "__main__":
    app.run(debug=app.config.get("DEBUG", False))
