# model-server/app.py
from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn
import os
import torch
from load_model import load_model

app = FastAPI()
tokenizer, model = load_model()

class GenRequest(BaseModel):
    prompt: str
    max_tokens: int = 256
    temperature: float = 0.0

@app.post("/generate")
async def generate(req: GenRequest):
    system = (
        "You are a finance assistant. Answer only finance-related questions. "
        "Be concise and base answers on provided context."
    )
    full_prompt = system + "\n\n" + req.prompt
    inputs = tokenizer(full_prompt, return_tensors="pt").to(model.device)
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=req.max_tokens,
            temperature=req.temperature,
            do_sample=False,
            pad_token_id=tokenizer.eos_token_id
        )
    text = tokenizer.decode(outputs[0], skip_special_tokens=True)
    # strip prompt part
    prompt_text = tokenizer.decode(inputs["input_ids"][0], skip_special_tokens=True)
    answer = text[len(prompt_text):].strip()
    return {"answer": answer}

@app.get("/health")
def health():
    return {"status": "ready"}

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8001, reload=True)
