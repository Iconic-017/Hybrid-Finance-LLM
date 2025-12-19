# model-server/load_model.py
import os
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
from peft import PeftModel, PeftConfig

MODEL_ID = os.environ.get("MODEL_ID", "Iconic112/finance-tinyllama-qlora")
OFFLOAD_DIR = os.environ.get("OFFLOAD_DIR", os.path.join(os.getcwd(), "offload"))

def ensure_offload_dir(path):
    os.makedirs(path, exist_ok=True)

def try_peft_wrap(base_model):
    try:
        if getattr(base_model, "peft_config", None) is not None:
            return base_model
        PeftConfig.from_pretrained(MODEL_ID)
        model = PeftModel.from_pretrained(base_model, MODEL_ID, device_map="auto")
        return model
    except Exception:
        return base_model

def load_model():
    print(f"Loading tokenizer for {MODEL_ID} ...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, use_fast=True)

    # Try quantized/bitsandbytes load (4-bit) if available
    try:
        print("Attempting 4-bit load using BitsAndBytesConfig...")
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.float16
        )
        base_model = AutoModelForCausalLM.from_pretrained(
            MODEL_ID,
            device_map="auto",
            quantization_config=bnb_config,
            low_cpu_mem_usage=True,
        )
        model = try_peft_wrap(base_model)
        model.eval()
        print("Loaded model in 4-bit (bnb).")
        return tokenizer, model
    except Exception as e:
        print("4-bit load failed:", e)

    # GPU with offload
    if torch.cuda.is_available():
        try:
            print("Trying GPU load with offload folder...")
            ensure_offload_dir(OFFLOAD_DIR)
            base_model = AutoModelForCausalLM.from_pretrained(
                MODEL_ID,
                device_map="auto",
                torch_dtype=torch.float16,
                low_cpu_mem_usage=True,
                offload_folder=OFFLOAD_DIR
            )
            model = try_peft_wrap(base_model)
            model.eval()
            print("Loaded model with GPU + offload.")
            return tokenizer, model
        except Exception as e:
            print("GPU+offload failed:", e)

    # CPU fallback
    print("Falling back to CPU-only load (slow).")
    base_model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID,
        device_map={"": "cpu"},
        torch_dtype=torch.float32,
        low_cpu_mem_usage=True
    )
    model = try_peft_wrap(base_model)
    model.eval()
    return tokenizer, model
