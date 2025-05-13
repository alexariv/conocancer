import os

class Config:
    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://"
        f"{os.environ['DB_USER']}:{os.environ['DB_PASSWORD']}@"
        f"{os.environ['DB_HOST']}:{os.environ.get('DB_PORT','3306')}/"
        f"{os.environ['DB_NAME']}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

