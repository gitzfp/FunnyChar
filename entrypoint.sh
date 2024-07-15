#!/bin/sh
set -e
alembic upgrade head
uvicorn characters.main:app --host 0.0.0.0
