from fastapi import APIRouter, Header, HTTPException
from app.services.groq import groq_test_key
from app.schemas.common import HealthResponse, ValidateKeyResponse
router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health():
    return {"ok":True}

@router.post("/validate-key", response_model=ValidateKeyResponse)
async def validate_key(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing or invalid Authorization header. Use: Authorization: Bearer <key>",
        )

    # 2) Extract the key from "Bearer <key>"
    api_key = authorization.split(" ", 1)[1].strip()
    if not api_key:
        raise HTTPException(status_code=401, detail="Empty API key")

    # 3) Try a tiny Groq request to prove the key works
    try:
        await groq_test_key(api_key)
        return {"valid": True}
    except HTTPException:
        # If groq_test_key already raised a clean HTTPException (401/429/etc),
        # pass it through unchanged.
        raise
    except Exception as e:
        # Any unexpected error becomes a generic 400 (don't leak secrets).
        raise HTTPException(status_code=400, detail=f"Key validation failed: {type(e).__name__}")