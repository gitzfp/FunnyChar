import jwt
from datetime import datetime, timedelta, UTC
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session
from characters.database.connection import get_db
from characters.logger import get_logger
from characters.models.user import User
from characters.utils import verify_password, get_password_hash
import re

router = APIRouter()

# 添加密钥和过期时间设置
SECRET_KEY = "your_secret_key"  # 请替换为你的实际密钥
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

logger = get_logger(__name__)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(UTC) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

class LoginRequest(BaseModel):
    phoneNumber: str
    password: str

    @field_validator('phoneNumber')
    @classmethod
    def phone_number_valid(cls, v):
        if not re.match(r'^1[3-9]\d{9}$', v):
            raise ValueError('请输入有效的手机号码')
        return v

@router.post("/login")
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    try:
        # 检查用户是否存在
        user = db.query(User).filter(User.phone == request.phoneNumber).first()

        if not user:
            # 如果用户不存在，创建新用户
            new_user = User(
                phone=request.phoneNumber,
                password=get_password_hash(request.password)
            )
            new_user.save(db)
            token = create_access_token(data={"sub": new_user.phone})
            return {"message": "新用户注册成功", "userId": new_user.id, "token": token}
        else:
            # 如果用户存在，验证密码
            if verify_password(request.password, user.password):
                token = create_access_token(data={"sub": user.phone})
                return {"message": "���录成功", "userId": user.id, "token": token}
            else:
                logger.error(f"密码错误: {request.password} {user.password}")
                return JSONResponse(
                    status_code=401,
                    content={"detail": "密码错误"}
                )
    except ValueError as ve:
        return JSONResponse(
            status_code=400,
            content={"detail": str(ve)}
        )
    except Exception as e:
        logger.error(f"服务器错误: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": "服务器内部错误"}
        )
