"""
app.py — FastAPI tone classifier service for DinoBot.
Provides POST /classify endpoint to analyze message tone/style.
"""

from fastapi import FastAPI
from pydantic import BaseModel, Field
from model import load_classifier, classify

app = FastAPI(
    title="DinoBot Tone Classifier",
    description="Classifies WhatsApp message tone (formal, casual, romantic, flirt, etc.)",
    version="1.0.0",
)


# ── Request / Response models ────────────────────────────
class ClassifyRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Text message to classify")


class ClassifyResponse(BaseModel):
    tone: str
    confidence: float
    notes: str = ""


# ── Endpoints ────────────────────────────────────────────
@app.post("/classify", response_model=ClassifyResponse)
async def classify_tone(req: ClassifyRequest):
    """Classify the tone/style of a text message."""
    result = classify(req.text)
    return ClassifyResponse(
        tone=result["tone"],
        confidence=result["confidence"],
        notes=result.get("notes", ""),
    )


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "service": "classifier_service"}


@app.get("/tones")
async def list_tones():
    """List all supported tone labels."""
    from model import TONE_LABELS
    return {"tones": TONE_LABELS}


# ── Startup ──────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    """Load the classifier model when the service starts."""
    print("[Classifier Service] 🚀 Starting up — loading classifier...")
    load_classifier()
    print("[Classifier Service] ✅ Ready to classify tones!")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
