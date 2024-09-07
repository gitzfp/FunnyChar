from sqlalchemy import Column, Integer, String

from characters.database.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    name = Column(String(100))
    phone = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True)
    password = Column(String(100), nullable=False)
    def save(self, db):
        db.add(self)
        db.commit()
