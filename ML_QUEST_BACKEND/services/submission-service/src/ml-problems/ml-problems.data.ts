import { MLTaskType } from '../ml/types';

export interface MLTestCase {
    id: string;
    description: string;
    expectedOutput: string;   // shown to the user — what their code must produce
    check:
    | { type: 'stdout_contains'; value: string }
    | { type: 'metric_gte'; metricLabel: string; threshold: number }
    | { type: 'metric_lte'; metricLabel: string; threshold: number };
}

export interface MLTestCaseResult {
    id: string;
    description: string;
    expectedOutput: string;
    passed: boolean;
    actualHint?: string;
}

export interface MLProblem {
    id: string;
    title: string;
    slug: string;
    description: string;
    taskType: MLTaskType;
    difficulty: 'easy' | 'medium' | 'hard';
    tags: string[];
    starterCode: string;
    evaluationCriteria: string[];
    hints: string[];
    testCases: MLTestCase[];
}

export const ML_PROBLEMS: MLProblem[] = [
    {
        id: 'ml-001',
        title: 'Iris Flower Classifier',
        slug: 'iris-flower-classifier',
        description: `The classic Iris dataset contains measurements of 150 iris flowers from 3 different species: Setosa, Versicolour, and Virginica.

Your task is to build a classification model that accurately predicts the species of a flower given its petal and sepal dimensions.

**Dataset:** Use \`from sklearn.datasets import load_iris\`

Write a complete solution that:
- Loads the Iris dataset
- Splits it into train/test sets (80/20 split, random_state=42)
- Trains a classifier (RandomForest, LogisticRegression, etc.)
- Evaluates it with accuracy and F1 score

The system will automatically extract your model metrics and generate insights.`,
        taskType: MLTaskType.CLASSIFICATION,
        difficulty: 'easy',
        tags: ['classification', 'scikit-learn', 'iris'],
        testCases: [
            {
                id: 'tc-1',
                description: 'Model accuracy must be ≥ 0.90',
                expectedOutput: 'accuracy ≥ 0.90 (e.g. "Accuracy: 0.9667")',
                check: { type: 'metric_gte', metricLabel: 'accuracy', threshold: 0.90 },
            },
            {
                id: 'tc-2',
                description: 'Weighted F1 score must be ≥ 0.90',
                expectedOutput: 'f1 ≥ 0.90 (e.g. "F1 Score: 0.9667")',
                check: { type: 'metric_gte', metricLabel: 'f1', threshold: 0.90 },
            },
            {
                id: 'tc-3',
                description: 'Code must print accuracy to stdout',
                expectedOutput: 'stdout contains "Accuracy:"',
                check: { type: 'stdout_contains', value: 'Accuracy:' },
            },
        ],
        starterCode: `from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score

# Load the dataset
X, y = load_iris(return_X_y=True)

# Split into train/test
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Train your model
clf = RandomForestClassifier(random_state=42)
clf.fit(X_train, y_train)

# Evaluate
preds = clf.predict(X_test)
accuracy = accuracy_score(y_test, preds)
f1 = f1_score(y_test, preds, average='weighted')

print(f"Accuracy: {accuracy:.4f}")
print(f"F1 Score: {f1:.4f}")
`,
        evaluationCriteria: [
            'Model accuracy ≥ 0.90',
            'Weighted F1 score ≥ 0.90',
            'Feature importances (if applicable)',
            'Number of classes predicted',
        ],
        hints: [
            'Try LogisticRegression for a simpler baseline',
            'Consider StandardScaler for preprocessing',
            'RandomForest usually gives >95% accuracy on Iris',
        ],
    },
    {
        id: 'ml-002',
        title: 'House Price Regressor',
        slug: 'house-price-regressor',
        description: `Predict house prices using the California Housing dataset. This is a classic regression problem where you need to estimate median house values based on features like location, income, and house age.

**Dataset:** Use \`from sklearn.datasets import fetch_california_housing\`

Your goal is to build a regression model with the highest possible R² score. A model with R² > 0.60 is the baseline target.

The system will capture your model's R², MSE, and MAE metrics automatically.`,
        taskType: MLTaskType.REGRESSION,
        difficulty: 'easy',
        tags: ['regression', 'scikit-learn', 'housing'],
        testCases: [
            {
                id: 'tc-1',
                description: 'R² must be ≥ 0.60',
                expectedOutput: 'R² ≥ 0.60 (e.g. "R²: 0.6050")',
                check: { type: 'metric_gte', metricLabel: 'R² Score', threshold: 0.60 },
            },
            {
                id: 'tc-2',
                description: 'Code must print R² to stdout',
                expectedOutput: 'stdout contains "R²:"',
                check: { type: 'stdout_contains', value: 'R²:' },
            },
            {
                id: 'tc-3',
                description: 'Code must print MAE to stdout',
                expectedOutput: 'stdout contains "MAE:"',
                check: { type: 'stdout_contains', value: 'MAE:' },
            },
        ],
        starterCode: `from sklearn.datasets import fetch_california_housing
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error
import numpy as np

# Load dataset
data = fetch_california_housing()
X, y = data.data, data.target

# Split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Train
model = LinearRegression()
model.fit(X_train, y_train)

# Evaluate
preds = model.predict(X_test)
r2 = r2_score(y_test, preds)
mse = mean_squared_error(y_test, preds)
mae = mean_absolute_error(y_test, preds)

print(f"R²:  {r2:.4f}")
print(f"MSE: {mse:.4f}")
print(f"MAE: {mae:.4f}")
`,
        evaluationCriteria: [
            'R² ≥ 0.60',
            'MSE printed to stdout',
            'MAE printed to stdout',
        ],
        hints: [
            'Linear Regression is a good baseline — try to beat R² > 0.60',
            'RandomForestRegressor typically achieves R² > 0.80',
            'Normalize features with StandardScaler for linear models',
        ],
    },
    {
        id: 'ml-003',
        title: 'Customer Segmentation',
        slug: 'customer-segmentation',
        description: `An e-commerce company wants to group its customers into segments based on purchasing behaviour so it can personalise marketing campaigns.

You are given synthetic customer data with features like annual spend, purchase frequency, and recency.

Your task is to apply K-Means clustering (or DBSCAN / AgglomerativeClustering) to discover meaningful customer groups.

The system will capture cluster counts, inertia, silhouette score, and noise points automatically.`,
        taskType: MLTaskType.CLUSTERING,
        difficulty: 'medium',
        tags: ['clustering', 'kmeans', 'unsupervised'],
        testCases: [
            {
                id: 'tc-1',
                description: 'Code must print Inertia to stdout',
                expectedOutput: 'stdout contains "Inertia:"',
                check: { type: 'stdout_contains', value: 'Inertia:' },
            },
            {
                id: 'tc-2',
                description: 'Code must print Silhouette score to stdout',
                expectedOutput: 'stdout contains "Silhouette:"',
                check: { type: 'stdout_contains', value: 'Silhouette:' },
            },
            {
                id: 'tc-3',
                description: 'Silhouette score must be ≥ 0.30 (clusters must be separable)',
                expectedOutput: 'silhouette ≥ 0.30',
                check: { type: 'metric_gte', metricLabel: 'Silhouette Score', threshold: 0.30 },
            },
        ],
        starterCode: `import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score

# Generate synthetic customer data
np.random.seed(42)
n = 300
annual_spend   = np.concatenate([np.random.normal(500,  100, 100),
                                  np.random.normal(2000, 300, 100),
                                  np.random.normal(5000, 500, 100)])
frequency      = np.concatenate([np.random.normal(2,  0.5, 100),
                                  np.random.normal(8,  1.5, 100),
                                  np.random.normal(20, 3.0, 100)])
X = np.column_stack([annual_spend, frequency])

# Scale
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Cluster
kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
kmeans.fit(X_scaled)

score = silhouette_score(X_scaled, kmeans.labels_)
print(f"Inertia:         {kmeans.inertia_:.2f}")
print(f"Silhouette:      {score:.4f}")
print(f"Cluster counts:  {np.bincount(kmeans.labels_)}")
`,
        evaluationCriteria: [
            'Inertia printed to stdout',
            'Silhouette score printed to stdout',
            'Silhouette score ≥ 0.30',
        ],
        hints: [
            'Use the Elbow method to find the optimal k',
            'Always scale features before clustering',
            'DBSCAN can find clusters of arbitrary shape',
        ],
    },
    {
        id: 'ml-004',
        title: 'Titanic Survival Prediction',
        slug: 'titanic-survival',
        description: `Predict which passengers survived the Titanic disaster using synthetic Titanic-like data.

This is a binary classification problem involving feature engineering, handling missing values, and encoding categorical variables.

Build a model that predicts survival (1) or death (0) from passenger features like Pclass, Sex, Age, and Fare.

The system will capture accuracy, F1, and feature importances.`,
        taskType: MLTaskType.CLASSIFICATION,
        difficulty: 'medium',
        tags: ['classification', 'feature-engineering', 'binary'],
        testCases: [
            {
                id: 'tc-1',
                description: 'Accuracy must be ≥ 0.70',
                expectedOutput: 'accuracy ≥ 0.70 (e.g. "Accuracy: 0.7528")',
                check: { type: 'metric_gte', metricLabel: 'accuracy', threshold: 0.70 },
            },
            {
                id: 'tc-2',
                description: 'F1 score must be ≥ 0.60',
                expectedOutput: 'f1 ≥ 0.60 (e.g. "F1 Score: 0.6842")',
                check: { type: 'metric_gte', metricLabel: 'f1', threshold: 0.60 },
            },
            {
                id: 'tc-3',
                description: 'Code must print F1 Score to stdout',
                expectedOutput: 'stdout contains "F1 Score:"',
                check: { type: 'stdout_contains', value: 'F1 Score:' },
            },
        ],
        starterCode: `import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score
from sklearn.preprocessing import LabelEncoder

# Synthetic Titanic-like data
np.random.seed(42)
n = 891
df = pd.DataFrame({
    'Pclass': np.random.choice([1, 2, 3], n, p=[0.24, 0.21, 0.55]),
    'Sex':    np.random.choice(['male', 'female'], n, p=[0.65, 0.35]),
    'Age':    np.random.normal(29.7, 14, n).clip(1, 80),
    'SibSp':  np.random.choice(range(9), n, p=[0.68,0.23,0.03,0.02,0.01,0.01,0.005,0.005,0.01]),
    'Fare':   np.random.exponential(32, n),
})
df['Survived'] = ((df['Pclass'] < 3) | (df['Sex'] == 'female')).astype(int)
df['Survived'] ^= np.random.choice([0, 1], n, p=[0.85, 0.15])

df['Sex'] = LabelEncoder().fit_transform(df['Sex'])
X = df[['Pclass', 'Sex', 'Age', 'SibSp', 'Fare']].values
y = df['Survived'].values

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

clf = GradientBoostingClassifier(n_estimators=100, random_state=42)
clf.fit(X_train, y_train)
preds = clf.predict(X_test)

accuracy = accuracy_score(y_test, preds)
f1 = f1_score(y_test, preds)
print(f"Accuracy: {accuracy:.4f}")
print(f"F1 Score: {f1:.4f}")
`,
        evaluationCriteria: [
            'Accuracy ≥ 0.70',
            'F1 score ≥ 0.60',
            'F1 Score printed to stdout',
        ],
        hints: [
            'Encode categorical variables (Sex, Embarked)',
            'Fill missing Age values with median',
            'GradientBoosting and XGBoost work well here',
        ],
    },
    {
        id: 'ml-005',
        title: 'Wine Quality Regression',
        slug: 'wine-quality-regression',
        description: `Predict the quality score (0–10) of red wines based on physicochemical properties like acidity, alcohol content, and pH.

Build a regression model and analyse the most important chemical features driving wine quality.`,
        taskType: MLTaskType.REGRESSION,
        difficulty: 'medium',
        tags: ['regression', 'feature-importance', 'wine'],
        testCases: [
            {
                id: 'tc-1',
                description: 'R² must be ≥ 0.50',
                expectedOutput: 'R² ≥ 0.50 (e.g. "R²: 0.7812")',
                check: { type: 'metric_gte', metricLabel: 'R² Score', threshold: 0.50 },
            },
            {
                id: 'tc-2',
                description: 'Code must print R² to stdout',
                expectedOutput: 'stdout contains "R²:"',
                check: { type: 'stdout_contains', value: 'R²:' },
            },
            {
                id: 'tc-3',
                description: 'Code must print MSE to stdout',
                expectedOutput: 'stdout contains "MSE:"',
                check: { type: 'stdout_contains', value: 'MSE:' },
            },
        ],
        starterCode: `import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_squared_error

np.random.seed(42)
n = 1599
X = np.column_stack([
    np.random.uniform(4.6,  15.9, n),
    np.random.uniform(0.01, 1.58, n),
    np.random.uniform(0,    1,    n),
    np.random.uniform(1.2,  15.5, n),
    np.random.uniform(8.5,  67,   n),
    np.random.uniform(8,    289,  n),
    np.random.uniform(0.99, 1.04, n),
    np.random.uniform(2.7,  4.01, n),
    np.random.uniform(0.33, 2.0,  n),
    np.random.uniform(8.4,  14.9, n),
])
y = (5 + 0.3*X[:,9] - 0.5*X[:,1] + np.random.randn(n)).clip(3, 9)

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

preds = model.predict(X_test)
r2  = r2_score(y_test, preds)
mse = mean_squared_error(y_test, preds)
mae = float(np.mean(np.abs(y_test - preds)))

print(f"R²:  {r2:.4f}")
print(f"MSE: {mse:.4f}")
print(f"MAE: {mae:.4f}")
`,
        evaluationCriteria: ['R² ≥ 0.50', 'R² and MSE printed to stdout'],
        hints: [
            'Alcohol content and volatile acidity are strong predictors',
            'Try GradientBoostingRegressor for a boost in R²',
        ],
    },
    {
        id: 'ml-006',
        title: 'Handwritten Digit Compression',
        slug: 'digit-dimensionality-reduction',
        description: `The MNIST digit dataset has 64 features (8×8 pixel grayscale images). Reduce its dimensionality using PCA while retaining as much variance as possible.

Your challenge:
- Reduce from 64 dimensions to 20 or fewer
- Retain ≥ 70% of the explained variance
- Print the original and reduced shapes, and total explained variance

The system measures explained variance ratio, component count, and singular values.`,
        taskType: MLTaskType.DIMENSIONALITY_REDUCTION,
        difficulty: 'hard',
        tags: ['pca', 'dimensionality-reduction', 'mnist'],
        testCases: [
            {
                id: 'tc-1',
                description: 'Code must print reduced shape to stdout',
                expectedOutput: 'stdout contains "Reduced shape:"',
                check: { type: 'stdout_contains', value: 'Reduced shape:' },
            },
            {
                id: 'tc-2',
                description: 'Code must print explained variance to stdout',
                expectedOutput: 'stdout contains "Explained variance:"',
                check: { type: 'stdout_contains', value: 'Explained variance:' },
            },
            {
                id: 'tc-3',
                description: 'Total explained variance must be ≥ 0.70',
                expectedOutput: 'Total Explained Variance ≥ 70%',
                check: { type: 'metric_gte', metricLabel: 'Total Explained Variance', threshold: 0.70 },
            },
        ],
        starterCode: `from sklearn.decomposition import PCA
from sklearn.datasets import load_digits
import numpy as np

X, y = load_digits(return_X_y=True)
print(f"Original shape: {X.shape}")

pca = PCA(n_components=20, random_state=42)
X_reduced = pca.fit_transform(X)

total_variance = pca.explained_variance_ratio_.sum()
print(f"Reduced shape:      {X_reduced.shape}")
print(f"Explained variance: {total_variance:.4f}")
print(f"Per component:      {pca.explained_variance_ratio_.round(3)}")
`,
        evaluationCriteria: [
            'Reduced shape and variance printed to stdout',
            'Total explained variance ≥ 70%',
        ],
        hints: [
            'Use `PCA(n_components=0.90)` to auto-select components for 90% variance',
            'Standardise data before PCA if features have different scales',
        ],
    },
    {
        id: 'ml-007',
        title: 'Predict Exam Result with KNN',
        slug: 'knn-exam-prediction',
        description: `## The Challenge

A school wants to predict whether a student will **Pass** or **Fail** an exam based on two features:
- **Study Hours** — hours spent studying per day
- **Sleep Hours** — hours of sleep the night before

You are given the following **10 labelled students**:

| # | Study Hours | Sleep Hours | Result  |
|---|-------------|-------------|---------|
| 1 | 2.5         | 4.0         | Fail    |
| 2 | 3.0         | 6.0         | Fail    |
| 3 | 4.0         | 5.0         | Fail    |
| 4 | 4.5         | 8.0         | Pass    |
| 5 | 5.0         | 7.0         | Pass    |
| 6 | 5.5         | 6.5         | Pass    |
| 7 | 6.0         | 8.0         | Pass    |
| 8 | 3.5         | 5.5         | Fail    |
| 9 | 2.0         | 7.0         | Fail    |
|10 | 6.5         | 5.0         | Pass    |

### Mystery Student 🎓
A new student studied **5.0 hours** and slept **6.0 hours**.

**Your task:** Use K-Nearest Neighbours (KNN) with **k = 3** to predict whether this student will **Pass** or **Fail**.

Then extend it — print the 3 nearest neighbours and evaluate overall accuracy.

> 💡 KNN classifies a point by looking at the k nearest training samples and taking a majority vote. Distance = Euclidean distance.`,
        taskType: MLTaskType.CLASSIFICATION,
        difficulty: 'easy',
        tags: ['knn', 'classification', 'distance', 'beginner'],
        testCases: [
            {
                id: 'tc-1',
                description: 'Mystery student (5.0 hrs study, 6.0 hrs sleep) must be predicted as "Pass"',
                expectedOutput: 'stdout contains "Pass" (prediction for mystery student)',
                check: { type: 'stdout_contains', value: 'Pass' },
            },
            {
                id: 'tc-2',
                description: 'Code must print the 3 nearest neighbours',
                expectedOutput: 'stdout contains "3 Nearest Neighbours:"',
                check: { type: 'stdout_contains', value: '3 Nearest Neighbours:' },
            },
            {
                id: 'tc-3',
                description: 'Training accuracy must be ≥ 0.70',
                expectedOutput: 'accuracy ≥ 0.70 (e.g. "Training Accuracy (k=3): 0.8000")',
                check: { type: 'metric_gte', metricLabel: 'accuracy', threshold: 0.70 },
            },
        ],
        starterCode: `import numpy as np
from sklearn.neighbors import KNeighborsClassifier
from sklearn.metrics import accuracy_score, f1_score

# ── Training data (Study Hours, Sleep Hours) ─────────────────
X_train = np.array([
    [2.5, 4.0],  # Fail
    [3.0, 6.0],  # Fail
    [4.0, 5.0],  # Fail
    [4.5, 8.0],  # Pass
    [5.0, 7.0],  # Pass
    [5.5, 6.5],  # Pass
    [6.0, 8.0],  # Pass
    [3.5, 5.5],  # Fail
    [2.0, 7.0],  # Fail
    [6.5, 5.0],  # Pass
])
y_train = np.array([0, 0, 0, 1, 1, 1, 1, 0, 0, 1])
# 0 = Fail, 1 = Pass

# ── Mystery student to predict ────────────────────────────────
mystery_student = np.array([[5.0, 6.0]])

# ── Step 1: Predict the mystery student using k=3 KNN ────────
knn = KNeighborsClassifier(n_neighbors=3)
knn.fit(X_train, y_train)

prediction = knn.predict(mystery_student)[0]
label = "Pass" if prediction == 1 else "Fail"
print(f"Mystery student prediction (k=3): {label}")

# Show which 3 neighbours were used
distances, indices = knn.kneighbors(mystery_student)
print("\\n3 Nearest Neighbours:")
for rank, (dist, idx) in enumerate(zip(distances[0], indices[0]), 1):
    neighbour_label = "Pass" if y_train[idx] == 1 else "Fail"
    print(f"  #{rank}: {X_train[idx]} -> {neighbour_label}  (dist={dist:.3f})")

# ── Step 2: Evaluate overall accuracy ────────────────────────
preds = knn.predict(X_train)
accuracy = accuracy_score(y_train, preds)
f1 = f1_score(y_train, preds)

print(f"\\nTraining Accuracy (k=3): {accuracy:.4f}")
print(f"F1 Score:                {f1:.4f}")

# ── Step 3 (Bonus): Try different k values ────────────────────
print("\\nk vs Accuracy:")
for k in [1, 3, 5, 7]:
    model = KNeighborsClassifier(n_neighbors=k)
    model.fit(X_train, y_train)
    acc = accuracy_score(y_train, model.predict(X_train))
    print(f"  k={k}: {acc:.4f}")
`,
        evaluationCriteria: [
            'Mystery student predicted as "Pass" (k=3)',
            '3 nearest neighbours printed to stdout',
            'Training accuracy ≥ 0.70',
        ],
        hints: [
            'k=3 means majority vote of the 3 closest students',
            'Euclidean distance: sqrt((Δstudy)² + (Δsleep)²)',
            'Try k=1, 3, 5 and see how accuracy changes',
        ],
    },
];

// ── Test case runner (used by ml-submission.service.ts) ─────────────────────

export function runMLTestCases(
    testCases: MLTestCase[],
    stdout: string,
    metrics: Array<{ label: string; value: string | number }>
): MLTestCaseResult[] {
    return testCases.map((tc) => {
        let passed = false;
        let actualHint: string | undefined;

        const { check } = tc;

        if (check.type === 'stdout_contains') {
            passed = stdout.includes(check.value);
            if (!passed) actualHint = `Expected stdout to contain: "${check.value}"`;
        } else if (check.type === 'metric_gte' || check.type === 'metric_lte') {
            const metric = metrics.find(
                (m) => String(m.label).toLowerCase() === check.metricLabel.toLowerCase()
            );
            if (metric) {
                const val = parseFloat(String(metric.value).replace('%', ''));
                const numVal = check.metricLabel.includes('Variance') && String(metric.value).includes('%')
                    ? val / 100
                    : val;
                if (check.type === 'metric_gte') {
                    passed = !isNaN(numVal) && numVal >= check.threshold;
                    if (!passed) actualHint = `Got ${numVal.toFixed(4)}, need ≥ ${check.threshold}`;
                } else {
                    passed = !isNaN(numVal) && numVal <= check.threshold;
                    if (!passed) actualHint = `Got ${numVal.toFixed(4)}, need ≤ ${check.threshold}`;
                }
            } else {
                actualHint = `Metric "${check.metricLabel}" not found in analysis`;
            }
        }

        return { id: tc.id, description: tc.description, expectedOutput: tc.expectedOutput, passed, actualHint };
    });
}
