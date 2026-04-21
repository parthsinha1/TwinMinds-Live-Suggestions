import httpx
import json
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

async def groq_generate_suggestions(api_key: str, prompt: str, transcript_context: str) -> dict:
    url = f"{base_url}/chat/completions"
    headers = {"Authorization": f"Bearer{api_key}"}
    messages = [
        {"role": "system", "content": "Return ONLY valid JSON. No markdown. No extra text."},
        {
            "role": "user",
            "content": f"""
{prompt}

TRANSCRIPT CONTEXT:
{transcript_context}

Return JSON in this exact format:
{{
  "items": [
    {{"kind": "question", "preview": "...", "detail_prompt": "..."}},
    {{"kind": "talking_point", "preview": "...", "detail_prompt": "..."}},
    {{"kind": "fact_check", "preview": "...", "detail_prompt": "..."}}
  ]
}}

Rules:
- Output ONLY JSON.
- items must contain EXACTLY 3 elements.
- kind must be one of: question, talking_point, fact_check, answer_draft, clarification.
- preview must be short (1-2 sentences).
- detail_prompt can be a longer instruction/question to get a better answer when clicked.
""",
        },
    ]

    payload = {
        "model": "gpt-oss-120b",
        "messages": messages,
        "temperature": 0.3,
        "max_tokens": 450,
    }