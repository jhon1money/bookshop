import os

from app import app
from models import db, Admin
from werkzeug.security import generate_password_hash

with app.app_context():
    admin_username = os.getenv("ADMIN_USERNAME")
    admin_password = os.getenv("ADMIN_PASSWORD")

    if not admin_username or not admin_password:
        raise RuntimeError("Define ADMIN_USERNAME y ADMIN_PASSWORD antes de crear el administrador.")

    if len(admin_password) < 12:
        raise RuntimeError("ADMIN_PASSWORD debe tener al menos 12 caracteres.")

    existing_admin = Admin.query.filter(Admin.username.ilike(admin_username)).first()

    if existing_admin:
        print("El administrador ya existe.")
    else:
        password_hash = generate_password_hash(admin_password)
        admin = Admin(username=admin_username, password=password_hash)

        db.session.add(admin)
        db.session.commit()

        print("Administrador creado correctamente.")
