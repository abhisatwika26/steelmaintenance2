import time
import requests

endpoints = {
    "Equipment Master": "http://127.0.0.1:8000/api/equipment",
    "Alerts Queue": "http://127.0.0.1:8000/api/alerts",
    "Predictions Health Index": "http://127.0.0.1:8000/api/predictions/health-index",
    "Risk Heatmap": "http://127.0.0.1:8000/api/predictions/risk-heatmap",
    "Spare Parts Inventory": "http://127.0.0.1:8000/api/spares"
}

def diagnose():
    print("Starting API diagnostic check on port 8000...\n")
    for name, url in endpoints.items():
        start = time.time()
        print(f"Querying {name} ({url})...")
        try:
            r = requests.get(url, timeout=10)
            elapsed = time.time() - start
            print(f"Status Code: {r.status_code}")
            print(f"Response Time: {elapsed:.3f} seconds")
            if r.status_code == 200:
                data = r.json()
                print(f"Records Returned: {len(data) if isinstance(data, list) else 'Dict response'}")
            else:
                print(f"Error Response: {r.text[:200]}")
        except Exception as e:
            elapsed = time.time() - start
            print(f"FAILED: {e}")
            print(f"Elapsed Time before failure: {elapsed:.3f} seconds")
        print("-" * 50)

if __name__ == "__main__":
    diagnose()
