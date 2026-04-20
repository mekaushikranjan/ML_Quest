#!/usr/bin/env python3
"""
End-to-end test for the ML Submission Service.
Tests: clustering, regression, classification, dataframe_analysis
"""
import json
import time
import urllib.request
import urllib.parse

BASE = "http://localhost:3003"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhOWMxOWMyZi1lZDI0LTQzYmItOTBmMS0zYjgwN2JiMTU2NGEiLCJlbWFpbCI6Im1sdGVzdEBtbHF1ZXN0LmRldiIsInRpZXIiOiJmcmVlIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NzIxNzY0MDAsImV4cCI6MTc3MjE3NzMwMH0.Y0kmcNpCMHWou3O9ok3WZn6U4HN58bk3wn6fh8a5SEI"

TESTS = [
    {
        "name": "CLUSTERING (KMeans)",
        "code": """
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
import numpy as np

np.random.seed(42)
X = np.vstack([
    np.random.randn(50, 2) + [0, 0],
    np.random.randn(50, 2) + [5, 5],
    np.random.randn(50, 2) + [10, 0],
])
kmeans = KMeans(n_clusters=3, random_state=42, n_init=10).fit(X)
print("Labels:", kmeans.labels_[:10])
print("Inertia:", round(kmeans.inertia_, 2))
"""
    },
    {
        "name": "REGRESSION (LinearRegression)",
        "code": """
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score
import numpy as np

np.random.seed(0)
X = np.random.rand(100, 1) * 10
y = 2.5 * X.flatten() + np.random.randn(100) * 2

model = LinearRegression()
model.fit(X, y)
preds = model.predict(X)

r2 = round(r2_score(y, preds), 4)
mse = round(mean_squared_error(y, preds), 4)
mae = 0.0
print("R2:", r2, "MSE:", mse)
"""
    },
    {
        "name": "CLASSIFICATION (RandomForest)",
        "code": """
from sklearn.ensemble import RandomForestClassifier
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score

X, y = load_iris(return_X_y=True)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

clf = RandomForestClassifier(n_estimators=50, random_state=42)
clf.fit(X_train, y_train)
preds = clf.predict(X_test)

accuracy = round(accuracy_score(y_test, preds), 4)
f1 = round(f1_score(y_test, preds, average='weighted'), 4)
print("Accuracy:", accuracy, "F1:", f1)
"""
    },
    {
        "name": "DATAFRAME ANALYSIS (Pandas)",
        "code": """
import pandas as pd
import numpy as np

np.random.seed(42)
df = pd.DataFrame({
    'age':    np.random.randint(20, 60, 100),
    'salary': np.random.randint(30000, 120000, 100),
    'score':  np.random.rand(100),
    'dept':   np.random.choice(['eng','hr','sales','ops'], 100),
})
df.loc[5, 'salary'] = None   # introduce a null

print(df.describe())
print("\\nDept distribution:")
print(df['dept'].value_counts())
"""
    },
    {
        "name": "PCA (Dimensionality Reduction)",
        "code": """
from sklearn.decomposition import PCA
from sklearn.datasets import load_digits
import numpy as np

X, y = load_digits(return_X_y=True)
pca = PCA(n_components=10, random_state=42)
X_reduced = pca.fit_transform(X)
print("Original shape:", X.shape)
print("Reduced shape:", X_reduced.shape)
print("Explained variance:", pca.explained_variance_ratio_.round(3))
"""
    },
]


def post(url, data, token):
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    }, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as res:
            return json.loads(res.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        raise Exception(f"HTTP {e.code}: {body[:300]}")


def get(url, token):
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req, timeout=10) as res:
        return json.loads(res.read())


def poll_result(submission_id, max_wait=90):
    print(f"  ⏳ Polling (max {max_wait}s)...", flush=True)
    deadline = time.time() + max_wait
    while time.time() < deadline:
        status_resp = get(f"{BASE}/ml-submissions/{submission_id}", TOKEN)
        status = status_resp["data"]["status"]
        print(f"     status = {status}", flush=True)
        if status == "completed":
            result_resp = get(f"{BASE}/ml-submissions/{submission_id}/results", TOKEN)
            return result_resp["data"]
        if status in ("failed", "timeout", "runtime_error"):
            return {"error": status, "submission": status_resp["data"]}
        time.sleep(3)
    return {"error": "timeout waiting for result"}



def print_result(result):
    if "error" in result:
        print(f"  ❌ ERROR: {result['error']}")
        return

    print(f"  📋 Task type : {result.get('taskType')}")
    print(f"  💬 Summary   : {result.get('summary')}")
    print(f"  📊 Metrics   :")
    for m in result.get("metrics", [])[:6]:
        print(f"       {m['label']}: {m['value']}{' ' + m.get('unit','') if m.get('unit') else ''}")
    insights = result.get("insights", [])
    if insights:
        print(f"  💡 Insights  :")
        for i in insights[:3]:
            print(f"       • {i}")
    warnings = result.get("warnings", [])
    if warnings:
        print(f"  ⚠️  Warnings  :")
        for w in warnings[:2]:
            print(f"       • {w[:120]}")


print("=" * 65)
print("  ML Submission Service — End-to-End Test")
print("=" * 65)

# Auto-login to get a fresh token
import urllib.error
try:
    login_resp = post("http://localhost:3001/auth/login",
                      {"email": "mltest@mlquest.dev", "password": "Test1234!"}, "")
    TOKEN = login_resp["data"]["tokens"]["accessToken"]
    print(f"  🔑 Fresh token obtained\n")
except Exception as e:
    print(f"  ⚠️  Using hardcoded token (login failed: {e})\n")

for i, t in enumerate(TESTS):
    if i > 0:
        print(f"  ⏱  Waiting 12s for rate limit...", flush=True)
        time.sleep(12)

    print(f"\n🧪 TEST: {t['name']}")
    try:
        resp = post(f"{BASE}/ml-submissions", {"code": t["code"].strip()}, TOKEN)
        sub_id = resp["data"]["id"]
        task_type = resp["data"]["taskType"]
        print(f"  ✅ Submitted  id={sub_id}  detected_type={task_type}")
        result = poll_result(sub_id)
        print_result(result)
    except Exception as e:
        print(f"  ❌ Exception: {e}")

print("\n" + "=" * 65)
print("  Tests complete.")
print("=" * 65)
