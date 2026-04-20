from fastapi import APIRouter, Header, HTTPException
from services.groq import groq_test_key
from schemas.common import HealthResponse, ValidateKeyResponse
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

    api_key = authorization.split(" ", 1)[1].strip()
    if not api_key:
        raise HTTPException(status_code=401, detail="Empty API key")

    try:
        await groq_test_key(api_key)
        return {"valid": True}
    except HTTPException:
        # if groq_test_key already raised a clean HTTPException (401/429/etc),
        # pass it through unchanged.
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Key validation failed: {type(e).__name__}")