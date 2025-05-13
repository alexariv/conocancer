import os
from dotenv import load_dotenv

# 1) load before anything else reads os.environ
load_dotenv()

class Config:
    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://"
        f"{os.environ['DB_USER']}:{os.environ['DB_PASSWORD']}@"
        f"{os.environ['DB_HOST']}:{os.environ.get('DB_PORT','3306')}/"
        f"{os.environ['DB_NAME']}"
    )
    SECRET_KEY = os.environ['FLASK_SECRET_KEY']

