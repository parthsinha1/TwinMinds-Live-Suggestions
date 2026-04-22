from fastapi import APIRouter, Header, HTTPException
from services.groq import groq_test_key, groq_generate_suggestions, groq_chat_answer
from schemas.common import HealthResponse, ValidateKeyResponse
from schemas.chat import ChatMessage, ChatRequest, ChatResponse
from schemas.suggestions import SuggestionBatch, SuggestionItem, SuggestionResponse, SuggestionRequest
from schemas.transcribe import TranscribeResponse


router = APIRouter()

def extract_bearer_key(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing or invalid Authorization header. Use: Authorization: Bearer <key>",
        )
    api_key = authorization.split(" ", 1)[1].strip()
    if not api_key:
        raise HTTPException(status_code=401, detail="Empty API key")
    return api_key


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
    

@router.post("/suggestions", response_model=SuggestionResponse)
async def suggestions(
    payload: SuggestionRequest,
    authorization: str | None = Header(default=None),
):
    api_key = extract_bearer_key(authorization)

    raw = await groq_generate_suggestions(
        api_key=api_key,
        prompt=payload.suggestion_prompt,
        transcript_context=payload.transcript_context,
    )

    # enforce exactly 3 suggestions 
    items_raw = raw.get("items", [])
    items = [SuggestionItem(**x) for x in items_raw]
    batch = SuggestionBatch(items=items)

    return {"batch": batch}

@router.post("/chat", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    authorization: str | None = Header(default=None)
):
    api_key = extract_bearer_key(authorization)
    

    answer = await groq_chat_answer(
        api_key=api_key,
        chat_prompt=payload.chat_prompt,
        transcript_context=payload.transcript_context,
        history=payload.history,
        user_input=payload.user_input,
    )

    message = ChatMessage(
        role="assistant",
        content=answer,
        suggestion_id=payload.suggestion_id,
    )
    return {"message":message}


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe(
    payload: TranscribeResponse
)
    

