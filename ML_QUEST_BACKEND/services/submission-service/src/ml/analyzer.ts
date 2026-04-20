import {
    MLTaskType,
    MLAnalysisResult,
    MLExecutionOutput,
    MLMetric,
} from './types';

/**
 * Transforms raw MLExecutionOutput into a structured MLAnalysisResult
 * with human-readable summary, metrics table, insights, and warnings.
 */
export class MLAnalyzer {
    analyze(output: MLExecutionOutput, taskType: MLTaskType): MLAnalysisResult {
        if (output.timedOut) {
            return {
                taskType,
                summary: 'Execution timed out before completion.',
                metrics: [
                    { label: 'Runtime', value: output.runtimeMs, unit: 'ms' },
                    { label: 'Status', value: 'Timed Out' },
                ],
                insights: [],
                warnings: ['Execution exceeded the time limit. Optimize your code or reduce data size.'],
                rawOutput: output.stdout,
            };
        }

        if (output.exitCode !== 0 && !output.mlResults) {
            return {
                taskType,
                summary: 'Execution failed with a runtime error.',
                metrics: [
                    { label: 'Exit Code', value: output.exitCode },
                    { label: 'Runtime', value: output.runtimeMs, unit: 'ms' },
                ],
                insights: [],
                warnings: [output.stderr?.slice(0, 500) || 'Unknown error'],
                rawOutput: output.stdout,
            };
        }

        if (!output.mlResults) {
            return this.buildGeneralResult(output, taskType);
        }

        switch (taskType) {
            case MLTaskType.CLUSTERING:
                return this.buildClusteringResult(output);
            case MLTaskType.REGRESSION:
                return this.buildRegressionResult(output);
            case MLTaskType.CLASSIFICATION:
                return this.buildClassificationResult(output);
            case MLTaskType.DATAFRAME_ANALYSIS:
                return this.buildDataframeResult(output);
            case MLTaskType.NEURAL_NETWORK:
                return this.buildNeuralNetworkResult(output);
            case MLTaskType.DIMENSIONALITY_REDUCTION:
                return this.buildDimReductionResult(output);
            default:
                return this.buildGeneralResult(output, taskType);
        }
    }

    // ─── Task-specific builders ──────────────────────────────────────────────

    private buildClusteringResult(output: MLExecutionOutput): MLAnalysisResult {
        const r = output.mlResults!;
        const models: any[] = (r.models as any[]) || [];
        const warnings: string[] = [];
        const insights: string[] = [];
        const metrics: MLMetric[] = [
            { label: 'Runtime', value: output.runtimeMs, unit: 'ms' },
            { label: 'Memory', value: output.memoryMb, unit: 'MB' },
        ];

        let summary = 'Clustering analysis complete.';

        if (models.length === 0) {
            warnings.push('No clustering model was detected in the executed code. Make sure a model is trained and assigned to a variable.');
        } else {
            const m = models[0];
            const modelName = m.model || 'Unknown';
            const nClusters = m.n_clusters ?? '?';
            const silhouette = m.silhouette_score ?? null;

            summary = `${modelName} found ${nClusters} cluster(s).`;
            if (silhouette !== null) {
                summary += ` Silhouette score: ${silhouette}.`;
            }

            metrics.push({ label: 'Model', value: modelName });
            metrics.push({ label: 'Clusters', value: nClusters });
            if (m.inertia !== undefined) metrics.push({ label: 'Inertia', value: round(m.inertia, 4) });
            if (silhouette !== null) metrics.push({ label: 'Silhouette Score', value: silhouette });
            if (m.noise_points !== undefined) metrics.push({ label: 'Noise Points (DBSCAN)', value: m.noise_points });
            if (m.n_samples !== undefined) metrics.push({ label: 'Total Samples', value: m.n_samples });

            // Insights
            if (silhouette !== null) {
                if (silhouette > 0.7) insights.push('Excellent cluster separation (silhouette > 0.7).');
                else if (silhouette > 0.5) insights.push('Good cluster separation (silhouette 0.5–0.7).');
                else if (silhouette > 0.25) insights.push('Weak cluster structure. Consider tuning k or using a different algorithm.');
                else insights.push('Poor cluster separation. The data may not be well-suited for clustering.');
            }
            if (modelName === 'KMeans' && m.inertia !== undefined) {
                insights.push('Use the Elbow method to find the optimal number of clusters.');
            }
            if (modelName === 'DBSCAN' && m.noise_points > 0) {
                insights.push(`${m.noise_points} point(s) are labelled as noise (-1). Consider adjusting eps and min_samples.`);
            }
        }

        if (r.status === 'error') {
            warnings.push(String(r.error).slice(0, 500));
        }

        return { taskType: MLTaskType.CLUSTERING, summary, metrics, insights, warnings, rawOutput: output.stdout };
    }

    private buildRegressionResult(output: MLExecutionOutput): MLAnalysisResult {
        const r = output.mlResults!;
        const models: any[] = (r.models as any[]) || [];
        const warnings: string[] = [];
        const insights: string[] = [];
        const metrics: MLMetric[] = [
            { label: 'Runtime', value: output.runtimeMs, unit: 'ms' },
            { label: 'Memory', value: output.memoryMb, unit: 'MB' },
        ];

        let summary = 'Regression analysis complete.';

        if (models.length === 0) {
            warnings.push('No regression model was detected. Make sure a model is trained and variables like r2, mse, mae are defined.');
        } else {
            const m = models[0];
            summary = `${m.model || 'Regression model'} trained.`;
            metrics.push({ label: 'Model', value: m.model });
            if (m.r2_score !== undefined) {
                metrics.push({ label: 'R² Score', value: round(m.r2_score, 4) });
                if (m.r2_score > 0.9) insights.push('Excellent model fit (R² > 0.9).');
                else if (m.r2_score > 0.7) insights.push('Good model fit (R² 0.7–0.9).');
                else insights.push('Poor model fit (R² < 0.7). Consider more features or a more complex model.');
                summary += ` R² = ${round(m.r2_score, 4)}.`;
            }
            if (m.mse !== undefined) metrics.push({ label: 'MSE', value: round(m.mse, 4) });
            if (m.mae !== undefined) metrics.push({ label: 'MAE', value: round(m.mae, 4) });
            if (m.intercept !== undefined) metrics.push({ label: 'Intercept', value: round(m.intercept, 4) });
        }

        if (r.status === 'error') warnings.push(String(r.error).slice(0, 500));

        return { taskType: MLTaskType.REGRESSION, summary, metrics, insights, warnings, rawOutput: output.stdout };
    }

    private buildClassificationResult(output: MLExecutionOutput): MLAnalysisResult {
        const r = output.mlResults!;
        const models: any[] = (r.models as any[]) || [];
        const capturedMetrics: Record<string, number> = (r.metrics as any) || {};
        const warnings: string[] = [];
        const insights: string[] = [];
        const metrics: MLMetric[] = [
            { label: 'Runtime', value: output.runtimeMs, unit: 'ms' },
            { label: 'Memory', value: output.memoryMb, unit: 'MB' },
        ];

        let summary = 'Classification analysis complete.';

        if (models.length > 0) {
            const m = models[0];
            metrics.push({ label: 'Model', value: m.model });
            if (m.n_classes !== undefined) metrics.push({ label: 'Classes', value: m.n_classes });
            summary = `${m.model || 'Classifier'} trained on ${m.n_classes ?? '?'} classes.`;
        }

        for (const [k, v] of Object.entries(capturedMetrics)) {
            metrics.push({ label: k, value: v });
            if (k.toLowerCase().includes('accuracy') && v > 0.9) {
                insights.push(`High accuracy (${v}). Verify there is no data leakage.`);
            }
        }

        if (models.length === 0 && Object.keys(capturedMetrics).length === 0) {
            warnings.push('No classifier or metric variables detected. Define accuracy, f1, etc. as variables.');
        }

        if (r.status === 'error') warnings.push(String(r.error).slice(0, 500));

        return { taskType: MLTaskType.CLASSIFICATION, summary, metrics, insights, warnings, rawOutput: output.stdout };
    }

    private buildDataframeResult(output: MLExecutionOutput): MLAnalysisResult {
        const r = output.mlResults!;
        const dfs: Record<string, any> = (r.dataframes as any) || {};
        const warnings: string[] = [];
        const insights: string[] = [];
        const metrics: MLMetric[] = [
            { label: 'Runtime', value: output.runtimeMs, unit: 'ms' },
            { label: 'Memory', value: output.memoryMb, unit: 'MB' },
        ];

        const dfNames = Object.keys(dfs);
        let summary = `Dataframe analysis complete. ${dfNames.length} dataframe(s) found.`;

        for (const [name, info] of Object.entries(dfs)) {
            const shape: number[] = info.shape || [0, 0];
            metrics.push({ label: `${name}: Rows`, value: shape[0] });
            metrics.push({ label: `${name}: Columns`, value: shape[1] });

            const nullCounts: Record<string, number> = info.null_counts || {};
            const colsWithNulls = Object.entries(nullCounts).filter(([, v]) => v > 0);
            if (colsWithNulls.length > 0) {
                warnings.push(`DataFrame '${name}' has null values in: ${colsWithNulls.map(([k]) => k).join(', ')}.`);
                insights.push('Consider imputation or dropping null rows/columns before modeling.');
            } else if (shape[0] > 0) {
                insights.push(`DataFrame '${name}' has no null values — clean data!`);
            }
        }

        if (dfNames.length === 0) {
            warnings.push('No pandas DataFrames found in executed code.');
        }

        if (r.status === 'error') warnings.push(String(r.error).slice(0, 500));

        return { taskType: MLTaskType.DATAFRAME_ANALYSIS, summary, metrics, insights, warnings, rawOutput: output.stdout };
    }

    private buildNeuralNetworkResult(output: MLExecutionOutput): MLAnalysisResult {
        const r = output.mlResults!;
        const models: any[] = (r.models as any[]) || [];
        const history: Record<string, any[]> = (r.history as any) || {};
        const warnings: string[] = [];
        const insights: string[] = [];
        const metrics: MLMetric[] = [
            { label: 'Runtime', value: output.runtimeMs, unit: 'ms' },
            { label: 'Memory', value: output.memoryMb, unit: 'MB' },
        ];

        let summary = 'Neural network analysis complete.';

        for (const m of models) {
            metrics.push({ label: 'Framework', value: m.framework });
            if (m.total_params !== undefined) {
                metrics.push({ label: 'Total Parameters', value: m.total_params });
                metrics.push({ label: 'Trainable Parameters', value: m.trainable_params });
                insights.push(m.trainable_params > 1_000_000
                    ? 'Large model (>1M params). Ensure you have sufficient training data.'
                    : 'Compact model size.');
            }
        }

        for (const [name, vals] of Object.entries(history)) {
            metrics.push({ label: `${name} (last 5 epochs)`, value: vals.join(', ') });
        }

        if (models.length === 0) {
            warnings.push('No neural network model detected. Assign your model to a variable.');
        }

        if (r.status === 'error') warnings.push(String(r.error).slice(0, 500));

        return { taskType: MLTaskType.NEURAL_NETWORK, summary, metrics, insights, warnings, rawOutput: output.stdout };
    }

    private buildDimReductionResult(output: MLExecutionOutput): MLAnalysisResult {
        const r = output.mlResults!;
        const models: any[] = (r.models as any[]) || [];
        const warnings: string[] = [];
        const insights: string[] = [];
        const metrics: MLMetric[] = [
            { label: 'Runtime', value: output.runtimeMs, unit: 'ms' },
            { label: 'Memory', value: output.memoryMb, unit: 'MB' },
        ];

        let summary = 'Dimensionality reduction complete.';

        if (models.length > 0) {
            const m = models[0];
            metrics.push({ label: 'Model', value: m.model });
            if (m.n_components !== undefined) metrics.push({ label: 'Components', value: m.n_components });
            if (m.n_components_param !== undefined) metrics.push({ label: 'Components (param)', value: m.n_components_param });
            if (m.total_explained_variance !== undefined) {
                metrics.push({ label: 'Total Explained Variance', value: `${(m.total_explained_variance * 100).toFixed(1)}%` });
                summary = `${m.model} explains ${(m.total_explained_variance * 100).toFixed(1)}% of variance.`;
                if (m.total_explained_variance < 0.8) {
                    insights.push('Less than 80% variance explained. Consider increasing n_components.');
                } else {
                    insights.push(`Good dimensionality reduction — ${(m.total_explained_variance * 100).toFixed(1)}% variance retained.`);
                }
            }
        } else {
            warnings.push('No dimensionality reduction model found. Assign your fitted model to a variable.');
        }

        if (r.status === 'error') warnings.push(String(r.error).slice(0, 500));

        return { taskType: MLTaskType.DIMENSIONALITY_REDUCTION, summary, metrics, insights, warnings, rawOutput: output.stdout };
    }

    private buildGeneralResult(output: MLExecutionOutput, taskType: MLTaskType): MLAnalysisResult {
        const capturedOutput = (output.mlResults as any)?.captured_output ?? output.stdout;
        const status = (output.mlResults as any)?.status ?? (output.exitCode === 0 ? 'success' : 'error');
        const error = (output.mlResults as any)?.error;

        return {
            taskType,
            summary: status === 'success'
                ? 'Python code executed successfully.'
                : 'Python code encountered an error during execution.',
            metrics: [
                { label: 'Runtime', value: output.runtimeMs, unit: 'ms' },
                { label: 'Memory', value: output.memoryMb, unit: 'MB' },
                { label: 'Exit Code', value: output.exitCode },
            ],
            insights: capturedOutput
                ? [`Captured ${String(capturedOutput).split('\n').length} line(s) of output.`]
                : [],
            warnings: error ? [String(error).slice(0, 500)] : [],
            rawOutput: output.stdout,
        };
    }
}

function round(val: unknown, decimals: number): number {
    const n = typeof val === 'number' ? val : parseFloat(String(val));
    if (isNaN(n)) return 0;
    return Math.round(n * 10 ** decimals) / 10 ** decimals;
}
