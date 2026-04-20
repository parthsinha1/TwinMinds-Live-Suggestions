import httpx
from fastapi import HTTPException

base_url="https://api.groq.com/openai/v1"


async def groq_test_key(api_key:str) -> None:
    url = f"{base_url}/chat/completions"
    headers = {"Authorization" : f"Bearer {api_key}"}

    payload = {
        "model":"gpt-oss-120b",
        "messages":[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Reply with exactly: OK"},
        ],
        "temperature":0,
        "max_tokens":5,
    }


    timeout = httpx.Timeout(30.0)

    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(url, headers=headers, json=payload)

    if resp.status_code == 401:
        raise HTTPException(status_code=401, detail="Invalid Groq API key")
    if resp.status_code == 429:
        raise HTTPException(status_code=429, detail="Rate limited by Groq")
    if resp.status_code >= 400:
        raise HTTPException(status_code=400, detail=f"Groq error {resp.status_code}")

    return None