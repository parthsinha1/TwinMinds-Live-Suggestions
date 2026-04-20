from pydantic import BaseModel
from typing import Literal, Optional
import uuid
from datetime import datetime, timezone

def new_id() -> str:
    return str(uuid.uuid4())

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

Role = Literal["user", "assistant"]

class ChatMessage(BaseModel):
    id: str = Field(default_factory=new_id)
    ts: str = Field(default_factory=now_iso)
    role: Role
    content: str = Field(min_length=1)
    suggestion_id: Optional[str] = None

class ChatRequest(BaseModel):
    transcript_context: str = Field(default="", description="Recent transcript text passed as context")
    chat_prompt: str = Field(min_length=1, description="System prompt for the chat behavior")
    history: list[ChatMessage] = Field(default_factory=list)
    user_input: str = Field(min_length=1)