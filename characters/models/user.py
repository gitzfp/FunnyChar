from sqlalchemy import Column, Integer, String

from characters.database.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    name = Column(String(100))
    email = Column(String(100), unique=True, index=True, nullable=False)

    def save(self, db):
        db.add(self)
        db.commit()
