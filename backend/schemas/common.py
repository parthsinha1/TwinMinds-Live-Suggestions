from pydantic import BaseModel

class HealthResponse(BaseModel):
    ok:bool

class ValidateKeyResponse(BaseModel):
    valid:bool