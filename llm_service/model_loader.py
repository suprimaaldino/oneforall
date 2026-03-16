"""
model_loader.py — Loads and manages the LLM model for inference.
Supports gpt4all (default) with comments showing how to swap to llama-cpp-python.
"""

import os
from typing import Optional

# ── gpt4all backend (default) ────────────────────────────
from gpt4all import GPT4All

_model: Optional[GPT4All] = None
_model_path: str = ""


def load_model(model_path: Optional[str] = None) -> None:
    """
    Load the LLM model into memory.
    If model_path is a directory, looks for .bin/.gguf files inside it.
    If model_path is a file, loads that file directly.
    """
    global _model, _model_path

    path = model_path or os.getenv("MODEL_PATH", "/models/ggml-gpt4all-j-v1.3-groovy.bin")
    _model_path = path

    print(f"[Model] Loading model from: {path}")

    try:
        # gpt4all can accept model name or full path
        if os.path.isfile(path):
            model_dir = os.path.dirname(path)
            model_name = os.path.basename(path)
            _model = GPT4All(model_name=model_name, model_path=model_dir, allow_download=False)
        else:
            # Try as a model name (gpt4all will download if allow_download=True)
            _model = GPT4All(model_name=path, allow_download=True)

        print(f"[Model] ✅ Model loaded successfully!")
    except Exception as e:
        print(f"[Model] ⚠️ Failed to load model: {e}")
        print(f"[Model] Running in MOCK mode — will return placeholder responses.")
        _model = None


def generate_text(
    prompt: str,
    max_tokens: int = 256,
    temperature: float = 0.7,
    tone: str = "auto-detect",
) -> str:
    """
    Generate text from the loaded model.
    Returns the model's response or a fallback if model is not loaded.
    """
    global _model

    if _model is None:
        # Mock mode for development/testing without a model
        return (
            f"[Mock reply] I received your message. "
            f"Tone: {tone}. This is a placeholder — download a model to get real responses!"
        )

    try:
        with _model.chat_session():
            response = _model.generate(
                prompt=prompt,
                max_tokens=max_tokens,
                temp=temperature,
                top_k=40,
                top_p=0.9,
                repeat_penalty=1.1,
            )
        return response.strip()
    except Exception as e:
        print(f"[Model] Generation error: {e}")
        return "Sorry, I had trouble generating a response. Please try again!"


# ── Alternative: llama-cpp-python backend ────────────────
# Uncomment below and comment out gpt4all imports above to use llama.cpp
#
# from llama_cpp import Llama
#
# _model: Optional[Llama] = None
#
# def load_model(model_path: Optional[str] = None) -> None:
#     global _model
#     path = model_path or os.getenv("MODEL_PATH", "/models/model.gguf")
#     _model = Llama(model_path=path, n_ctx=2048, n_threads=4)
#     print(f"[Model] Loaded llama.cpp model from {path}")
#
# def generate_text(prompt: str, max_tokens: int = 256,
#                   temperature: float = 0.7, tone: str = "auto-detect") -> str:
#     if _model is None:
#         return "[Error] Model not loaded."
#     output = _model(prompt, max_tokens=max_tokens, temperature=temperature,
#                     top_p=0.9, repeat_penalty=1.1)
#     return output["choices"][0]["text"].strip()
