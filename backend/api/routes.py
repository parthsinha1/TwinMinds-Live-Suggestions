from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from services.groq import groq_test_key, groq_generate_suggestions, groq_chat_answer, groq_transcribe
from schemas.common import HealthResponse, ValidateKeyResponse
from schemas.chat import ChatMessage, ChatRequest, ChatResponse
from schemas.suggestions import SuggestionBatch, SuggestionItem, SuggestionResponse, SuggestionRequest
from schemas.transcribe import TranscribeResponse


#route steps:
#1. declare endpoint + response contract
#2. create endpoint function that accept specific inputs
#3. validate authentication and extract key
#4. execute the main action of the endpoint by making a service call with the function from groq.py 
#5. validate and shape the result to match my response model

router = APIRouter()
bearer_scheme = HTTPBearer(auto_error=False)

def extract_bearer_key(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)) -> str:
    if not credentials or not credentials.credentials.strip():
        raise HTTPException(
            status_code=401,
            detail="Missing or invalid Authorization header. Use: Authorization: Bearer <key>",
        )
    api_key = credentials.credentials.strip()
    return api_key


@router.get("/health", response_model=HealthResponse)
def health():
    return {"ok":True}

@router.post("/validate-key", response_model=ValidateKeyResponse)
async def validate_key(api_key: str = Depends(extract_bearer_key)):

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
    api_key: str = Depends(extract_bearer_key),
):
    raw = await groq_generate_suggestions(
        api_key=api_key,
        prompt=payload.suggestion_prompt,
        transcript_context=payload.transcript_context,
    )

    # enforce exactly 3 suggestions 
    items_raw = raw.get("items", [])
    valid_items = []
    for x in items_raw:
        try:
            valid_items.append(SuggestionItem(**x))
        except Exception:
            pass

    if len(valid_items) < 3:
        # Groq returned fewer than 3 valid items, skip this batch silently
        return {"batch": None}

    batch = SuggestionBatch(items=valid_items[:3])

    return {"batch": batch}

@router.post("/chat")
async def chat(
    payload: ChatRequest,
    api_key: str = Depends(extract_bearer_key)
):
    stream = await groq_chat_answer(
        api_key=api_key,
        chat_prompt=payload.chat_prompt,
        transcript_context=payload.transcript_context,
        history=payload.history,
        user_input=payload.user_input,
        max_tokens=payload.max_tokens,
    )
    return StreamingResponse(stream, media_type="text/event-stream")


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe(
    file: UploadFile = File(...),
    api_key: str = Depends(extract_bearer_key)
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing file name")
    if file.content_type and not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be audio")

    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    text = await groq_transcribe(
        api_key=api_key,
        audio_bytes=audio_bytes,
        filename=file.filename or "audio",
        content_type=file.content_type,

    )

    return {"text":text}

