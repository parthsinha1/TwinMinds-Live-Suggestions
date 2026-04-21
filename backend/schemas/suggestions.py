from pydantic import BaseModel, Field
from typing import Literal, Optional
import uuid
from datetime import datetime, timezone


def new_id() -> str:
    return str(uuid.uuid4())

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

SuggestionType = Literal["query", "fact_check", "clarification"]

class SuggestionItem(BaseModel):
    id:str = Field(default_factory=new_id)
    kind: SuggestionType
    preview: str = Field(min_length=1)

class SuggestionBatch(BaseModel):
    id: str = Field(default_factory=new_id)
    ts: str = Field(default_factory=now_iso)
    items: list[SuggestionItem] = Field(min_length=3, max_length=3)

# extensibility
class SuggestionResponse(BaseModel):
    batch: SuggestionBatch

    