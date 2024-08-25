import datetime

from sqlalchemy import Column, DateTime, Integer, JSON, String, Unicode
from sqlalchemy.inspection import inspect

from characters.database.base import Base


class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, index=True, nullable=False)
    client_id = Column(Integer)  # deprecated, use user_id instead
    user_id = Column(String(50))
    session_id = Column(String(50))

    client_message = Column(String(1000))
    server_message = Column(String(1000))

    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    platform = Column(String(50))
    action_type = Column(String(50))
    character_id = Column(String(100))
    tools = Column(String(100))
    language = Column(String(10))
    message_id = Column(String(64))
    llm_config = Column(JSON())
    audio_url = Column(String(255), nullable=True)

    def to_dict(self):
        return {
            c.key: getattr(self, c.key).isoformat()
            if isinstance(getattr(self, c.key), datetime.datetime)
            else getattr(self, c.key)
            for c in inspect(self).mapper.column_attrs
        }

    def save(self, db):
        db.add(self)
        db.commit()
