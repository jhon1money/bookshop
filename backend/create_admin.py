from app import app
from models import db, Admin
from werkzeug.security import generate_password_hash

with app.app_context():

    existing_admin = Admin.query.filter_by(username="Cristofer25suarez@gmail.com").first()

    if existing_admin:
        print("El administrador ya existe.")
    else:
        password_hash = generate_password_hash("cristofer123")
        admin = Admin(username="Cristofer25suarez@gmail.com", password=password_hash)

        db.session.add(admin)
        db.session.commit()

        print("Administrador creado correctamente.")