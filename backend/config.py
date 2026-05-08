import os


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///database.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    WHATSAPP_NUMBER = os.getenv("WHATSAPP_NUMBER", "8097093803")

    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER", "sebastianmatias1027@gmail.com")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "Money1027.")
    SMTP_FROM = os.getenv("SMTP_FROM", "sebastianmatias1027@gmail.com")
    SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() in {"true", "1", "yes"}
