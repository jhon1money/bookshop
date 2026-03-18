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

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    category_id = db.Column(db.Integer, db.ForeignKey("category.id"), nullable=True)

    order_items = db.relationship("OrderItem", backref="book_info", lazy=True)


class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    customer_name = db.Column(db.String(150))
    customer_phone = db.Column(db.String(50))
    customer_address = db.Column(db.String(250))

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