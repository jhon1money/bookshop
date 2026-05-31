import csv
import datetime
import json
import smtplib
from email.message import EmailMessage
from functools import wraps
from io import StringIO
from urllib.parse import quote

import jwt
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from sqlalchemy import inspect, text
from werkzeug.security import check_password_hash

from config import Config
from models import Admin, BlogComment, BlogPost, Book, Category, Order, OrderItem, SiteSection, db


app = Flask(__name__)
app.config.from_object(Config)
app.config["JWT_SECRET"] = app.config.get("SECRET_KEY", "supersecretkey")

db.init_app(app)
CORS(app, resources={r"/api/*": {"origins": "*"}})


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


def ensure_order_schema():
    inspector = inspect(db.engine)
    existing_columns = {column["name"] for column in inspector.get_columns("order")}
    missing_sql = {
        "order_number": 'ALTER TABLE "order" ADD COLUMN order_number VARCHAR(50)',
        "customer_email": 'ALTER TABLE "order" ADD COLUMN customer_email VARCHAR(150)',
        "status": 'ALTER TABLE "order" ADD COLUMN status VARCHAR(50) DEFAULT "pending"',
        "subtotal": 'ALTER TABLE "order" ADD COLUMN subtotal FLOAT',
        "discount_rate": 'ALTER TABLE "order" ADD COLUMN discount_rate FLOAT DEFAULT 0',
        "discount_amount": 'ALTER TABLE "order" ADD COLUMN discount_amount FLOAT DEFAULT 0',
        "promo_discount_amount": 'ALTER TABLE "order" ADD COLUMN promo_discount_amount FLOAT DEFAULT 0',
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
                {"title": "Correo", "body": "Cristofer25suarez@gmail.com"},
                {"title": "Horario", "body": "Lunes a sábado de 9:00am a 9:00pm"},
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
    ensure_book_schema()
    seed_site_sections()


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
            return json_response(401, True, "Falta iniciar sesión.")

        parts = auth_header.split()
        if len(parts) != 2 or parts[0] != "Bearer":
            return json_response(401, True, "Acceso inválido.")

        token = parts[1]

        try:
            data = jwt.decode(token, app.config["JWT_SECRET"], algorithms=["HS256"])
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
    return {
        "id": item.id,
        "book_id": item.book_id,
        "titulo": item.book.titulo if item.book else "Libro eliminado",
        "autor": item.book.autor if item.book else "",
        "quantity": item.quantity,
        "price": item.price,
        "line_total": round(float(item.price) * item.quantity, 2),
    }


def serialize_order(order):
    items_subtotal = round(sum(float(item.price) * item.quantity for item in order.items), 2)
    subtotal = float(order.subtotal) if order.subtotal is not None else items_subtotal
    discount_amount = float(order.discount_amount or 0)
    promo_discount_amount = float(order.promo_discount_amount or 0)
    total = float(order.total) if order.total is not None else max(subtotal - discount_amount - promo_discount_amount, 0)

    return {
        "id": order.id,
        "order_number": order.order_number,
        "customer_name": order.customer_name,
        "customer_email": order.customer_email,
        "customer_phone": order.customer_phone,
        "customer_address": order.customer_address,
        "status": order.status,
        "subtotal": round(subtotal, 2),
        "discount_rate": float(order.discount_rate or 0),
        "discount_amount": round(discount_amount, 2),
        "promo_discount_amount": round(promo_discount_amount, 2),
        "total": round(total, 2),
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

    return round(discount, 2), promotions


def calculate_checkout_summary(order_lines):
    subtotal = round(sum(float(line["line_total"]) for line in order_lines), 2)
    total_units = sum(int(line["quantity"]) for line in order_lines)
    promo_discount_amount, promotions = calculate_promo_2x1_discount(order_lines)
    discounted_base = max(subtotal - promo_discount_amount, 0)

    if total_units >= 3:
        discount_rate = 0.20
    elif total_units == 2:
        discount_rate = 0.15
    else:
        discount_rate = 0

    discount_amount = round(discounted_base * discount_rate, 2)
    total = round(max(discounted_base - discount_amount, 0), 2)

    return {
        "subtotal": subtotal,
        "total_units": total_units,
        "discount_rate": discount_rate,
        "discount_amount": discount_amount,
        "promo_discount_amount": promo_discount_amount,
        "promotions": promotions,
        "total": total,
    }


def build_order_lines(items):
    if not isinstance(items, list) or not items:
        raise ValueError("Agrega libros al pedido.")

    order_lines = []

    for item in items:
        book_id = item.get("book_id")
        try:
            quantity = int(item.get("quantity", 0))
        except (TypeError, ValueError):
            raise ValueError("Cantidad inválida.")

        if not book_id or quantity <= 0:
            raise ValueError("Cantidad inválida.")

        book = db.session.get(Book, book_id)
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


def build_whatsapp_message(order, items):
    lines = [
        f"Hola, quiero confirmar mi pedido {order.order_number}.",
        "",
        f"Cliente: {order.customer_name}",
        f"Teléfono: {order.customer_phone}",
        f"Correo: {order.customer_email}",
        f"Dirección: {order.customer_address}",
        "",
        "Libros solicitados:",
    ]

    for item in items:
        lines.append(
            f"- {item['titulo']} x{item['quantity']} | RD$ {item['price']:.2f} c/u"
        )

    lines.extend(
        [
            "",
            f"Subtotal: RD$ {float(order.subtotal or 0):.2f}",
            f"Promoción 2x1: -RD$ {float(order.promo_discount_amount or 0):.2f}",
            f"Descuento por cantidad: -RD$ {float(order.discount_amount or 0):.2f}",
            f"Total del pedido: RD$ {order.total:.2f}",
            "Gracias.",
        ]
    )

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
            f"Total: RD$ {order.total:.2f}",
            f"Dirección de entrega: {order.customer_address}",
            "",
            "Gracias por comprar libros físicos con nosotros.",
        ]
    )

    html_items = "".join(
        [
            f"<tr><td style='padding:10px 0;border-bottom:1px solid #e8e1d2;font-size:14px;line-height:1.5'>{item['titulo']}</td><td style='padding:10px 0;border-bottom:1px solid #e8e1d2;text-align:center;font-size:14px'>{item['quantity']}</td><td style='padding:10px 0;border-bottom:1px solid #e8e1d2;text-align:right;font-size:14px'>RD$ {item['line_total']:.2f}</td></tr>"
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
                  <p style="margin:0 0 12px;font-size:15px;">Hola {order.customer_name},</p>
                  <p style="margin:0 0 16px;line-height:1.7;color:#555;font-size:14px;">
                    Tu pedido <strong>{order.order_number}</strong> fue registrado.
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
                      <td style="padding:14px 16px;font-size:14px;color:#555;">Total</td>
                      <td style="padding:14px 16px;text-align:right;font-size:16px;font-weight:700;">RD$ {order.total:.2f}</td>
                    </tr>
                    <tr>
                      <td colspan="2" style="padding:0 16px 16px;font-size:14px;line-height:1.6;color:#555;">
                        Dirección de entrega: {order.customer_address}
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
        ]

    return filtered_orders


def sync_book_promo_pair(book, partner_id):
    if partner_id not in [None, ""]:
        try:
            partner_id = int(partner_id)
        except (TypeError, ValueError):
            raise ValueError("Libro 2x1 inválido.")

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
    normalized_order_number = (order_number or "").strip().upper()
    if not normalized_order_number:
        raise ValueError("Ingresa tu número de orden.")

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
        data = request.get_json() or {}
        username = data.get("username", "").strip()
        password = data.get("password", "").strip()

        if not username or not password:
            return json_response(400, True, "Completa usuario y clave.")

        admin = Admin.query.filter_by(username=username).first()
        if not admin:
            return json_response(404, True, "Usuario no encontrado.")

        if not check_password_hash(admin.password, password):
            return json_response(401, True, "Clave incorrecta.")

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
        data = request.get_json() or {}
        section = SiteSection.query.filter_by(key=key).first()
        if not section:
            section = SiteSection(key=key)
            db.session.add(section)

        section.title = data.get("title", "")
        section.subtitle = data.get("subtitle", "")
        section.body = data.get("body", "")
        section.image_url = data.get("image_url", "")
        section.cta_text = data.get("cta_text", "")
        section.cta_link = data.get("cta_link", "")
        section.items_json = json.dumps(data.get("items", []), ensure_ascii=True)
        section.is_active = parse_bool(data.get("is_active", True), True)

        db.session.commit()
        return json_response(200, False, "Sección guardada.", serialize_site_section(section))
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
        data = request.get_json() or {}
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
        data = request.get_json() or {}
        order = validate_blog_order_number(data.get("order_number"))
        author_name = (data.get("author_name") or order.customer_name or "Lector SJ").strip()[:150]
        title = (data.get("title") or "").strip()[:180]
        body = (data.get("body") or "").strip()

        if len(title) < 4:
            return json_response(400, True, "Agrega un título claro para tu publicación.")
        if len(body) < 12:
            return json_response(400, True, "Cuéntanos un poco más antes de publicar.")

        post = BlogPost(
            order_id=order.id,
            order_number=order.order_number,
            author_name=author_name,
            title=title,
            body=body[:2500],
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
        data = request.get_json() or {}
        order = validate_blog_order_number(data.get("order_number"))
        author_name = (data.get("author_name") or order.customer_name or "Lector SJ").strip()[:150]
        body = (data.get("body") or "").strip()

        if len(body) < 4:
            return json_response(400, True, "Escribe un comentario un poco más completo.")

        comment = BlogComment(
            post_id=post.id,
            order_id=order.id,
            order_number=order.order_number,
            author_name=author_name,
            body=body[:1200],
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
        search = request.args.get("search", "").strip()
        category = request.args.get("category", "").strip()
        ofertas = request.args.get("ofertas", "").strip().lower()

        query = Book.query.filter(Book.active.is_(True))

        if search:
            query = query.filter(
                (Book.titulo.contains(search)) |
                (Book.autor.contains(search))
            )

        if category:
            if not category.isdigit():
                return json_response(400, True, "Categoría inválida.")
            query = query.filter(Book.category_id == int(category))

        if ofertas in ["true", "1", "yes"]:
            query = query.filter(Book.oferta.is_(True))

        books = query.order_by(Book.created_at.desc()).all()
        return json_response(
            200,
            False,
            "Libros cargados.",
            [serialize_book(book) for book in books],
        )
    except Exception as error:
        return server_error_response()


@app.route("/api/books", methods=["POST"])
@token_required
def add_book(current_user):
    try:
        data = request.get_json() or {}
        required_fields = ["titulo", "autor", "precio", "stock", "descripcion"]
        missing_fields = [
            field for field in required_fields if field not in data or data[field] in [None, ""]
        ]

        if missing_fields:
            field_names = {
                "titulo": "título",
                "autor": "autor",
                "precio": "precio",
                "stock": "stock",
                "descripcion": "descripción",
            }
            readable_fields = ", ".join(field_names.get(field, field) for field in missing_fields)
            return json_response(400, True, f"Completa: {readable_fields}.")

        category_id = data.get("category_id")
        if category_id is not None:
            category = db.session.get(Category, category_id)
            if not category:
                return json_response(404, True, "Categoría no encontrada.")

        book = Book(
            titulo=data["titulo"],
            autor=data["autor"],
            precio=float(data["precio"]),
            descripcion=data["descripcion"],
            stock=int(data["stock"]),
            category_id=category_id,
            oferta=parse_bool(data.get("oferta", False)),
            destacado=parse_bool(data.get("destacado", False)),
            novedad=parse_bool(data.get("novedad", False)),
            preventa=parse_bool(data.get("preventa", False)),
            recomendado=parse_bool(data.get("recomendado", False)),
            precio_oferta=float(data["precio_oferta"]) if data.get("precio_oferta") not in [None, ""] else None,
            imagen=data.get("imagen"),
        )

        db.session.add(book)
        db.session.flush()
        sync_book_promo_pair(book, data.get("promo_2x1_partner_id") if parse_bool(data.get("promo_2x1", False)) else None)
        db.session.commit()

        return json_response(201, False, "Libro creado.", {"id": book.id, "titulo": book.titulo})
    except ValueError as error:
        message = str(error)
        if message.startswith("could not") or message.startswith("invalid literal"):
            message = "Revisa precio y stock."
        return json_response(400, True, message or "Revisa precio y stock.")
    except Exception as error:
        db.session.rollback()
        return server_error_response()


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
                    return json_response(404, True, "Categoría no encontrada.")
            book.category_id = category_id
        if "oferta" in data:
            book.oferta = parse_bool(data["oferta"])
        if "destacado" in data:
            book.destacado = parse_bool(data["destacado"])
        if "novedad" in data:
            book.novedad = parse_bool(data["novedad"])
        if "preventa" in data:
            book.preventa = parse_bool(data["preventa"])
        if "recomendado" in data:
            book.recomendado = parse_bool(data["recomendado"])
        if "precio_oferta" in data:
            book.precio_oferta = (
                float(data["precio_oferta"]) if data["precio_oferta"] not in [None, ""] else None
            )
        if "imagen" in data:
            book.imagen = data["imagen"]
        if "promo_2x1" in data or "promo_2x1_partner_id" in data:
            sync_book_promo_pair(
                book,
                data.get("promo_2x1_partner_id") if parse_bool(data.get("promo_2x1", False)) else None,
            )

        db.session.commit()
        return json_response(200, False, "Libro actualizado.")
    except ValueError as error:
        message = str(error)
        if message.startswith("could not") or message.startswith("invalid literal"):
            message = "Revisa precio y stock."
        return json_response(400, True, message or "Revisa precio y stock.")
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
        data = request.get_json() or {}
        nombre = data.get("nombre", "").strip()

        if not nombre:
            return json_response(400, True, "Nombre requerido.")

        category = Category(nombre=nombre)
        db.session.add(category)
        db.session.commit()

        return json_response(
            201,
            False,
            "Categoría creada.",
            {"id": category.id, "nombre": category.nombre},
        )
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
        search = request.args.get("search", "").strip()
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
        data = request.get_json() or {}
        normalized_status = normalize_order_status(data.get("status"))

        if not normalized_status:
            return json_response(400, True, "Estado inválido.")

        previous_status = order.status
        sync_order_inventory(previous_status, normalized_status, order)
        order.status = normalized_status
        db.session.commit()

        return json_response(200, False, "Estado actualizado.", serialize_order(order))
    except ValueError as error:
        db.session.rollback()
        return json_response(400, True, str(error))
    except Exception as error:
        db.session.rollback()
        return server_error_response()


@app.route("/api/admin/orders/export", methods=["GET"])
@token_required
def export_orders(current_user):
    try:
        status_filter = normalize_order_status(request.args.get("status", ""))
        search = request.args.get("search", "").strip()
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
                "Correo",
                "Teléfono",
                "Dirección",
                "Subtotal RD$",
                "Promo 2x1 RD$",
                "Descuento RD$",
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
                    order.order_number,
                    order.date.strftime("%Y-%m-%d %H:%M") if order.date else "",
                    order.status,
                    order.customer_name,
                    order.customer_email,
                    order.customer_phone,
                    order.customer_address,
                    f"{float(order.subtotal or order.total or 0):.2f}",
                    f"{float(order.promo_discount_amount or 0):.2f}",
                    f"{float(order.discount_amount or 0):.2f}",
                    f"{float(order.total or 0):.2f}",
                    items_summary,
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
        data = request.get_json() or {}
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


@app.route("/api/orders", methods=["POST"])
def create_order():
    try:
        data = request.get_json() or {}
        customer_name = data.get("customer_name", "").strip()
        customer_email = data.get("customer_email", "").strip()
        customer_phone = data.get("customer_phone", "").strip()
        customer_address = data.get("customer_address", "").strip()
        items = data.get("items", [])

        if not customer_name or not customer_email or not customer_phone or not customer_address:
            return json_response(400, True, "Completa tus datos.")

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
            total=summary["total"],
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
    app.run(debug=True)
