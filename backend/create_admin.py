from app import app
from models import db, Admin
from werkzeug.security import generate_password_hash

with app.app_context():

    existing_admin = Admin.query.filter_by(username="admin_jhon").first()

    if existing_admin:
        print("El administrador ya existe.")
    else:
        password_hash = generate_password_hash("admin123")
        admin = Admin(username="admin_jhon", password=password_hash)

        db.session.add(admin)
        db.session.commit()

        print("Administrador creado correctamente.")