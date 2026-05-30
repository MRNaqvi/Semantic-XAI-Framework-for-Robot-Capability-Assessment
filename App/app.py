from pathlib import Path
import html
import io
import json
import os
import re
import socket
import tempfile
import urllib.error
import urllib.request
import zipfile

os.environ.setdefault(
    "MPLCONFIGDIR",
    str(Path(tempfile.gettempdir()) / "s-xai-matplotlib"),
)

import h5py
import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS
import tensorflow as tf
from tensorflow import keras

try:
    from lime.lime_tabular import LimeTabularExplainer
except Exception as exc:
    LimeTabularExplainer = None
    LIME_IMPORT_ERROR = str(exc)
else:
    LIME_IMPORT_ERROR = ""

try:
    import shap
except Exception as exc:
    shap = None
    SHAP_IMPORT_ERROR = str(exc)
else:
    SHAP_IMPORT_ERROR = ""


app = Flask(__name__)
CORS(app)

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "models"

MODEL_CONFIGS = [
    {
        "name": "Ned 2",
        "path": MODEL_DIR / "model_robotic_arm_2.keras",
        "robot": "RCO:Ned-2",
        "repeatability_capability": "RCO:OperationalRepeatabilityCapability1",
        "precision_capability": "RCO:OperationalPrecisionCapability1",
    },
    {
        "name": "IRB 2400",
        "path": MODEL_DIR / "model_robotic_arm_3.keras",
        "robot": "RCO:IRB-2400",
        "repeatability_capability": "RCO:OperationalRepeatabilityCapability3",
        "precision_capability": "RCO:OperationalPrecisionCapability3",
    },
    {
        "name": "IRB 1200",
        "path": MODEL_DIR / "model_robotic_arm_4.keras",
        "robot": "RCO:IRB-1200",
        "repeatability_capability": "RCO:OperationalRepeatabilityCapability2",
        "precision_capability": "RCO:OperationalPrecisionCapability2",
    },
]

MODELS = {}
MODEL_LOAD_ERRORS = {}
FEATURE_NAMES = ["X", "Y", "Z"]
OUTPUT_LABELS = ["repeatability", "precision"]
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.2:3b")
OLLAMA_TIMEOUT_SECONDS = int(os.environ.get("OLLAMA_TIMEOUT_SECONDS", "140"))


def load_models():
    MODELS.clear()
    MODEL_LOAD_ERRORS.clear()

    for config in MODEL_CONFIGS:
        path = config["path"]
        try:
            if not path.exists() or path.stat().st_size == 0:
                raise FileNotFoundError(f"{path.name} is missing or empty.")

            MODELS[config["name"]] = load_robotic_arm_model(path)
        except Exception as exc:
            MODEL_LOAD_ERRORS[config["name"]] = str(exc)


def h_swish(value):
    return value * tf.nn.relu6(value + 3.0) / 6.0


def load_robotic_arm_model(path):
    inputs = keras.Input(shape=(3,), dtype=np.float32)
    x = keras.layers.Dense(24, activation="linear")(inputs)
    x = keras.layers.Lambda(h_swish)(x)
    x = keras.layers.Dense(32, activation="linear")(x)
    x = keras.layers.Lambda(h_swish)(x)
    x = keras.layers.Dense(16, activation="linear")(x)
    x = keras.layers.Lambda(h_swish)(x)
    repeatability = keras.layers.Dense(1, activation="sigmoid", name="repeatability")(x)
    precision = keras.layers.Dense(1, activation="relu", name="precision")(x)
    model = keras.Model(inputs=inputs, outputs=[repeatability, precision])

    with zipfile.ZipFile(path) as archive:
        weights_data = archive.read("model.weights.h5")

    with h5py.File(io.BytesIO(weights_data), "r") as weights_file:
        dense_layers = [layer for layer in model.layers if isinstance(layer, keras.layers.Dense)]
        for index, layer in enumerate(dense_layers):
            group = weights_file[f"layers/dense{'' if index == 0 else f'_{index}'}/vars"]
            layer.set_weights([group["0"][()], group["1"][()]])

    return model


def flatten_prediction(raw_prediction):
    values = []

    if isinstance(raw_prediction, (list, tuple)):
        for item in raw_prediction:
            values.extend(np.asarray(item).reshape(-1).astype(float).tolist())
    else:
        values.extend(np.asarray(raw_prediction).reshape(-1).astype(float).tolist())

    return values


def make_ontology_updates(config, outputs):
    updates = [
        {
            "robot": config["robot"],
            "capability": config["repeatability_capability"],
            "property": "RCO:has_Measurement_Value",
            "value": outputs[0],
        }
    ]

    if len(outputs) > 1:
        updates.append(
            {
                "robot": config["robot"],
                "capability": config["precision_capability"],
                "property": "RCO:has_Measurement_Value",
                "value": outputs[1],
            }
        )

    return updates


def build_ontology_update_query(ontology_updates):
    values = "\n        ".join(
        f"({update['robot']} {update['capability']} \"{update['value']}\"^^xsd:decimal)"
        for update in ontology_updates
    )

    return f"""PREFIX RCO: <http://RCO.enit.fr/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

DELETE {{
    ?capability RCO:has_Measurement_Value ?oldValue .
}}
INSERT {{
    ?capability RCO:has_Measurement_Value ?newValue .
}}
WHERE {{
    VALUES (?robot ?capability ?newValue) {{
        {values}
    }}
    ?robot RCO:hasCapability ?capability .
    OPTIONAL {{ ?capability RCO:has_Measurement_Value ?oldValue . }}
}}
"""


def predict_with_model(config, data):
    model_name = config["name"]
    if model_name not in MODELS:
        error = MODEL_LOAD_ERRORS.get(model_name, "Model was not loaded.")
        raise RuntimeError(f"{model_name} is unavailable: {error}")

    features = data
    prediction = MODELS[model_name].predict(np.array([features], dtype=np.float32), verbose=0)
    outputs = flatten_prediction(prediction)

    if not outputs:
        raise RuntimeError(f"{model_name} returned no prediction values.")

    return {
        "model": model_name,
        "robot": config["robot"],
        "input_features": features,
        "repeatability": outputs[0],
        "precision": outputs[1] if len(outputs) > 1 else None,
        "outputs": {
            "repeatability": outputs[0],
            "precision": outputs[1] if len(outputs) > 1 else None,
        },
        "ontology_updates": make_ontology_updates(config, outputs),
    }


def make_lime_training_data(coordinates, sample_count=240):
    center = np.asarray(coordinates, dtype=np.float32)
    scale = np.maximum(np.abs(center) * 0.08, 0.05)
    rng = np.random.default_rng(42)
    samples = rng.normal(loc=center, scale=scale, size=(sample_count, len(FEATURE_NAMES)))
    return np.vstack([center, samples]).astype(np.float32)


def make_local_samples(coordinates, sample_count=80, seed=7):
    center = np.asarray(coordinates, dtype=np.float32)
    scale = np.maximum(np.abs(center) * 0.08, 0.05)
    rng = np.random.default_rng(seed)
    return rng.normal(loc=center, scale=scale, size=(sample_count, len(FEATURE_NAMES))).astype(np.float32)


def predict_output_column(model, samples, output_index):
    prediction = model.predict(np.asarray(samples, dtype=np.float32), verbose=0)
    if isinstance(prediction, (list, tuple)):
        values = np.asarray(prediction[output_index]).reshape(-1)
    else:
        values = np.asarray(prediction).reshape((len(samples), -1))[:, output_index]
    return values.astype(float)


def explain_model_with_lime(config, coordinates, training_data):
    model_name = config["name"]
    if model_name not in MODELS:
        error = MODEL_LOAD_ERRORS.get(model_name, "Model was not loaded.")
        raise RuntimeError(f"{model_name} is unavailable: {error}")

    model = MODELS[model_name]
    result = predict_with_model(config, coordinates)
    explanations = {}

    for output_index, output_name in enumerate(OUTPUT_LABELS):
        explainer = LimeTabularExplainer(
            training_data,
            feature_names=FEATURE_NAMES,
            mode="regression",
            discretize_continuous=False,
            random_state=42,
        )

        def predict_fn(samples, index=output_index):
            return predict_output_column(model, samples, index)

        explanation = explainer.explain_instance(
            np.asarray(coordinates, dtype=np.float32),
            predict_fn,
            num_features=len(FEATURE_NAMES),
        )
        weights_by_feature = {feature: 0.0 for feature in FEATURE_NAMES}
        for feature, weight in explanation.as_list():
            feature_name = feature.split(" ")[0]
            if feature_name in weights_by_feature:
                weights_by_feature[feature_name] = float(weight)

        strongest_feature = max(
            weights_by_feature,
            key=lambda feature: abs(weights_by_feature[feature]),
        )
        explanations[output_name] = {
            "prediction": result[output_name],
            "feature_weights": weights_by_feature,
            "strongest_feature": strongest_feature,
            "strongest_weight": weights_by_feature[strongest_feature],
            "intercept": float(explanation.intercept[0])
            if hasattr(explanation, "intercept") and explanation.intercept
            else None,
        }

    return {
        "model": model_name,
        "robot": config["robot"],
        "input_features": coordinates,
        "outputs": {
            "repeatability": result["repeatability"],
            "precision": result["precision"],
        },
        "lime": explanations,
    }


def explain_model_with_shap(config, coordinates):
    model_name = config["name"]
    if model_name not in MODELS:
        error = MODEL_LOAD_ERRORS.get(model_name, "Model was not loaded.")
        raise RuntimeError(f"{model_name} is unavailable: {error}")

    model = MODELS[model_name]
    background = make_local_samples(coordinates, sample_count=36, seed=11)
    sample = np.asarray([coordinates], dtype=np.float32)
    result = predict_with_model(config, coordinates)
    explanations = {}

    for output_index, output_name in enumerate(OUTPUT_LABELS):
        def predict_fn(samples, index=output_index):
            return predict_output_column(model, samples, index)

        explainer = shap.KernelExplainer(predict_fn, background)
        shap_values = explainer.shap_values(sample, nsamples=64)
        values = np.asarray(shap_values).reshape(-1).astype(float)
        weights_by_feature = {
            feature: float(values[index]) if index < len(values) else 0.0
            for index, feature in enumerate(FEATURE_NAMES)
        }
        strongest_feature = max(
            weights_by_feature,
            key=lambda feature: abs(weights_by_feature[feature]),
        )
        explanations[output_name] = {
            "prediction": result[output_name],
            "feature_weights": weights_by_feature,
            "strongest_feature": strongest_feature,
            "strongest_weight": weights_by_feature[strongest_feature],
        }

    return {
        "model": model_name,
        "robot": config["robot"],
        "input_features": coordinates,
        "outputs": {
            "repeatability": result["repeatability"],
            "precision": result["precision"],
        },
        "shap": explanations,
    }


def explain_model_with_integrated_gradients(config, coordinates, steps=32):
    model_name = config["name"]
    if model_name not in MODELS:
        error = MODEL_LOAD_ERRORS.get(model_name, "Model was not loaded.")
        raise RuntimeError(f"{model_name} is unavailable: {error}")

    model = MODELS[model_name]
    result = predict_with_model(config, coordinates)
    input_tensor = tf.convert_to_tensor([coordinates], dtype=tf.float32)
    baseline = tf.zeros_like(input_tensor)
    alphas = tf.linspace(0.0, 1.0, steps + 1)
    explanations = {}

    for output_index, output_name in enumerate(OUTPUT_LABELS):
        gradients = []
        for alpha in alphas:
            interpolated = baseline + alpha * (input_tensor - baseline)
            with tf.GradientTape() as tape:
                tape.watch(interpolated)
                prediction = model(interpolated, training=False)
                output = prediction[output_index] if isinstance(prediction, (list, tuple)) else prediction[:, output_index]
            gradient = tape.gradient(output, interpolated)
            gradients.append(gradient)

        stacked = tf.stack(gradients, axis=0)
        average_gradients = tf.reduce_mean((stacked[:-1] + stacked[1:]) / 2.0, axis=0)
        attributions = (input_tensor - baseline) * average_gradients
        values = attributions.numpy().reshape(-1).astype(float)
        weights_by_feature = {
            feature: float(values[index]) if index < len(values) else 0.0
            for index, feature in enumerate(FEATURE_NAMES)
        }
        strongest_feature = max(
            weights_by_feature,
            key=lambda feature: abs(weights_by_feature[feature]),
        )
        explanations[output_name] = {
            "prediction": result[output_name],
            "feature_weights": weights_by_feature,
            "strongest_feature": strongest_feature,
            "strongest_weight": weights_by_feature[strongest_feature],
            "baseline": [0.0 for _ in FEATURE_NAMES],
            "steps": steps,
        }

    return {
        "model": model_name,
        "robot": config["robot"],
        "input_features": coordinates,
        "outputs": {
            "repeatability": result["repeatability"],
            "precision": result["precision"],
        },
        "integrated_gradients": explanations,
    }


def explain_model_with_permutation_importance(config, coordinates):
    model_name = config["name"]
    if model_name not in MODELS:
        error = MODEL_LOAD_ERRORS.get(model_name, "Model was not loaded.")
        raise RuntimeError(f"{model_name} is unavailable: {error}")

    result = predict_with_model(config, coordinates)
    base = np.asarray(coordinates, dtype=np.float32)
    scale = np.maximum(np.abs(base) * 0.12, 0.05)
    explanations = {}

    for output_index, output_name in enumerate(OUTPUT_LABELS):
        baseline_prediction = result[output_name]
        weights_by_feature = {}
        perturbed_predictions = {}

        for feature_index, feature in enumerate(FEATURE_NAMES):
            high = base.copy()
            low = base.copy()
            high[feature_index] = high[feature_index] + scale[feature_index]
            low[feature_index] = low[feature_index] - scale[feature_index]
            high_prediction = float(
                predict_output_column(MODELS[model_name], np.asarray([high], dtype=np.float32), output_index)[0]
            )
            low_prediction = float(
                predict_output_column(MODELS[model_name], np.asarray([low], dtype=np.float32), output_index)[0]
            )
            importance = max(
                abs(high_prediction - baseline_prediction),
                abs(low_prediction - baseline_prediction),
            )
            direction = high_prediction - low_prediction
            weights_by_feature[feature] = float(importance if direction >= 0 else -importance)
            perturbed_predictions[feature] = {
                "high": high_prediction,
                "low": low_prediction,
                "delta": float(scale[feature_index]),
            }

        strongest_feature = max(
            weights_by_feature,
            key=lambda feature: abs(weights_by_feature[feature]),
        )
        explanations[output_name] = {
            "prediction": baseline_prediction,
            "feature_weights": weights_by_feature,
            "strongest_feature": strongest_feature,
            "strongest_weight": weights_by_feature[strongest_feature],
            "perturbed_predictions": perturbed_predictions,
        }

    return {
        "model": model_name,
        "robot": config["robot"],
        "input_features": coordinates,
        "outputs": {
            "repeatability": result["repeatability"],
            "precision": result["precision"],
        },
        "permutation_importance": explanations,
    }


def compact_text(value, max_chars=1200):
    text = str(value or "").strip()
    if len(text) <= max_chars:
        return text
    return f"{text[:max_chars]}... [truncated]"


def simplify_rdfox_text(value, max_chars=900):
    text = html.unescape(str(value or ""))
    text = re.sub(r"<span[^>]*>", "", text)
    text = text.replace("</span>", "")
    text = re.sub(r"<http://RCO\.enit\.fr/([^>]+)>", r"RCO:\1", text)
    text = re.sub(r"http://RCO\.enit\.fr/([A-Za-z0-9_-]+)", r"RCO:\1", text)
    text = text.replace("xsd:decimal", "decimal")
    text = re.sub(r"\s+", " ", text).strip()
    return compact_text(text, max_chars)


def extract_rdfox_rule_evidence(rdfox_json):
    facts = rdfox_json.get("facts", {}) if isinstance(rdfox_json, dict) else {}
    if isinstance(facts, list):
        fact_items = facts
    elif isinstance(facts, dict):
        fact_items = list(facts.values())
    else:
        fact_items = []

    root_fact = next(
        (fact for fact in fact_items if fact.get("distance-from-root") == 0),
        fact_items[0] if fact_items else {},
    )
    rule_instances = root_fact.get("rule-instances") or []
    root_rule = rule_instances[0].get("rule") if rule_instances else ""
    body_fact_ids = set()
    if rule_instances:
        body_fact_ids = {
            str(item)
            for item in rule_instances[0].get("body-facts", [])
            if item is not None
        }

    body_facts = []
    if isinstance(facts, dict):
        for fact_id in body_fact_ids:
            fact = facts.get(fact_id)
            if fact and fact.get("fact"):
                body_facts.append(simplify_rdfox_text(fact["fact"], 220))
    else:
        body_facts = [
            simplify_rdfox_text(fact.get("fact"), 220)
            for fact in fact_items
            if fact.get("distance-from-root") == 1 and fact.get("fact")
        ]

    return {
        "root_fact": simplify_rdfox_text(root_fact.get("fact"), 260),
        "rule": simplify_rdfox_text(root_rule, 900),
        "body_facts": body_facts[:5],
    }


def extract_measurement_value(measurements, label):
    match = re.search(rf"{label}\s*:\s*(\[[^\]]+\]|[-+]?\d*\.?\d+)", measurements, re.IGNORECASE)
    return match.group(1) if match else "not available"


def build_rule_based_llm_draft(payload, evidence):
    selected_fact = simplify_rdfox_text(payload.get("selected_fact", "selected fact"), 260)
    measurements = payload.get("measurements", "")
    repeatability = extract_measurement_value(measurements, "Repeatability")
    precision = extract_measurement_value(measurements, "Precision")
    robot = selected_fact.split(" rdf:type ")[0].strip() if " rdf:type " in selected_fact else selected_fact
    fact_name = selected_fact.split(" rdf:type ")[-1].strip() if " rdf:type " in selected_fact else evidence["root_fact"]
    fact_words = re.sub(r"(?<!^)([A-Z])", r" \1", fact_name).strip().lower()

    if "Repeatability" in fact_name:
        rule_reason = (
            "the Datalog rule checks the robot repeatability measurement and RDFox confirms it equals "
            "the minimum repeatability capability value among the compared robots"
        )
    elif "Precision" in fact_name:
        rule_reason = (
            "the Datalog rule checks the robot precision measurement and RDFox confirms it equals "
            "the maximum precision capability value among the compared robots"
        )
    else:
        rule_reason = "RDFox applies the Datalog rule evidence shown for the selected fact"
    value_text = (
        f"operational repeatability value is {repeatability} mm and "
        f"operational precision value is {precision} mm"
    )

    return (
        f"{robot} is selected as {fact_words} because its {value_text}. "
        f"This follows from RDFox reasoning because {rule_reason}."
    )


def local_llm_answer_drifted(answer):
    lowered = answer.lower()
    bad_phrases = [
        "json format",
        "prefixes",
        "dictionary",
        "here is",
        "here's a breakdown",
        "resource description framework",
        "minimum required value",
        "high repeatability performance",
    ]
    missing_rule_reason = "rdfox" not in lowered and "datalog" not in lowered and "rule" not in lowered
    return missing_rule_reason or any(phrase in lowered for phrase in bad_phrases)


def build_open_llm_prompt(payload):
    selected_fact = payload.get("selected_fact", "No selected fact.")
    capability_focus = payload.get("capability_focus", "not specified")
    measurements = payload.get("measurements", "No measurements provided.")
    before_facts = payload.get("before_facts", "No before facts provided.")
    after_facts = payload.get("after_facts", "No after facts provided.")
    rdfox_json = payload.get("rdfox_json", {})
    evidence = extract_rdfox_rule_evidence(rdfox_json)
    body_facts = "\n".join(f"- {fact}" for fact in evidence["body_facts"]) or "No body facts available."
    draft = build_rule_based_llm_draft(payload, evidence)

    return f"""Rewrite the draft explanation for a manufacturing user.

Use only the draft and evidence. Do not explain RDF, JSON, prefixes, fields, or data format. Keep exactly two short sentences.
Domain rule: lower repeatability error is better; higher precision capability is better.
Do not say "minimum required value"; say "minimum repeatability capability value among the compared robots" when explaining repeatability.
Mention both repeatability and precision values exactly as they appear in the draft.

Draft explanation:
{draft}

Selected fact:
{compact_text(selected_fact, 280)}

Capability focus:
{compact_text(capability_focus, 120)}

Measurements:
{compact_text(measurements, 420)}

Before facts:
{compact_text(before_facts, 360)}

After facts:
{compact_text(after_facts, 360)}

RDFox selected fact:
{evidence["root_fact"]}

Datalog rule evidence:
{evidence["rule"]}

Rule body facts used:
{body_facts}
"""


def call_ollama(prompt, model):
    request_body = json.dumps(
        {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.2,
                "num_ctx": 2048,
                "num_predict": 140,
                "top_p": 0.85,
            },
        }
    ).encode("utf-8")

    request_data = urllib.request.Request(
        f"{OLLAMA_URL}/api/generate",
        data=request_body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(request_data, timeout=OLLAMA_TIMEOUT_SECONDS) as response:
        body = json.loads(response.read().decode("utf-8"))
        return body.get("response", "").strip()


@app.route("/predict", methods=["POST"])
def predict():
    try:
        request_body = request.get_json(silent=True) or {}
        data_sets = request_body.get("data", [])
        if not isinstance(data_sets, list) or len(data_sets) == 0:
            raise ValueError("Data must be a non-empty list of arrays.")

        all_results = []

        for set_num, data in enumerate(data_sets, start=1):
            if len(data) != 3:
                raise ValueError(f"Data set {set_num} must contain exactly 3 XYZ values.")

            data = [float(i) for i in data]
            model_results = [predict_with_model(config, data) for config in MODEL_CONFIGS]
            repeatability_predictions = [result["repeatability"] for result in model_results]
            ontology_updates = [
                update
                for result in model_results
                for update in result["ontology_updates"]
            ]

            all_results.append(
                {
                    "set_num": set_num,
                    "task_coordinates": {"x": data[0], "y": data[1], "z": data[2]},
                    "predictions": repeatability_predictions,
                    "model_outputs": model_results,
                    "ontology_updates": ontology_updates,
                    "ontology_update_query": build_ontology_update_query(ontology_updates),
                }
            )

        return jsonify(
            {
                "code": 202,
                "status": True,
                "message": "Record Saved Successfully",
                "data": all_results,
            }
        )

    except Exception as exc:
        return (
            jsonify(
                {
                    "code": 400,
                    "status": False,
                    "message": str(exc),
                    "data": "",
                }
            ),
            400,
        )


@app.route("/models/status", methods=["GET"])
def model_status():
    return jsonify(
        {
            "loaded_models": sorted(MODELS.keys()),
            "errors": MODEL_LOAD_ERRORS,
        }
    )


@app.route("/explain/lime/status", methods=["GET"])
def lime_status():
    return jsonify(
        {
            "available": LimeTabularExplainer is not None,
            "error": LIME_IMPORT_ERROR,
            "features": FEATURE_NAMES,
            "loaded_models": sorted(MODELS.keys()),
        }
    )


@app.route("/explain/lime", methods=["POST"])
def explain_lime():
    try:
        if LimeTabularExplainer is None:
            raise RuntimeError(
                f"LIME is not installed or could not be imported: {LIME_IMPORT_ERROR}"
            )

        request_body = request.get_json(silent=True) or {}
        data = request_body.get("data")
        if not isinstance(data, list) or len(data) != 3:
            raise ValueError("Data must contain exactly 3 XYZ values.")

        coordinates = [float(value) for value in data]

        training_data = make_lime_training_data(coordinates)
        explanations = [
            explain_model_with_lime(config, coordinates, training_data)
            for config in MODEL_CONFIGS
        ]

        return jsonify(
            {
                "code": 202,
                "status": True,
                "message": "LIME explanations generated successfully.",
                "data": {
                    "task_coordinates": {
                        "x": coordinates[0],
                        "y": coordinates[1],
                        "z": coordinates[2],
                    },
                    "features": FEATURE_NAMES,
                    "explanations": explanations,
                },
            }
        )

    except Exception as exc:
        return (
            jsonify(
                {
                    "code": 400,
                    "status": False,
                    "message": str(exc),
                    "data": "",
                }
            ),
            400,
        )


@app.route("/explain/shap/status", methods=["GET"])
def shap_status():
    return jsonify(
        {
            "available": shap is not None,
            "error": SHAP_IMPORT_ERROR,
            "features": FEATURE_NAMES,
            "loaded_models": sorted(MODELS.keys()),
        }
    )


@app.route("/explain/shap", methods=["POST"])
def explain_shap():
    try:
        if shap is None:
            raise RuntimeError(
                f"SHAP is not installed or could not be imported: {SHAP_IMPORT_ERROR}"
            )

        request_body = request.get_json(silent=True) or {}
        data = request_body.get("data")
        if not isinstance(data, list) or len(data) != 3:
            raise ValueError("Data must contain exactly 3 XYZ values.")

        coordinates = [float(value) for value in data]
        explanations = [
            explain_model_with_shap(config, coordinates)
            for config in MODEL_CONFIGS
        ]

        return jsonify(
            {
                "code": 202,
                "status": True,
                "message": "SHAP explanations generated successfully.",
                "data": {
                    "task_coordinates": {
                        "x": coordinates[0],
                        "y": coordinates[1],
                        "z": coordinates[2],
                    },
                    "features": FEATURE_NAMES,
                    "explanations": explanations,
                },
            }
        )

    except Exception as exc:
        return (
            jsonify(
                {
                    "code": 400,
                    "status": False,
                    "message": str(exc),
                    "data": "",
                }
            ),
            400,
        )


@app.route("/explain/integrated-gradients", methods=["POST"])
def explain_integrated_gradients():
    try:
        request_body = request.get_json(silent=True) or {}
        data = request_body.get("data")
        if not isinstance(data, list) or len(data) != 3:
            raise ValueError("Data must contain exactly 3 XYZ values.")

        coordinates = [float(value) for value in data]
        explanations = [
            explain_model_with_integrated_gradients(config, coordinates)
            for config in MODEL_CONFIGS
        ]

        return jsonify(
            {
                "code": 202,
                "status": True,
                "message": "Integrated Gradients explanations generated successfully.",
                "data": {
                    "task_coordinates": {
                        "x": coordinates[0],
                        "y": coordinates[1],
                        "z": coordinates[2],
                    },
                    "features": FEATURE_NAMES,
                    "explanations": explanations,
                },
            }
        )

    except Exception as exc:
        return (
            jsonify(
                {
                    "code": 400,
                    "status": False,
                    "message": str(exc),
                    "data": "",
                }
            ),
            400,
        )


@app.route("/explain/permutation", methods=["POST"])
def explain_permutation():
    try:
        request_body = request.get_json(silent=True) or {}
        data = request_body.get("data")
        if not isinstance(data, list) or len(data) != 3:
            raise ValueError("Data must contain exactly 3 XYZ values.")

        coordinates = [float(value) for value in data]
        explanations = [
            explain_model_with_permutation_importance(config, coordinates)
            for config in MODEL_CONFIGS
        ]

        return jsonify(
            {
                "code": 202,
                "status": True,
                "message": "Permutation Importance explanations generated successfully.",
                "data": {
                    "task_coordinates": {
                        "x": coordinates[0],
                        "y": coordinates[1],
                        "z": coordinates[2],
                    },
                    "features": FEATURE_NAMES,
                    "explanations": explanations,
                },
            }
        )

    except Exception as exc:
        return (
            jsonify(
                {
                    "code": 400,
                    "status": False,
                    "message": str(exc),
                    "data": "",
                }
            ),
            400,
        )


@app.route("/llm/reasoning", methods=["POST"])
def explain_with_open_llm():
    try:
        request_body = request.get_json(silent=True) or {}
        model = request_body.get("model") or OLLAMA_MODEL
        evidence = extract_rdfox_rule_evidence(request_body.get("rdfox_json", {}))
        draft = build_rule_based_llm_draft(request_body, evidence)
        prompt = build_open_llm_prompt(request_body)
        explanation = call_ollama(prompt, model)

        if not explanation:
            raise RuntimeError("The local open LLM returned an empty response.")
        if local_llm_answer_drifted(explanation):
            explanation = draft

        return jsonify(
            {
                "code": 202,
                "status": True,
                "message": "Open local LLM explanation generated successfully.",
                "data": {
                    "provider": "Ollama",
                    "model": model,
                    "explanation": explanation,
                    "prompt": prompt,
                    "prompt_characters": len(prompt),
                    "draft_explanation": draft,
                },
            }
        )

    except (TimeoutError, socket.timeout) as exc:
        return (
            jsonify(
                {
                    "code": 504,
                    "status": False,
                    "message": (
                        f"Ollama model '{model}' did not answer within "
                        f"{OLLAMA_TIMEOUT_SECONDS} seconds. The prompt is compacted for local models; "
                        "try again, or use a smaller/faster Ollama model such as llama3.2:1b."
                    ),
                    "data": str(exc),
                }
            ),
            504,
        )
    except urllib.error.HTTPError as exc:
        try:
            error_body = exc.read().decode("utf-8")
        except Exception:
            error_body = str(exc)
        return (
            jsonify(
                {
                    "code": exc.code,
                    "status": False,
                    "message": f"Ollama returned HTTP {exc.code}: {error_body}",
                    "data": "",
                }
            ),
            502,
        )
    except urllib.error.URLError as exc:
        return (
            jsonify(
                {
                    "code": 400,
                    "status": False,
                    "message": (
                        "Could not reach Ollama at "
                        f"{OLLAMA_URL}. Start Ollama and pull a model, for example: "
                        "ollama pull llama3.2:3b"
                    ),
                    "data": str(exc),
                }
            ),
            400,
        )
    except Exception as exc:
        return (
            jsonify(
                {
                    "code": 400,
                    "status": False,
                    "message": str(exc),
                    "data": "",
                }
            ),
            400,
        )


@app.route("/models/upload", methods=["POST"])
def upload_models():
    try:
        if not request.files:
            raise ValueError("No model files were uploaded.")

        updated = []
        config_by_name = {config["name"]: config for config in MODEL_CONFIGS}

        for model_name, file_storage in request.files.items():
            if model_name not in config_by_name:
                continue

            if not file_storage.filename.lower().endswith(".keras"):
                raise ValueError(f"{model_name} must be a .keras file.")

            target_path = config_by_name[model_name]["path"]
            target_path.parent.mkdir(parents=True, exist_ok=True)
            file_storage.save(target_path)
            updated.append(model_name)

        if not updated:
            raise ValueError("No recognized robot model files were uploaded.")

        load_models()

        return jsonify(
            {
                "code": 202,
                "status": True,
                "message": "Models uploaded and reloaded.",
                "updated_models": updated,
                "loaded_models": sorted(MODELS.keys()),
                "errors": MODEL_LOAD_ERRORS,
            }
        )

    except Exception as exc:
        return (
            jsonify(
                {
                    "code": 400,
                    "status": False,
                    "message": str(exc),
                    "loaded_models": sorted(MODELS.keys()),
                    "errors": MODEL_LOAD_ERRORS,
                }
            ),
            400,
        )


load_models()

if __name__ == "__main__":
    app.run(debug=True)
