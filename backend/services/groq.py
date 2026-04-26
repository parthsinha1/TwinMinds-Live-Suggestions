import httpx
import json
from fastapi import HTTPException
from schemas.chat import ChatMessage


base_url="https://api.groq.com/openai/v1"
chat_model = "openai/gpt-oss-120b"


def _raise_for_groq_error(resp) -> None:
    detail = None
    try:
        detail = resp.json().get("error", {}).get("message")
    except Exception:
        detail = None

    if resp.status_code == 401:
        raise HTTPException(status_code=401, detail="Invalid Groq API key")
    if resp.status_code == 429:
        raise HTTPException(status_code=429, detail="Rate limited by Groq")
    if resp.status_code >= 400:
        msg = f"Groq error {resp.status_code}"
        if detail:
            msg = f"{msg}: {detail}"
        raise HTTPException(status_code=400, detail=msg)


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
    {{"kind": "<pick the most useful type>", "preview": "...", "detail_prompt": "..."}},
    {{"kind": "<pick the most useful type>", "preview": "...", "detail_prompt": "..."}},
    {{"kind": "<pick the most useful type>", "preview": "...", "detail_prompt": "..."}}
  ]
}}

Kind definitions. choose whichever 3 fit the transcript best from the user's perspective:
- "talking_point": rephrase something the speaker said as a first-person statement they could share or expand on.
- "query": a question the user could ask an AI assistant for help based on the transcript. Phrase it as "How do I..." or "What is..." and keep it about the topic itself, not about what the speaker "meant".
- "answer_draft": if the transcript contains a question, draft a short answer to it.
- "fact_check": if the transcript contains a verifiable claim or statistic, surface it for verification.
- "clarification": a question the user could ask an AI to explain a concept from the transcript in general terms. Phrase it as "Can you explain..." or "What does ... mean" about the concept itself from the user's perspective. 

Rules:
- Output ONLY JSON. No markdown. No code fences.
- items must contain EXACTLY 3 elements.
- kind must be one of: talking_point, query, answer_draft, fact_check, clarification.
- Choose the mix that is most useful given what was actually said. Do not always use the same 3 types.
- Suggestions must be grounded in the transcript, do not add external advice or information not mentioned.
- preview must be 1-2 sentences, useful on its own without clicking.
- detail_prompt should ask for a deeper answer specifically tied to what was said.
- For query and clarification, do NOT use second-person references to the speaker such as: "what you mean", "you mentioned", "for you", or "can you share".
- Preferred style for clarification in this case: "Can you explain what it means to have a clear mind for better articulation in interviews?"
- Avoid this style: "Can you explain what you mean by a clear mind helping to articulate thoughts better?"
""",
        },
    ]

    payload = {
        "model": chat_model,
        "messages": messages,
        "temperature": 0.3,
        "max_tokens": 1000,
        "response_format": {"type": "json_object"},
    }

    async with httpx.AsyncClient(timeout=45.0) as client:
        resp = await client.post(url, headers=headers, json=payload)

    if resp.status_code == 400:
        payload_fallback = {k: v for k, v in payload.items() if k != "response_format"}
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(url, headers=headers, json=payload_fallback)

    _raise_for_groq_error(resp)

    data = resp.json()
    content = data["choices"][0]["message"]["content"].strip()
    
    # debug print
    #print("[groq suggestions raw]", repr(content))

    # strip markdown code fences if present
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
    max_tokens: int = 500,
) -> str:

    url = f"{base_url}/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}"}

    messages: list[dict] = []
    messages.append({"role": "system", "content": chat_prompt})

    if transcript_context.strip():
        messages.append({"role": "system", "content": f"TRANSCRIPT CONTEXT:\n{transcript_context}"})

    messages.extend({"role": m.role, "content": m.content} for m in history)

    messages.append({"role": "user", "content": user_input})

    payload = {
        "model": chat_model,
        "messages": messages,
        "temperature": 0.3,
        "max_tokens": max_tokens,
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
