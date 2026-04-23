import httpx
import json
from fastapi import HTTPException
from schemas.chat import ChatMessage


base_url="https://api.groq.com/openai/v1"
chat_model = "openai/gpt-oss-120b"


def _raise_for_groq_error(resp) -> None:
    if resp.status_code == 401:
        raise HTTPException(status_code=401, detail="Invalid Groq API key")
    if resp.status_code == 429:
        raise HTTPException(status_code=429, detail="Rate limited by Groq")
    if resp.status_code >= 400:
        raise HTTPException(status_code=400, detail=f"Groq error {resp.status_code}")


async def groq_test_key(api_key:str) -> None:
    url = f"{base_url}/chat/completions"
    headers = {"Authorization" : f"Bearer {api_key}"}

    payload = {
        "model": chat_model,
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

    _raise_for_groq_error(resp)

    return None

async def groq_generate_suggestions(api_key: str, prompt: str, transcript_context: str) -> dict:
    url = f"{base_url}/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}"}
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
    {{"kind": "query", "preview": "...", "detail_prompt": "..."}},
    {{"kind": "clarification", "preview": "...", "detail_prompt": "..."}},
    {{"kind": "fact_check", "preview": "...", "detail_prompt": "..."}}
  ]
}}

Rules:
- Output ONLY JSON. No markdown. No code fences.
- items must contain EXACTLY 3 elements.
- kind must be one of: query, fact_check, clarification.
- preview must be short (1-2 sentences).
- detail_prompt can be a longer instruction/question to get a better answer when clicked.
""",
        },
    ]

    payload = {
        "model": chat_model,
        "messages": messages,
        "temperature": 0.3,
        "max_tokens": 700,
    }

    async with httpx.AsyncClient(timeout=45.0) as client:
        resp = await client.post(url, headers=headers, json=payload)
    
    _raise_for_groq_error(resp)

    data = resp.json()
    content = data["choices"][0]["message"]["content"].strip()

    # strip markdown code fences if the model wraps output despite instructions
    if content.startswith("```"):
        content = content.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=400,
            detail="Groq returned non-JSON output"
        )
    

async def groq_chat_answer(
    api_key: str,
    chat_prompt: str,
    transcript_context: str,
    history: list[ChatMessage],
    user_input: str,
) -> str:

    url = f"{base_url}/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}"}

    messages: list[dict] = []
    messages.append({"role": "system", "content": chat_prompt})

    if transcript_context.strip():
        messages.append({"role": "system", "content": f"TRANSCRIPT CONTEXT:\n{transcript_context}"})

    # Add prior conversation
    messages.extend({"role": m.role, "content": m.content} for m in history)

    # The new question/action from the user
    messages.append({"role": "user", "content": user_input})

    payload = {
        "model": chat_model,
        "messages": messages,
        "temperature": 0.3,
        "max_tokens": 800,
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(url, headers=headers, json=payload)

    _raise_for_groq_error(resp)

    data = resp.json()
    return data["choices"][0]["message"]["content"]


async def groq_transcribe(
    api_key:str,
    audio_bytes: bytes,
    filename: str,
    content_type: str | None,
    model: str = "whisper-large-v3",

) -> str:
    url = f"{base_url}/audio/transcriptions"
    headers = {"Authorization": f"Bearer {api_key}"}

    
    files = {"file": (filename, audio_bytes, content_type)}
    data = {"model":model}

    async with httpx.AsyncClient(timeout=60.67) as client:
        resp = await client.post(url, headers=headers, data=data, files=files)
    _raise_for_groq_error(resp)

    data = resp.json()
    text = data.get("text")
    if not isinstance(text, str) or not text.strip():
        raise HTTPException(status_code=400, detail="Groq transcription response missing text")
    return text
