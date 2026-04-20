from pydantic import BaseModel

# basic route testing
class HealthResponse(BaseModel):
    ok:bool

class ValidateKeyResponse(BaseModel):
    valid:bool