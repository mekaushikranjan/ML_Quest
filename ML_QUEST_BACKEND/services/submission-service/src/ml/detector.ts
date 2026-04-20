import { MLTaskType } from './types';

/**
 * Keyword-based heuristic detector.
 * Scans user Python code and returns the most likely ML task type.
 */

interface DetectionRule {
    type: MLTaskType;
    keywords: (string | RegExp)[];
    weight: number;
}

const RULES: DetectionRule[] = [
    // ── Neural Network / Deep Learning ───────────────────────────────────────
    {
        type: MLTaskType.NEURAL_NETWORK,
        weight: 10,
        keywords: [
            'keras', 'tensorflow', 'torch', 'nn.Module', 'Sequential',
            'Dense', 'Conv2d', 'LSTM', 'GRU', 'Transformer', 'torch.nn',
            'tf.keras', 'model.compile', 'model.fit', 'backward()', 'optimizer.step',
        ],
    },

    // ── Clustering ────────────────────────────────────────────────────────────
    {
        type: MLTaskType.CLUSTERING,
        weight: 8,
        keywords: [
            'KMeans', 'DBSCAN', 'AgglomerativeClustering', 'MeanShift',
            'SpectralClustering', 'GaussianMixture', 'cluster_centers_',
            'labels_', 'n_clusters', 'silhouette_score', 'inertia_',
            'cluster.', 'fit_predict',
        ],
    },

    // ── Classification ────────────────────────────────────────────────────────
    {
        type: MLTaskType.CLASSIFICATION,
        weight: 7,
        keywords: [
            'LogisticRegression', 'RandomForestClassifier', 'SVC', 'SVM',
            'DecisionTreeClassifier', 'KNeighborsClassifier', 'GradientBoostingClassifier',
            'XGBClassifier', 'LGBMClassifier', 'accuracy_score', 'classification_report',
            'confusion_matrix', 'precision_score', 'recall_score', 'f1_score',
            'predict_proba', 'roc_auc_score',
        ],
    },

    // ── Regression ────────────────────────────────────────────────────────────
    {
        type: MLTaskType.REGRESSION,
        weight: 7,
        keywords: [
            'LinearRegression', 'Ridge', 'Lasso', 'ElasticNet',
            'RandomForestRegressor', 'GradientBoostingRegressor', 'SVR',
            'mean_squared_error', 'mean_absolute_error', 'r2_score',
            'coef_', 'intercept_',
        ],
    },

    // ── Dimensionality Reduction ──────────────────────────────────────────────
    {
        type: MLTaskType.DIMENSIONALITY_REDUCTION,
        weight: 9,
        keywords: [
            'PCA', 'TruncatedSVD', 'TSNE', 't-SNE', 'UMAP', 'FastICA',
            'NMF', 'explained_variance_ratio_', 'components_', 'n_components',
            'decomposition.', 'manifold.',
        ],
    },

    // ── Dataframe / EDA ───────────────────────────────────────────────────────
    {
        type: MLTaskType.DATAFRAME_ANALYSIS,
        weight: 5,
        keywords: [
            'pd.read_csv', 'pd.read_excel', 'pd.read_json', 'pd.DataFrame',
            'DataFrame(', '.describe()', '.groupby(', '.pivot_table(',
            '.value_counts(', '.corr(', '.merge(', '.concat(',
            'dataframe', 'df.head', 'df.info',
        ],
    },
];

function countMatches(code: string, keywords: (string | RegExp)[]): number {
    let count = 0;
    for (const kw of keywords) {
        if (typeof kw === 'string') {
            if (code.includes(kw)) count++;
        } else {
            if (kw.test(code)) count++;
        }
    }
    return count;
}

export function detectMLTaskType(
    code: string,
    hint?: MLTaskType
): MLTaskType {
    const scores: Map<MLTaskType, number> = new Map();

    for (const rule of RULES) {
        const matches = countMatches(code, rule.keywords);
        if (matches > 0) {
            const current = scores.get(rule.type) ?? 0;
            scores.set(rule.type, current + matches * rule.weight);
        }
    }

    if (scores.size === 0) {
        // Fall back to hint if nothing detected
        return hint ?? MLTaskType.GENERAL;
    }

    // If a hint is provided, give it a bias boost
    if (hint && scores.has(hint)) {
        scores.set(hint, scores.get(hint)! + 5);
    }

    // Return the type with the highest score
    let best: MLTaskType = MLTaskType.GENERAL;
    let bestScore = 0;

    for (const [type, score] of scores.entries()) {
        if (score > bestScore) {
            bestScore = score;
            best = type;
        }
    }

    return best;
}

/** Returns all detected types and their confidence scores (for debugging) */
export function detectMLTaskTypeVerbose(code: string): Array<{ type: MLTaskType; score: number }> {
    const scores: Map<MLTaskType, number> = new Map();

    for (const rule of RULES) {
        const matches = countMatches(code, rule.keywords);
        if (matches > 0) {
            const current = scores.get(rule.type) ?? 0;
            scores.set(rule.type, current + matches * rule.weight);
        }
    }

    return Array.from(scores.entries())
        .map(([type, score]) => ({ type, score }))
        .sort((a, b) => b.score - a.score);
}
