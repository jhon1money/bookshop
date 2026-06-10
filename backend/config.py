import os
import secrets


def parse_origins(value):
    return [origin.strip().rstrip("/") for origin in (value or "").split(",") if origin.strip()]

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY") or secrets.token_urlsafe(32)
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///database.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 280,
    }

    DEBUG = os.getenv("FLASK_DEBUG", "false").lower() in {"true", "1", "yes"}
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", str(1024 * 1024)))
    JWT_ISSUER = os.getenv("JWT_ISSUER", "bookshop-api")
    JWT_AUDIENCE = os.getenv("JWT_AUDIENCE", "bookshop-admin")
    JWT_EXPIRATION_MINUTES = int(os.getenv("JWT_EXPIRATION_MINUTES", "120"))

    FRONTEND_URL = os.getenv("FRONTEND_URL", "https://libreriajs.com").rstrip("/")
    CORS_ORIGINS = parse_origins(os.getenv("CORS_ORIGINS")) or [
        FRONTEND_URL,
        "https://libreriajs.com",
        "https://www.libreriajs.com",
        "https://bookshop-rho-ebon.vercel.app",
        
    ]

    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "true").lower() in {"true", "1", "yes"}

    WHATSAPP_NUMBER = os.getenv("WHATSAPP_NUMBER", "18294475730")

    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
    SMTP_FROM = os.getenv("SMTP_FROM")

    SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() in {"true", "1", "yes"}
