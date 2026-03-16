#!/bin/bash
# ── DinoBot — Model Bootstrap Script ────────────────────
# Downloads recommended model files for the LLM and classifier services.

set -e

MODELS_DIR="./models"
mkdir -p "$MODELS_DIR"

echo "🦕 DinoBot Model Bootstrap"
echo "=========================="
echo ""

# ── Option 1: GPT4All (lightweight, CPU-friendly) ──────
echo "📥 Option 1: Downloading GPT4All model (~4GB)..."
echo "   This model runs well on CPU with 8GB+ RAM."
echo ""
echo "Run the following command to download:"
echo "  cd $MODELS_DIR"
echo "  wget https://gpt4all.io/models/ggml-gpt4all-j-v1.3-groovy.bin"
echo ""

# ── Option 2: Llama.cpp GGUF (higher quality) ──────────
echo "📥 Option 2: For better quality (requires more RAM/GPU):"
echo "   Download a GGUF quantized model from HuggingFace."
echo "   Recommended: Mistral-7B-Instruct-v0.2 (Q4_K_M variant)"
echo ""
echo "   1. Visit: https://huggingface.co/TheBloke"
echo "   2. Search for your preferred model"
echo "   3. Download the Q4_K_M GGUF variant"
echo "   4. Place the .gguf file in $MODELS_DIR/"
echo "   5. Update MODEL_PATH in docker-compose.yml"
echo ""

# ── Classifier model ───────────────────────────────────
echo "📥 Classifier: The zero-shot classifier downloads automatically"
echo "   (facebook/bart-large-mnli from HuggingFace, ~1.6GB)."
echo ""
echo "   For the trained classifier option:"
echo "   1. cd classifier_service"
echo "   2. python train.py --generate-sample --output ./trained_model"
echo "   3. Update CLASSIFIER_MODE=trained in docker-compose.yml"
echo ""

echo "✅ Done! Refer to README.md for full setup instructions."
