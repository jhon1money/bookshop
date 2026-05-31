from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from flask_login import UserMixin

db = SQLAlchemy()


class Admin(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)


class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), unique=True, nullable=False)
    books = db.relationship("Book", backref="category", lazy=True, cascade="all, delete")


class Book(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    titulo = db.Column(db.String(200), nullable=False)
    autor = db.Column(db.String(200), nullable=False)

    precio = db.Column(db.Float, nullable=False)
    precio_oferta = db.Column(db.Float)

    descripcion = db.Column(db.Text, nullable=False)

    imagen = db.Column(db.String(200))

    stock = db.Column(db.Integer, default=0)

    oferta = db.Column(db.Boolean, default=False)
    active = db.Column(db.Boolean, default=True)
    destacado = db.Column(db.Boolean, default=False)
    novedad = db.Column(db.Boolean, default=False)
    preventa = db.Column(db.Boolean, default=False)
    recomendado = db.Column(db.Boolean, default=False)
    promo_2x1 = db.Column(db.Boolean, default=False)
    promo_2x1_partner_id = db.Column(db.Integer, db.ForeignKey("book.id"), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    category_id = db.Column(db.Integer, db.ForeignKey("category.id"), nullable=True)

    order_items = db.relationship("OrderItem", backref="book_info", lazy=True)


class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    order_number = db.Column(db.String(50), unique=True)
    customer_name = db.Column(db.String(150))
    customer_email = db.Column(db.String(150))
    customer_phone = db.Column(db.String(50))
    customer_address = db.Column(db.String(250))
    status = db.Column(db.String(50), default="pending")

    subtotal = db.Column(db.Float)
    discount_rate = db.Column(db.Float, default=0)
    discount_amount = db.Column(db.Float, default=0)
    promo_discount_amount = db.Column(db.Float, default=0)
    total = db.Column(db.Float)

    date = db.Column(db.DateTime, default=datetime.utcnow)

    items = db.relationship("OrderItem", backref="order", lazy=True)


class OrderItem(db.Model):

    id = db.Column(db.Integer, primary_key=True)

    order_id = db.Column(db.Integer, db.ForeignKey('order.id'), nullable=False)

    book_id = db.Column(db.Integer, db.ForeignKey('book.id'), nullable=False)

    quantity = db.Column(db.Integer, nullable=False)

    price = db.Column(db.Float, nullable=False)

    # RELACIÓN CON BOOK
    book = db.relationship("Book")


class SiteSection(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(80), unique=True, nullable=False)
    title = db.Column(db.String(200))
    subtitle = db.Column(db.String(250))
    body = db.Column(db.Text)
    image_url = db.Column(db.String(400))
    cta_text = db.Column(db.String(120))
    cta_link = db.Column(db.String(200))
    items_json = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class BlogPost(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("order.id"), nullable=False)
    order_number = db.Column(db.String(50), nullable=False)
    author_name = db.Column(db.String(150), nullable=False)
    title = db.Column(db.String(180), nullable=False)
    body = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(50), default="published")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    order = db.relationship("Order")
    comments = db.relationship(
        "BlogComment",
        backref="post",
        lazy=True,
        cascade="all, delete-orphan",
        order_by="BlogComment.created_at.asc()",
    )


class BlogComment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey("blog_post.id"), nullable=False)
    order_id = db.Column(db.Integer, db.ForeignKey("order.id"), nullable=False)
    order_number = db.Column(db.String(50), nullable=False)
    author_name = db.Column(db.String(150), nullable=False)
    body = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    order = db.relationship("Order")
