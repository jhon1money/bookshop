class Config:
# TODO: Put all of the variables in a .env file
    SECRET_KEY = "supersecretkey"
    SQLALCHEMY_DATABASE_URI = "sqlite:///database.db" 
    SQLALCHEMY_TRACK_MODIFICATIONS = False