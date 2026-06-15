import os
import sys
from getpass import getpass

from app import app
from models import db, Admin
from werkzeug.security import generate_password_hash


def read_secret(name):
    return (os.getenv(name) or "").strip()


with app.app_context():
    admin_username = read_secret("ADMIN_USERNAME")
    admin_password = read_secret("ADMIN_PASSWORD")

    if (not admin_username or not admin_password) and sys.stdin.isatty():
        print("No se detectaron ADMIN_USERNAME y/o ADMIN_PASSWORD en esta sesión.")
        if not admin_username:
            admin_username = input("ADMIN_USERNAME: ").strip()
        if not admin_password:
            admin_password = getpass("ADMIN_PASSWORD: ").strip()

    if not admin_username or not admin_password:
        raise RuntimeError(
            "Define ADMIN_USERNAME y ADMIN_PASSWORD antes de crear el administrador. "
            "Si acabas de agregarlas en Render, abre una Shell nueva o redeploya el servicio."
        )

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
