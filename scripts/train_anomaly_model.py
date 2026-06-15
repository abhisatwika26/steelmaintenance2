import os
import pickle
from pathlib import Path
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

BASE_DIR = Path(__file__).resolve().parents[1]
RAW_DIR = BASE_DIR / "data" / "raw"
MODELS_DIR = BASE_DIR / "data" / "models"

def train_model() -> None:
    print("Loading sensor readings...")
    sensor_file = RAW_DIR / "sensor_data" / "sensor_readings.csv"
    if not sensor_file.exists():
        print(f"Error: Sensor readings file not found at {sensor_file}")
        return
        
    df = pd.read_csv(sensor_file)
    
    # Isolation Forest is trained on normal operating data (anomaly_label == 0)
    print("Filtering normal data for training...")
    normal_data = df[df["anomaly_label"] == 0]
    
    features = [
        "temperature_c",
        "vibration_mm_s",
        "pressure_bar",
        "rpm",
        "current_amp",
        "coolant_flow_lpm",
        "operating_load_pct"
    ]
    
    X_train = normal_data[features]
    print(f"Training data shape: {X_train.shape}")
    
    # 1. Scale features
    print("Scaling features...")
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    
    # 2. Train Isolation Forest
    print("Fitting Isolation Forest model...")
    # Using 1.5% contamination to account for slight boundary noise in the training set
    model = IsolationForest(contamination=0.015, random_state=42, n_estimators=100)
    model.fit(X_train_scaled)
    
    # 3. Create models directory and save model files
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    
    scaler_path = MODELS_DIR / "feature_scaler.pkl"
    with open(scaler_path, "wb") as f:
        pickle.dump(scaler, f)
    print(f"Scaler saved to {scaler_path}")
        
    model_path = MODELS_DIR / "isolation_forest.pkl"
    with open(model_path, "wb") as f:
        pickle.dump(model, f)
    print(f"Isolation Forest model saved to {model_path}")
    
    print("Anomaly detection model training completed successfully!")

if __name__ == "__main__":
    train_model()
