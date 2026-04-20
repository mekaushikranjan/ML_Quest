import { MLTaskType } from './types';

/**
 * Returns a Python script that:
 *  1. Runs the user's code via exec()
 *  2. Captures ML-specific metrics and prints them inside
 *     __ML_RESULTS_START__ ... __ML_RESULTS_END__ markers
 */
export function getPythonWrapper(taskType: MLTaskType, userCode: string): string {
    switch (taskType) {
        case MLTaskType.CLUSTERING:
            return clusteringWrapper(userCode);
        case MLTaskType.REGRESSION:
            return regressionWrapper(userCode);
        case MLTaskType.CLASSIFICATION:
            return classificationWrapper(userCode);
        case MLTaskType.DATAFRAME_ANALYSIS:
            return dataframeWrapper(userCode);
        case MLTaskType.NEURAL_NETWORK:
            return neuralNetworkWrapper(userCode);
        case MLTaskType.DIMENSIONALITY_REDUCTION:
            return dimReductionWrapper(userCode);
        default:
            return generalWrapper(userCode);
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SAFE_IMPORTS = `
import json, sys, traceback, warnings
warnings.filterwarnings('ignore')
_ml_results = {}
`;

const PRINT_RESULTS = `
print("__ML_RESULTS_START__")
print(json.dumps(_ml_results, default=str))
print("__ML_RESULTS_END__")
`;

// ─── Wrappers ─────────────────────────────────────────────────────────────────

function clusteringWrapper(code: string): string {
    return `${SAFE_IMPORTS}
_user_globals = {}
try:
    exec(${JSON.stringify(code)}, _user_globals)
    # Try to capture common clustering attributes from executed namespace
    import numpy as np
    models_tried = []
    for _name, _obj in _user_globals.items():
        cls = type(_obj).__name__
        if cls in ('KMeans','DBSCAN','AgglomerativeClustering','MeanShift','SpectralClustering','GaussianMixture','Birch'):
            info = {'model': cls}
            if hasattr(_obj, 'labels_'):
                labels = list(_obj.labels_)
                info['n_samples'] = len(labels)
                info['n_clusters'] = int(max(set(l for l in labels if l != -1), default=0)) + 1 if labels else 0
                info['noise_points'] = int(sum(1 for l in labels if l == -1))
            if hasattr(_obj, 'inertia_') and _obj.inertia_ is not None:
                info['inertia'] = float(_obj.inertia_)
            if hasattr(_obj, 'cluster_centers_'):
                info['n_centers'] = len(_obj.cluster_centers_)
            # Try silhouette if sklearn available
            try:
                from sklearn.metrics import silhouette_score
                if hasattr(_obj, 'labels_') and len(set(_obj.labels_)) > 1:
                    # look for X in namespace
                    for _k, _v in _user_globals.items():
                        if hasattr(_v, 'shape') and len(getattr(_v,'shape',[]))==2:
                            try:
                                score = float(silhouette_score(_v, _obj.labels_))
                                info['silhouette_score'] = round(score, 4)
                                break
                            except: pass
            except: pass
            models_tried.append(info)
    _ml_results['models'] = models_tried
    _ml_results['status'] = 'success'
except Exception as e:
    _ml_results['status'] = 'error'
    _ml_results['error'] = traceback.format_exc()
${PRINT_RESULTS}
`;
}

function regressionWrapper(code: string): string {
    return `${SAFE_IMPORTS}
_user_globals = {}
try:
    exec(${JSON.stringify(code)}, _user_globals)
    models_tried = []
    for _name, _obj in _user_globals.items():
        cls = type(_obj).__name__
        if any(x in cls for x in ('Regressor','Regression','SVR','Ridge','Lasso','ElasticNet')):
            info = {'model': cls}
            if hasattr(_obj, 'coef_'):
                coef = _obj.coef_
                if hasattr(coef, 'tolist'):
                    info['coefficients'] = coef.tolist()[:10]  # cap at 10
                else:
                    info['coefficients'] = float(coef)
            if hasattr(_obj, 'intercept_'):
                ic = _obj.intercept_
                info['intercept'] = float(ic) if hasattr(ic,'__float__') else str(ic)
            if hasattr(_obj, 'score') and hasattr(_obj, 'feature_importances_') == False:
                # try to compute R2 on any X,y found in namespace
                pass
            # Look for r2, mse, mae in namespace directly
            for _k, _v in _user_globals.items():
                if 'r2' in _k.lower() or 'r_squared' in _k.lower():
                    try: info['r2_score'] = round(float(_v), 4)
                    except: pass
                if 'mse' in _k.lower():
                    try: info['mse'] = round(float(_v), 4)
                    except: pass
                if 'mae' in _k.lower():
                    try: info['mae'] = round(float(_v), 4)
                    except: pass
            models_tried.append(info)
    _ml_results['models'] = models_tried
    _ml_results['status'] = 'success'
except Exception as e:
    _ml_results['status'] = 'error'
    _ml_results['error'] = traceback.format_exc()
${PRINT_RESULTS}
`;
}

function classificationWrapper(code: string): string {
    return `${SAFE_IMPORTS}
_user_globals = {}
try:
    exec(${JSON.stringify(code)}, _user_globals)
    models_tried = []
    for _name, _obj in _user_globals.items():
        cls = type(_obj).__name__
        if any(x in cls for x in ('Classifier','SVC','LogisticRegression','KNeighbors')):
            info = {'model': cls}
            if hasattr(_obj, 'classes_'):
                info['classes'] = list(str(c) for c in _obj.classes_)
                info['n_classes'] = len(_obj.classes_)
            if hasattr(_obj, 'feature_importances_'):
                fi = _obj.feature_importances_
                if hasattr(fi,'tolist'):
                    info['top_feature_importances'] = sorted(fi.tolist(), reverse=True)[:5]
            models_tried.append(info)
    # Capture any accuracy/f1 stored in namespace
    metrics = {}
    for _k, _v in _user_globals.items():
        for metric in ('accuracy','f1','precision','recall','auc','roc'):
            if metric in _k.lower():
                try: metrics[_k] = round(float(_v), 4)
                except: pass
    _ml_results['models'] = models_tried
    _ml_results['metrics'] = metrics
    _ml_results['status'] = 'success'
except Exception as e:
    _ml_results['status'] = 'error'
    _ml_results['error'] = traceback.format_exc()
${PRINT_RESULTS}
`;
}

function dataframeWrapper(code: string): string {
    return `${SAFE_IMPORTS}
_user_globals = {}
try:
    exec(${JSON.stringify(code)}, _user_globals)
    import pandas as pd
    dfs = {}
    for _name, _obj in _user_globals.items():
        if isinstance(_obj, pd.DataFrame):
            # Build safe describe — pandas 3.x may have non-JSON types
            safe_stats = {}
            try:
                desc = _obj.describe(include='all')
                for col in desc.columns:
                    safe_stats[str(col)] = {}
                    for stat in desc.index:
                        val = desc.loc[stat, col]
                        try:
                            import math
                            if isinstance(val, float) and math.isnan(val):
                                safe_stats[str(col)][str(stat)] = None
                            else:
                                safe_stats[str(col)][str(stat)] = round(float(val), 4) if isinstance(val, float) else str(val)
                        except Exception:
                            safe_stats[str(col)][str(stat)] = str(val)
            except Exception as desc_err:
                safe_stats = {'error': str(desc_err)}

            # Safe null counts
            try:
                null_counts = {str(k): int(v) for k, v in _obj.isnull().sum().items()}
            except Exception:
                null_counts = {}

            # Safe dtypes
            try:
                dtypes = {str(k): str(v) for k, v in _obj.dtypes.items()}
            except Exception:
                dtypes = {}

            # Safe sample rows
            try:
                sample = _obj.head(3).astype(str).to_dict(orient='records')
            except Exception:
                sample = []

            dfs[_name] = {
                'shape': list(_obj.shape),
                'columns': list(str(c) for c in _obj.columns),
                'dtypes': dtypes,
                'null_counts': null_counts,
                'describe': safe_stats,
                'sample_rows': sample,
            }
    _ml_results['dataframes'] = dfs
    _ml_results['status'] = 'success'
except Exception as e:
    _ml_results['status'] = 'error'
    _ml_results['error'] = traceback.format_exc()
${PRINT_RESULTS}
`;
}

function neuralNetworkWrapper(code: string): string {
    return `${SAFE_IMPORTS}
_user_globals = {}
try:
    exec(${JSON.stringify(code)}, _user_globals)
    model_info = []
    for _name, _obj in _user_globals.items():
        cls = type(_obj).__name__
        # Keras / TF
        if hasattr(_obj, 'summary') and hasattr(_obj, 'layers'):
            try:
                import io
                buf = io.StringIO()
                _obj.summary(print_fn=lambda x: buf.write(x + '\\n'))
                model_info.append({'name': _name, 'framework': 'keras', 'summary': buf.getvalue()[:2000]})
            except: pass
        # PyTorch
        if hasattr(_obj, 'parameters') and hasattr(_obj, 'forward'):
            try:
                params = sum(p.numel() for p in _obj.parameters())
                trainable = sum(p.numel() for p in _obj.parameters() if p.requires_grad)
                model_info.append({'name': _name, 'framework': 'pytorch', 'total_params': params, 'trainable_params': trainable})
            except: pass
    # Capture training history if any keras History object exists
    history_info = {}
    for _name, _obj in _user_globals.items():
        if hasattr(_obj, 'history') and isinstance(getattr(_obj,'history',None), dict):
            h = _obj.history
            history_info[_name] = {k: [round(float(x),4) for x in v[-5:]] for k,v in h.items()}
    _ml_results['models'] = model_info
    _ml_results['history'] = history_info
    _ml_results['status'] = 'success'
except Exception as e:
    _ml_results['status'] = 'error'
    _ml_results['error'] = traceback.format_exc()
${PRINT_RESULTS}
`;
}

function dimReductionWrapper(code: string): string {
    return `${SAFE_IMPORTS}
_user_globals = {}
try:
    exec(${JSON.stringify(code)}, _user_globals)
    models_tried = []
    for _name, _obj in _user_globals.items():
        cls = type(_obj).__name__
        if any(x in cls for x in ('PCA','TSNE','TruncatedSVD','FastICA','NMF','UMAP')):
            info = {'model': cls}
            if hasattr(_obj, 'explained_variance_ratio_'):
                evr = _obj.explained_variance_ratio_
                info['explained_variance_ratio'] = [round(float(v),4) for v in evr]
                info['total_explained_variance'] = round(float(sum(evr)),4)
            if hasattr(_obj, 'n_components_'):
                info['n_components'] = int(_obj.n_components_)
            elif hasattr(_obj, 'n_components'):
                info['n_components_param'] = _obj.n_components
            if hasattr(_obj, 'singular_values_'):
                sv = _obj.singular_values_
                info['singular_values'] = [round(float(v),4) for v in sv]
            models_tried.append(info)
    _ml_results['models'] = models_tried
    _ml_results['status'] = 'success'
except Exception as e:
    _ml_results['status'] = 'error'
    _ml_results['error'] = traceback.format_exc()
${PRINT_RESULTS}
`;
}

function generalWrapper(code: string): string {
    return `${SAFE_IMPORTS}
import io, contextlib
_out_buf = io.StringIO()
try:
    with contextlib.redirect_stdout(_out_buf):
        exec(${JSON.stringify(code)})
    _ml_results['captured_output'] = _out_buf.getvalue()
    _ml_results['status'] = 'success'
except Exception as e:
    _ml_results['status'] = 'error'
    _ml_results['error'] = traceback.format_exc()
    _ml_results['captured_output'] = _out_buf.getvalue()
${PRINT_RESULTS}
`;
}
