from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="OFX Service")


class OFXParseRequest(BaseModel):
    ofx_text: str = Field(..., min_length=1)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/parse")
def parse_ofx(payload: OFXParseRequest):
    return {
        "status": "todo",
        "message": "ofx parsing not implemented yet",
        "received_chars": len(payload.ofx_text),
    }
