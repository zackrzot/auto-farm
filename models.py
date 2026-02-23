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