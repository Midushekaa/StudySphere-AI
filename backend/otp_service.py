"""
EduBot - OTP Email Service
Generates and sends 6-digit OTP codes via email for password reset.
Uses Flask-Mail with Gmail SMTP.
"""

import random
import string
import hashlib
from datetime import datetime, timedelta
from flask_mail import Mail, Message

# In-memory OTP store: { email: { otp_hash, expires_at, attempts } }
# In production this would be stored in the database
_otp_store = {}

mail = Mail()

# ── OTP config ───────────────────────────────────────────────
OTP_LENGTH      = 6
OTP_EXPIRY_MINS = 10     # OTP expires after 10 minutes
MAX_ATTEMPTS    = 3      # max wrong attempts before OTP is invalidated


def init_mail(app):
    """Call this from app.py to initialise Flask-Mail."""
    mail.init_app(app)


def _hash_otp(otp: str) -> str:
    """Hash the OTP before storing — never store plain OTPs."""
    return hashlib.sha256(otp.encode()).hexdigest()


def generate_otp() -> str:
    """Generate a secure 6-digit numeric OTP."""
    return ''.join(random.choices(string.digits, k=OTP_LENGTH))


def store_otp(email: str, otp: str) -> None:
    """Store hashed OTP with expiry time."""
    _otp_store[email.lower()] = {
        "otp_hash":   _hash_otp(otp),
        "expires_at": datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINS),
        "attempts":   0,
        "verified":   False,
    }


def verify_otp(email: str, otp: str) -> dict:
    """
    Verify the OTP submitted by the user.
    Returns { success: bool, message: str }
    """
    email = email.lower()
    record = _otp_store.get(email)

    if not record:
        return {"success": False, "message": "No OTP found. Please request a new one."}

    if datetime.utcnow() > record["expires_at"]:
        del _otp_store[email]
        return {"success": False, "message": "OTP has expired. Please request a new one."}

    if record["attempts"] >= MAX_ATTEMPTS:
        del _otp_store[email]
        return {"success": False, "message": "Too many incorrect attempts. Please request a new OTP."}

    if record["otp_hash"] != _hash_otp(otp):
        _otp_store[email]["attempts"] += 1
        remaining = MAX_ATTEMPTS - _otp_store[email]["attempts"]
        return {"success": False, "message": f"Incorrect OTP. {remaining} attempt(s) remaining."}

    # Mark as verified (allows password reset)
    _otp_store[email]["verified"] = True
    return {"success": True, "message": "OTP verified successfully!"}


def is_otp_verified(email: str) -> bool:
    """Check if the OTP for this email has been verified (to allow password reset)."""
    record = _otp_store.get(email.lower())
    if not record:
        return False
    if datetime.utcnow() > record["expires_at"]:
        return False
    return record.get("verified", False)


def clear_otp(email: str) -> None:
    """Remove OTP after successful password reset."""
    _otp_store.pop(email.lower(), None)


def send_otp_email(app, email: str, otp: str, user_name: str = "Student") -> dict:
    """
    Send the OTP to the user's email address.
    Returns { success: bool, message: str }
    """
    try:
        with app.app_context():
            msg = Message(
                subject="🔐 EduBot Password Reset OTP",
                recipients=[email],
            )
            msg.html = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; margin: 0; padding: 0; }}
    .wrapper {{ max-width: 520px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.1); }}
    .header {{ background: #0f1b2d; padding: 28px 32px; text-align: center; }}
    .header h1 {{ color: #e8c56a; font-size: 26px; margin: 0; font-family: Georgia, serif; }}
    .header p  {{ color: rgba(255,255,255,0.6); margin: 6px 0 0; font-size: 14px; }}
    .body {{ padding: 32px; }}
    .greeting {{ font-size: 16px; color: #0f1b2d; margin-bottom: 16px; }}
    .info {{ font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px; }}
    .otp-box {{ background: #f1f5f9; border: 2px dashed #e8c56a; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; }}
    .otp-label {{ font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }}
    .otp-code {{ font-size: 42px; font-weight: 700; color: #0f1b2d; letter-spacing: 12px; font-family: 'Courier New', monospace; }}
    .expiry {{ font-size: 12px; color: #94a3b8; margin-top: 10px; }}
    .warning {{ background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 12px 16px; font-size: 13px; color: #92400e; margin: 20px 0; }}
    .footer {{ background: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0; }}
    .footer p {{ font-size: 12px; color: #94a3b8; margin: 0; }}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>🎓 EduBot</h1>
      <p>AI University Assistant — Password Reset</p>
    </div>
    <div class="body">
      <p class="greeting">Hello {user_name},</p>
      <p class="info">
        We received a request to reset your EduBot password.
        Use the one-time password (OTP) below to verify your identity.
      </p>
      <div class="otp-box">
        <div class="otp-label">Your One-Time Password</div>
        <div class="otp-code">{otp}</div>
        <div class="expiry">⏱️ Expires in {OTP_EXPIRY_MINS} minutes</div>
      </div>
      <div class="warning">
        ⚠️ <strong>Never share this OTP</strong> with anyone.
        EduBot staff will never ask for your OTP.
        This code can only be used once.
      </div>
      <p class="info">
        If you did not request a password reset, please ignore this email.
        Your account is safe.
      </p>
    </div>
    <div class="footer">
      <p>© 2026 EduBot · London Metropolitan University · AI Coursework 2</p>
    </div>
  </div>
</body>
</html>
            """
            mail.send(msg)
            return {"success": True, "message": f"OTP sent to {email}"}
    except Exception as e:
        print(f"[Mail Error] {e}")
        return {"success": False, "message": str(e)}