import os
import pickle
import numpy as np
import pandas as pd
from pathlib import Path
from backend.app import config

class AnomalyService:
    def __init__(self):
        self.scaler_path = config.MODELS_DIR / "feature_scaler.pkl"
        self.model_path = config.MODELS_DIR / "isolation_forest.pkl"
        
        self.scaler = None
        self.model = None
        self.load_models()
        
        self.features = [
            "temperature_c",
            "vibration_mm_s",
            "pressure_bar",
            "rpm",
            "current_amp",
            "coolant_flow_lpm",
            "operating_load_pct"
        ]

    def load_models(self):
        try:
            if self.scaler_path.exists() and self.model_path.exists():
                with open(self.scaler_path, "rb") as f:
                    self.scaler = pickle.load(f)
                with open(self.model_path, "rb") as f:
                    self.model = pickle.load(f)
                print("Anomaly Service models loaded successfully.")
            else:
                print(f"Warning: Model files not found at {config.MODELS_DIR}. Model inference will not work.")
        except Exception as e:
            print(f"Error loading models in AnomalyService: {e}")

    def calculate_metrics(self, sensor_dict: dict) -> tuple[float, float]:
        """
        Calculates anomaly score and health index for a single sensor reading dictionary.
        Returns:
            anomaly_score (float): between 0.0 (normal) and 1.0 (anomalous)
            health_index (float): between 0.0 (dead) and 1.0 (healthy)
        """
        if self.scaler is None or self.model is None:
            # Fallback to defaults if model is not loaded
            return 0.0, 1.0

        try:
            # Convert single dictionary to 2D array matching training features
            x = np.array([[float(sensor_dict[feat]) for feat in self.features]])
            x_scaled = self.scaler.transform(x)
            
            # Decision function returns positive values for normal points, negative for anomalies
            decision_score = float(self.model.decision_function(x_scaled)[0])
            
            # Calibrate decision score:
            # Normal: decision_score >= 0.05 -> anomaly_score = 0.0
            # Extreme outlier: decision_score <= -0.15 -> anomaly_score = 1.0
            # Interpolate in between
            if decision_score >= 0.05:
                anomaly_score = 0.0
            elif decision_score <= -0.15:
                anomaly_score = 1.0
            else:
                anomaly_score = (0.05 - decision_score) / 0.20
                
            health_index = 1.0 - anomaly_score
            return anomaly_score, health_index
            
        except Exception as e:
            print(f"Error calculating anomaly score: {e}")
            return 0.0, 1.0

    def predict_rul(self, equipment_id: str, current_health: float) -> str:
        """
        Predicts the Remaining Useful Life (RUL) of the equipment by analyzing
        the trend of its Health Index over the last 24 hours (96 readings).
        """
        try:
            sensor_file = config.RAW_DIR / "sensor_data" / "sensor_readings.csv"
            if not sensor_file.exists():
                return "Normal (30+ days)"

            df = pd.read_csv(sensor_file)
            df_eq = df[df["equipment_id"] == equipment_id].tail(96)
            
            if df_eq.empty:
                return "Normal (30+ days)"

            # Vectorized Batch Prediction:
            # Convert the 96 rows of features to a 2D numpy array and predict all at once
            X = df_eq[self.features].values
            if self.scaler and self.model:
                X_scaled = self.scaler.transform(X)
                decisions = self.model.decision_function(X_scaled)
                # Calibrate in a vectorized way (maps decisions in [0.05, -0.15] to health in [1.0, 0.0])
                anomalies = np.clip((0.05 - decisions) / 0.20, 0.0, 1.0)
                health_history = (1.0 - anomalies).tolist()
            else:
                health_history = [1.0] * len(df_eq)

            # Add current health as the final point
            health_history.append(current_health)
            
            # Perform linear regression to find slope (health index per reading)
            x = np.arange(len(health_history))
            y = np.array(health_history)
            
            slope, intercept = np.polyfit(x, y, 1)
            
            # If health is stable or increasing, RUL is normal
            if slope >= -0.0001:
                return "Normal (30+ days)"
                
            # Health is declining. Calculate readings left until health hits critical (0.20)
            target_health = 0.20
            if current_health <= target_health:
                return "Immediate intervention required (less than 24 hours)"
                
            readings_remaining = (target_health - current_health) / slope
            hours_remaining = (readings_remaining * 15) / 60
            days_remaining = hours_remaining / 24
            
            if days_remaining < 1.0:
                return "Immediate intervention required (less than 24 hours)"
            elif days_remaining > 30.0:
                return "Normal (30+ days)"
            else:
                return f"{int(round(days_remaining))} days"
                
        except Exception as e:
            print(f"Error predicting RUL for {equipment_id}: {e}")
            return "Normal (30+ days)"
