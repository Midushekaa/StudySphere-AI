"""
EduBot - Database Connection Module
Manages MySQL connection using mysql-connector-python
"""

import mysql.connector
from mysql.connector import Error
import os

# ── Database configuration ──────────────────────────────────
DB_CONFIG = {
    "host":     os.getenv("DB_HOST",     "localhost"),
    "port":     int(os.getenv("DB_PORT", 3306)),
    "user":     os.getenv("DB_USER",     "root"),
    "password": os.getenv("DB_PASSWORD", "zbook@hp2025"),   # ← change this
    "database": os.getenv("DB_NAME",     "edubot"),
    "charset":  "utf8mb4",
    "autocommit": True,
}


def get_connection():
    """Return a live MySQL connection."""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        return conn
    except Error as e:
        print(f"[DB] Connection error: {e}")
        raise


def fetch_all(sql: str, params: tuple = ()):
    """Execute a SELECT and return all rows as a list of dicts."""
    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(sql, params)
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()


def fetch_one(sql: str, params: tuple = ()):
    """Execute a SELECT and return the first row as a dict (or None)."""
    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(sql, params)
        return cursor.fetchone()
    finally:
        cursor.close()
        conn.close()


def execute(sql: str, params: tuple = ()):
    """Execute an INSERT / UPDATE / DELETE. Returns lastrowid."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        conn.commit()
        return cursor.lastrowid
    finally:
        cursor.close()
        conn.close()
