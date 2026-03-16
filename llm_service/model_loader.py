"""
model_loader.py — Loads and manages the LLM model for inference.
Now using Google Gemini API instead of Local gpt4all.
"""

import os
from typing import Optional

try:
    import google.generativeai as genai # type: ignore
except ImportError:
    pass

from dotenv import load_dotenv # type: ignore

load_dotenv()

_model = None

def load_model(model_path: Optional[str] = None) -> None:
    """
    Load the Gemini API client.
    """
    global _model

    # Gunakan API key dari environment
    api_key = os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        print("[Model] ⚠️ GEMINI_API_KEY tidak ditemukan! Berjalan dalam mode MOCK.")
        _model = None
        return

    print("[Model] Menghubungkan ke Google Gemini API...")

    try:
        genai.configure(api_key=api_key)
        # Menggunakan gemini-1.5-flash (cepat, gratis, pintar)
        _model = genai.GenerativeModel('gemini-1.5-flash')
        print(f"[Model] ✅ Google Gemini API berhasil dihubungkan!")
    except Exception as e:
        print(f"[Model] ⚠️ Gagal menghubungkan ke Gemini: {e}")
        print(f"[Model] Berjalan dalam mode MOCK — akan merespons dengan placeholder.")
        _model = None

def generate_text(
    prompt: str,
    max_tokens: int = 256,
    temperature: float = 0.7,
    tone: str = "auto-detect",
) -> str:
    """
    Generate text menggunakan Google Gemini.
    """
    global _model

    if _model is None:
        # Mock mode jika API gagal/tidak disetel
        return (
            f"[Balasan Mock] Pesan kamu sudah diterima. "
            f"Nada: {tone}. Ini placeholder — Gemini API error!"
        )

    try:
        generation_config = genai.types.GenerationConfig(
            max_output_tokens=max_tokens,
            temperature=temperature,
        )
        response = _model.generate_content(prompt, generation_config=generation_config)
        
        # Ekstrak teks dari response
        return response.text.strip()
    except Exception as e:
        print(f"[Model] Generation error: {e}")
        return "Maaf, aku lagi ada gangguan. Coba lagi sebentar ya! 🤖"
