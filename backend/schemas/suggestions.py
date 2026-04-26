from pydantic import BaseModel, Field
from typing import Literal
import uuid
from datetime import datetime, timezone


def new_id() -> str:
    return str(uuid.uuid4())

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

SuggestionType = Literal["query", "talking_point", "answer_draft", "fact_check", "clarification"]

class SuggestionItem(BaseModel):
    id:str = Field(default_factory=new_id)
    kind: SuggestionType
    preview: str = Field(min_length=1)
    detail_prompt: str | None = None

class SuggestionBatch(BaseModel):
    id: str = Field(default_factory=new_id)
    ts: str = Field(default_factory=now_iso)
    items: list[SuggestionItem] = Field(min_length=3, max_length=3)

# extensibility
class SuggestionResponse(BaseModel):
    batch: SuggestionBatch

class SuggestionRequest(BaseModel):
    transcript_context: str
    suggestion_prompt: str = Field(min_length=1)

    