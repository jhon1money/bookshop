from flask_login import LoginManager, login_user, login_required, logout_user

from models import db, Book, Order, OrderItem, Admin, Category

app = Flask(__name__)
app.config.from_object(Config)

app.secret_key = app.config.get("SECRET_KEY", "supersecretkey")
db.init_app(app)


login_manager = LoginManager()
login_manager.init_app(app)


# =========================
# LOGIN MANAGER
# =========================
@login_manager.user_loader
def load_user(user_id: int):
    return db.session.get(Admin, user_id)


@app.route("/api/auth/login", methods=["POST"])
def login():
    try:
        username = request.form["username"]
        password = request.form["password"]

        admin = Admin.query.filter_by(username=username).first()

        if admin and check_password_hash(admin.password, password):
            login_user(admin)
            # return redirect(url_for("dashboard"))
            # HTTP CODES IN MDN
            return jsonify({
                "code": 200,
                "error": False,
                "result": {
                    "token": "example"
                    },
                "message":"Login Success"
            })

    except Exception as e:
        msg = f"Error during login: {e}"
        print(msg) 
        return msg  


@app.route("/api/auth/logout")
@login_required
def logout():
    logout_user()
    return "{}"
