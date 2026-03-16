# 🦕 wa-dino-bot — WhatsApp Personal AI Bot

A full-stack WhatsApp personal bot that **auto-replies** using open-source AI, with **tone analysis** (formal, casual, romantic, flirt, etc.) and an **admin dashboard**.

> ⚠️ **WhatsApp TOS Warning**: This project uses [Baileys](https://github.com/WhiskeySockets/Baileys) which operates via WhatsApp Web reverse-engineering. This may violate WhatsApp's Terms of Service and could result in account restrictions. **Use only for personal/hobby/low-volume purposes.** For production or business use, use the [official WhatsApp Business API](https://business.whatsapp.com/products/business-platform).

---

## 📐 Architecture

```
[WhatsApp Web / QR] ←→ [Backend (Node.js + Baileys)] ←→ [Message Router]
                                    │
                      ┌─────────────┴─────────────┐
                      │                           │
              [LLM Service]              [Tone Classifier]
              (gpt4all / llama.cpp)      (zero-shot / sklearn)
                      │                           │
                      └─────────┬─────────────────┘
                                │
                    [SQLite DB] + [Admin UI (React)]
```

| Service | Tech | Port | Purpose |
|---------|------|------|---------|
| **Backend** | Node.js + TypeScript + Baileys | 3000 | WhatsApp connector, message router, REST API |
| **LLM Service** | Python + FastAPI + gpt4all | 8001 | AI response generation |
| **Classifier** | Python + FastAPI + transformers | 8002 | Tone/style classification |
| **Admin UI** | React + Vite | 5173 | Dashboard, conversations view, settings |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and **npm**
- **Python** 3.10+ and **pip**
- **Docker** & **Docker Compose** (optional, recommended)
- A **WhatsApp account** on a phone (for QR login)

### Option A — Docker Compose (recommended)

```bash
# 1. Clone and enter the project
cd wa-dino-bot

# 2. Download a model (see "Model Weights" section below)
mkdir -p models
# Download gpt4all model (~4GB):
# wget -P models/ https://gpt4all.io/models/ggml-gpt4all-j-v1.3-groovy.bin

# 3. Start all services
docker-compose up --build

# 4. Scan the QR code shown in the backend service logs
# 5. Open http://localhost:5173 for the admin dashboard
```

### Option B — Local Development

```bash
# ── Backend ──
cd backend
npm install
npm run dev
# → Scan QR code in terminal, API on http://localhost:3000

# ── LLM Service ──
cd llm_service
pip install -r requirements.txt
python app.py
# → Runs on http://localhost:8001 (mock mode if no model)

# ── Classifier Service ──
cd classifier_service
pip install -r requirements.txt
python app.py
# → Runs on http://localhost:8002

# ── Admin UI ──
cd admin-ui
npm install
npm run dev
# → Opens on http://localhost:5173
```

---

## 🧠 Model Weights

### GPT4All (recommended for CPU)
- Lightweight, runs on 8GB+ RAM CPU
- Download: https://gpt4all.io/index.html
- Place `.bin` file in `models/` directory
- ~4GB download

### Llama.cpp / GGUF (higher quality)
- Better output quality, needs 16GB+ RAM or GPU
- Download quantized GGUF models from [HuggingFace/TheBloke](https://huggingface.co/TheBloke)
- Recommended: Mistral-7B-Instruct Q4_K_M
- To use: edit `model_loader.py` (uncomment llama.cpp section)

### Classifier
- **Zero-shot mode** (default): downloads `facebook/bart-large-mnli` automatically (~1.6GB)
- **Trained mode**: run `python train.py --generate-sample` to train on built-in examples

---

## 🎭 How to Change Persona & Temperature

### Via Admin UI
1. Open **http://localhost:5173** → **Settings**
2. Edit the **System Prompt** to change personality
3. Adjust **Temperature** slider (0 = precise, 2 = creative)
4. Select **Default Tone** (auto-detect, formal, casual, etc.)

### Via Environment Variables
```env
BOT_NAME=DinoBot
DEFAULT_TONE=auto-detect
LLM_TEMPERATURE=0.7
SAFETY_LEVEL=normal   # or "strict"
```

### Via REST API
```bash
# Update bot name
curl -X PUT http://localhost:3000/api/settings \
  -H "Content-Type: application/json" \
  -d '{"key": "bot_name", "value": "MyBot"}'

# Update temperature
curl -X PUT http://localhost:3000/api/settings \
  -H "Content-Type: application/json" \
  -d '{"key": "temperature", "value": "0.5"}'
```

---

## 📡 API Endpoints

### Backend (port 3000)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |
| GET | `/api/stats` | Dashboard statistics |
| GET | `/api/conversations` | List recent conversations |
| GET | `/api/conversations/:jid` | Messages with a contact |
| GET | `/api/settings` | All bot settings |
| PUT | `/api/settings` | Update a setting |

### LLM Service (port 8001)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/generate` | Generate AI reply |
| GET | `/health` | Health check |

### Classifier Service (port 8002)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/classify` | Classify message tone |
| GET | `/tones` | List supported tones |
| GET | `/health` | Health check |

---

## 🔒 Privacy & Safety

- **PII**: Store minimal personal data. Encrypt DB backups.
- **Consent**: Provide opt-out — users can reply `STOP` to disable auto-replies.
- **Safety filters**: profanity and content filtering built into prompts.
- **Prompt injection protection**: system prompt is always prepended server-side.
- **Rate limiting**: configurable per-contact message limits.

---

## 🧪 Testing

```bash
# Backend tests (Jest)
cd backend && npm test

# LLM service tests (Pytest)
cd llm_service && python -m pytest ../tests/llm_service/

# Classifier tests (Pytest)
cd classifier_service && python -m pytest ../tests/classifier_service/
```

---

## 📋 Hardware Requirements

| Use Case | RAM | GPU | Model |
|----------|-----|-----|-------|
| Light (hobby) | 8GB | None (CPU) | gpt4all-tiny |
| Medium | 16GB | None (CPU) | Quantized 7B (GGML Q4) |
| Best quality | 32GB | RTX 3090+ | Full 7B/13B model |

---

## ⚖️ Legal / Licensing

- **WhatsApp**: Community connectors may violate WhatsApp policy. Use for personal, low-volume only.
- **Model weights**: Check licenses for each model (Llama 2 has a specific license; Vicuna models are derivative).
- **This code**: MIT License (open-source)

---

## 📁 Project Structure

```
wa-dino-bot/
├── backend/               # Node.js + TypeScript
│   ├── src/
│   │   ├── index.ts       # Entry: Express + Baileys
│   │   ├── router.ts      # Message pipeline + REST API
│   │   ├── wa_client.ts   # WhatsApp connector
│   │   ├── llm_client.ts  # LLM service HTTP client
│   │   ├── classifier_client.ts
│   │   ├── db.ts          # SQLite database
│   │   └── config.ts      # Environment config
│   ├── Dockerfile
│   └── package.json
├── llm_service/           # Python FastAPI
│   ├── app.py             # POST /generate endpoint
│   ├── model_loader.py    # gpt4all / llama.cpp loader
│   ├── prompts.py         # System prompt & templates
│   ├── Dockerfile
│   └── requirements.txt
├── classifier_service/    # Python FastAPI
│   ├── app.py             # POST /classify endpoint
│   ├── model.py           # Zero-shot / sklearn classifier
│   ├── train.py           # Training script
│   ├── Dockerfile
│   └── requirements.txt
├── admin-ui/              # React + Vite
│   ├── src/
│   │   ├── pages/Dashboard.jsx
│   │   ├── pages/Conversations.jsx
│   │   ├── pages/Settings.jsx
│   │   ├── App.jsx
│   │   ├── api.js
│   │   └── index.css
│   ├── Dockerfile
│   └── package.json
├── scripts/
│   └── bootstrap_models.sh
├── tests/
│   ├── backend/router.test.ts
│   ├── llm_service/test_app.py
│   └── classifier_service/test_app.py
├── docker-compose.yml
├── .env.example
└── README.md
```
