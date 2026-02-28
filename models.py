from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class SensorData(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    temp_f = db.Column(db.Float)
    fan_signal = db.Column(db.Float)
    hydrometer_a = db.Column(db.Float)
    hydrometer_b = db.Column(db.Float)
    humidity = db.Column(db.Float)

class TriggerLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    trigger_name = db.Column(db.String(100))
    active = db.Column(db.Boolean, default=False)

class WateringSchedule(db.Model):
    """Singleton row (id=1) storing the active watering schedule config."""
    id = db.Column(db.Integer, primary_key=True)
    enabled = db.Column(db.Boolean, default=True)
    duration_seconds = db.Column(db.Float, default=2.0)
    interval_hours = db.Column(db.Float, default=8.0)
    last_watered = db.Column(db.DateTime, nullable=True)

class WateringLog(db.Model):
    """Record of every completed watering cycle."""
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    duration_seconds = db.Column(db.Float)
    triggered_by = db.Column(db.String(50))  # 'schedule' or 'manual'