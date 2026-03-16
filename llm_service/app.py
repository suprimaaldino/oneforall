"""
app.py — FastAPI LLM service for DinoBot.
Provides POST /generate endpoint that uses gpt4all (or llama.cpp) to generate replies.
"""

import json
import re
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from model_loader import load_model, generate_text
from prompts import build_prompt

app = FastAPI(
    title="DinoBot LLM Service",
    description="AI response generation for WhatsApp bot",
    version="1.0.0",
)


# ── Request / Response models ────────────────────────────
class GenerateRequest(BaseModel):
    prompt: str = Field(default="", description="Pre-built prompt (if provided, skips build_prompt)")
    message: str = Field(default="", description="Raw user message")
    history: list[dict] = Field(default_factory=list, description="Conversation history")
    tone_instruction: str = Field(default="auto-detect")
    max_tokens: int = Field(default=256, ge=1, le=1024)
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    user_name: str = Field(default="User")
    safety_level: str = Field(default="normal")


class GenerateResponse(BaseModel):
    reply: str
    tone: str = "neutral"
    confidence: float = 0.0
    admin_note: str = ""
    flags: str = ""
    tokens_used: int = 0


# ── Endpoints ────────────────────────────────────────────
@app.post("/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest):
    """Generate a reply using the LLM model."""

    # Build prompt if not pre-built
    if req.prompt and not req.message:
        prompt = req.prompt
    else:
        prompt = build_prompt(
            message=req.message or req.prompt,
            history=req.history if req.history else None,
            tone_instruction=req.tone_instruction,
            user_name=req.user_name,
            safety_level=req.safety_level,
            max_tokens=req.max_tokens,
        )

    # Generate response from model
    raw_output = generate_text(
        prompt=prompt,
        max_tokens=req.max_tokens,
        temperature=req.temperature,
        tone=req.tone_instruction,
    )

    # Try to parse structured JSON from output
    result = parse_llm_output(raw_output, req.tone_instruction)

    return GenerateResponse(
        reply=result["reply"],
        tone=result.get("tone", req.tone_instruction),
        confidence=result.get("confidence", 0.5),
        admin_note=result.get("admin_note", ""),
        flags=result.get("flags", ""),
        tokens_used=len(raw_output.split()),
    )


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "service": "llm_service"}


# ── Helpers ──────────────────────────────────────────────
def parse_llm_output(raw: str, default_tone: str = "neutral") -> dict:
    """
    Attempt to parse JSON from the LLM output.
    Falls back to using the raw text as the reply if JSON parsing fails.
    """
    # Try to find JSON in the output
    json_match = re.search(r'\{[^{}]*"reply"[^{}]*\}', raw, re.DOTALL)
    if json_match:
        try:
            parsed = json.loads(json_match.group())
            if "reply" in parsed:
                return parsed
        except json.JSONDecodeError:
            pass

    # Fallback: use the raw output as the reply
    # Clean up any system/instruction artifacts
    reply = raw.strip()

    # Remove common LLM artifacts
    for prefix in ["Assistant:", "Bot:", "Reply:", "ASSISTANT:"]:
        if reply.startswith(prefix):
            reply = reply[len(prefix):].strip()

    # Truncate if too long
    if len(reply) > 600:
        reply = reply[:597] + "..."

    return {
        "reply": reply,
        "tone": default_tone,
        "confidence": 0.5,
        "admin_note": "Raw text output (no JSON structure detected)",
        "flags": "",
    }


# ── Startup ──────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    """Load the model when the service starts."""
    print("[LLM Service] 🚀 Starting up — loading model...")
    load_model()
    print("[LLM Service] ✅ Ready to generate responses!")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
