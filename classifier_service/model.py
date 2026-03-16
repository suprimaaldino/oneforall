"""
model.py — Tone classifier for DinoBot.
Supports two modes:
  1. zero-shot: Uses HuggingFace zero-shot classification pipeline (no training needed)
  2. trained: Uses sentence-transformers embeddings + sklearn LogisticRegression (needs training)
"""

import os
import json
from typing import Optional, Any

# Supported tone labels
TONE_LABELS = [
    "formal",
    "casual",
    "neutral",
    "romantic",
    "flirt",
    "angry",
    "sarcastic",
    "professional",
    "apologetic",
    "urgent",
]

# ── Classifier state ────────────────────────────────────
_classifier_mode: str = "zero-shot"  # 'zero-shot' or 'trained'
_zero_shot_pipeline: Any = None
_trained_model: Any = None
_sentence_model: Any = None


def load_classifier(mode: Optional[str] = None) -> None:
    """Load the classifier model based on the selected mode."""
    global _classifier_mode, _zero_shot_pipeline, _trained_model, _sentence_model

    _classifier_mode = mode or os.getenv("CLASSIFIER_MODE", "zero-shot")
    print(f"[Classifier] Loading in '{_classifier_mode}' mode...")

    if _classifier_mode == "zero-shot":
        _load_zero_shot()
    elif _classifier_mode == "trained":
        _load_trained()
    else:
        print(f"[Classifier] Unknown mode '{_classifier_mode}', defaulting to zero-shot.")
        _classifier_mode = "zero-shot"
        _load_zero_shot()


def _load_zero_shot() -> None:
    """Load HuggingFace zero-shot classification pipeline."""
    global _zero_shot_pipeline
    try:
        from transformers import pipeline # type: ignore
        _zero_shot_pipeline = pipeline(
            "zero-shot-classification",
            model="facebook/bart-large-mnli",
            device=-1,  # CPU
        )
        print("[Classifier] ✅ Zero-shot pipeline loaded (facebook/bart-large-mnli)")
    except Exception as e:
        print(f"[Classifier] ⚠️ Failed to load zero-shot pipeline: {e}")
        print("[Classifier] Running in MOCK mode.")
        _zero_shot_pipeline = None


def _load_trained() -> None:
    """Load trained sklearn model + sentence-transformers encoder."""
    global _trained_model, _sentence_model
    try:
        import joblib # type: ignore
        from sentence_transformers import SentenceTransformer # type: ignore

        model_path = os.getenv("TRAINED_MODEL_PATH", "./trained_model/classifier.joblib")
        if os.path.exists(model_path):
            _trained_model = joblib.load(model_path)
            _sentence_model = SentenceTransformer("all-MiniLM-L6-v2")
            print(f"[Classifier] ✅ Trained model loaded from {model_path}")
        else:
            print(f"[Classifier] ⚠️ Model not found at {model_path}. Run train.py first!")
            print("[Classifier] Falling back to zero-shot mode.")
            _load_zero_shot()
    except Exception as e:
        print(f"[Classifier] ⚠️ Failed to load trained model: {e}")
        _load_zero_shot()


def classify(text: str) -> dict:
    """
    Classify the tone of a text message.
    Returns: { "tone": str, "confidence": float, "notes": str }
    """
    if _classifier_mode == "trained" and _trained_model and _sentence_model:
        return _classify_trained(text)
    elif _zero_shot_pipeline:
        return _classify_zero_shot(text)
    else:
        return _classify_mock(text)


def _classify_zero_shot(text: str) -> dict:
    """Classify using HuggingFace zero-shot pipeline."""
    if _zero_shot_pipeline is None:
        return _classify_mock(text)
    try:
        result = _zero_shot_pipeline(
            text,
            candidate_labels=TONE_LABELS,
            multi_label=False,
        )
        top_label = result["labels"][0]
        top_score = round(result["scores"][0], 3)

        # Build notes with top 3 labels
        top3 = [
            f"{label} ({score:.2f})"
            for label, score in zip(result["labels"][:3], result["scores"][:3])
        ]

        return {
            "tone": top_label,
            "confidence": top_score,
            "notes": f"Zero-shot top 3: {', '.join(top3)}",
        }
    except Exception as e:
        print(f"[Classifier] Zero-shot error: {e}")
        return _classify_mock(text)


def _classify_trained(text: str) -> dict:
    """Classify using trained sklearn model."""
    if _sentence_model is None or _trained_model is None:
        return _classify_mock(text)
    try:
        embedding = _sentence_model.encode([text])
        prediction = _trained_model.predict(embedding)[0]
        probabilities = _trained_model.predict_proba(embedding)[0]
        confidence = round(float(max(probabilities)), 3) # type: ignore

        return {
            "tone": prediction,
            "confidence": confidence,
            "notes": f"Trained model prediction",
        }
    except Exception as e:
        print(f"[Classifier] Trained model error: {e}")
        return _classify_mock(text)


def _classify_mock(text: str) -> dict:
    """Fallback mock classifier using keyword matching."""
    text_lower = text.lower()

    # Simple keyword-based classification
    if any(w in text_lower for w in ["dear", "sir", "madam", "please", "kindly", "regards"]):
        return {"tone": "formal", "confidence": 0.7, "notes": "Mock: formal keywords detected"}
    elif any(w in text_lower for w in ["love", "miss", "heart", "darling", "sweetheart", "❤"]):
        return {"tone": "romantic", "confidence": 0.6, "notes": "Mock: romantic keywords detected"}
    elif any(w in text_lower for w in [";)", "😉", "cute", "hot", "flirt", "😏"]):
        return {"tone": "flirt", "confidence": 0.6, "notes": "Mock: flirty keywords detected"}
    elif any(w in text_lower for w in ["angry", "furious", "!!!", "ridiculous", "terrible"]):
        return {"tone": "angry", "confidence": 0.6, "notes": "Mock: angry keywords detected"}
    elif any(w in text_lower for w in ["urgent", "asap", "immediately", "emergency"]):
        return {"tone": "urgent", "confidence": 0.7, "notes": "Mock: urgency keywords detected"}
    elif any(w in text_lower for w in ["sorry", "apologize", "my bad", "forgive"]):
        return {"tone": "apologetic", "confidence": 0.6, "notes": "Mock: apologetic keywords"}
    elif any(w in text_lower for w in ["hey", "yo", "sup", "lol", "haha", "wanna", "gonna"]):
        return {"tone": "casual", "confidence": 0.6, "notes": "Mock: casual keywords detected"}
    else:
        return {"tone": "neutral", "confidence": 0.5, "notes": "Mock: no strong keywords, defaulting to neutral"}
