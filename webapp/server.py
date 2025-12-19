"""
CAPTCHA Solver API Server
FastAPI backend with TensorFlow model inference
"""

import io
import numpy as np
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import tensorflow as tf
from tensorflow import keras

# ============================================
# CONFIGURATION
# ============================================

WEBAPP_DIR = Path(__file__).parent
MODELS_DIR = WEBAPP_DIR.parent / "models"

TEXT_MODEL_PATH = MODELS_DIR / "Final_Project_ViT.h5"
MATH_MODEL_PATH = MODELS_DIR / "Unified_Pro_Model_Math.h5"

IMG_WIDTH = 128
IMG_HEIGHT = 32

# Text model: 37 chars, 5 positions
# From notebook line 358: "0123456789abcdefghijklmnopqrstuvwxyz_"
# Underscore is at the END (appended after sorted chars)
TEXT_CHARS = "0123456789abcdefghijklmnopqrstuvwxyz_"
TEXT_NUM_TO_CHAR = {i: c for i, c in enumerate(TEXT_CHARS)}

# Math model: 12 chars, 8 positions
# Sorted: + (43), - (45), 0-9 (48-57), _ (95)
MATH_CHARS = "+-0123456789_"
MATH_NUM_TO_CHAR = {i: c for i, c in enumerate(MATH_CHARS)}

# ============================================
# CUSTOM LAYER
# ============================================

class ViTBlock(keras.layers.Layer):
    def __init__(self, embed_dim, num_heads, ff_dim, rate=0.1, **kwargs):
        super().__init__(**kwargs)
        self.embed_dim = embed_dim
        self.num_heads = num_heads
        self.ff_dim = ff_dim
        self.rate = rate

    def build(self, input_shape):
        self.att = keras.layers.MultiHeadAttention(num_heads=self.num_heads, key_dim=self.embed_dim)
        self.ffn = keras.Sequential([
            keras.layers.Dense(self.ff_dim, activation="relu"),
            keras.layers.Dense(self.embed_dim)
        ])
        self.ln1 = keras.layers.LayerNormalization(epsilon=1e-6)
        self.ln2 = keras.layers.LayerNormalization(epsilon=1e-6)
        self.d1 = keras.layers.Dropout(self.rate)
        self.d2 = keras.layers.Dropout(self.rate)

    def call(self, x, training=False):  # training=False for inference!
        a = self.att(x, x)
        a = self.d1(a, training=training)
        x = self.ln1(x + a)
        f = self.ffn(x)
        f = self.d2(f, training=training)
        return self.ln2(x + f)

    def get_config(self):
        return {**super().get_config(), 
                'embed_dim': self.embed_dim, 
                'num_heads': self.num_heads, 
                'ff_dim': self.ff_dim, 
                'rate': self.rate}

# ============================================
# LOAD MODELS
# ============================================

print("\n🚀 Loading CAPTCHA Solver models...")

text_model = None
math_model = None

try:
    text_model = keras.models.load_model(str(TEXT_MODEL_PATH), custom_objects={'ViTBlock': ViTBlock})
    print(f"✅ Text model: {TEXT_MODEL_PATH.name} ({text_model.outputs[0].shape[-1]} classes)")
except Exception as e:
    print(f"❌ Text model error: {e}")

try:
    math_model = keras.models.load_model(str(MATH_MODEL_PATH), custom_objects={'ViTBlock': ViTBlock})
    print(f"✅ Math model: {MATH_MODEL_PATH.name} ({math_model.outputs[0].shape[-1]} classes)")
except Exception as e:
    print(f"❌ Math model error: {e}")

# ============================================
# FASTAPI APP
# ============================================

app = FastAPI(title="CAPTCHA Solver API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# HELPERS
# ============================================

def preprocess_image(image_bytes: bytes) -> np.ndarray:
    """Simple preprocessing matching training pipeline"""
    image = Image.open(io.BytesIO(image_bytes))
    if image.mode != 'L':
        image = image.convert('L')
    image = image.resize((IMG_WIDTH, IMG_HEIGHT), Image.Resampling.LANCZOS)
    arr = np.array(image, dtype=np.float32) / 255.0
    return arr.reshape(1, IMG_HEIGHT, IMG_WIDTH, 1)

def decode(preds, num_to_char):
    """Decode predictions with per-character details"""
    result = ""
    char_details = []
    
    for i, p in enumerate(preds):
        probs = p[0]
        
        # Get top 3 predictions
        top_indices = np.argsort(probs)[-3:][::-1]
        top_3 = []
        for idx in top_indices:
            char = num_to_char.get(int(idx), '?')
            conf = float(probs[idx]) * 100
            top_3.append({"char": char, "confidence": round(conf, 1)})
        
        # Best prediction
        best_idx = int(np.argmax(probs))
        best_char = num_to_char.get(best_idx, '?')
        best_conf = float(probs[best_idx]) * 100
        
        if best_char != '_':
            result += best_char
        
        char_details.append({
            "position": i,
            "predicted": best_char,
            "confidence": round(best_conf, 1),
            "top_3": top_3
        })
    
    avg_conf = sum(c["confidence"] for c in char_details) / len(char_details) if char_details else 0
    return result, round(avg_conf, 1), char_details

def safe_eval_math(expr: str) -> str:
    try:
        clean = expr.replace(' ', '')
        if not clean or not all(c in '0123456789+-' for c in clean):
            return expr
        return str(eval(clean))
    except:
        return expr

# ============================================
# ENDPOINTS
# ============================================

@app.get("/")
async def root():
    return FileResponse(WEBAPP_DIR / "index.html")

@app.post("/api/solve")
async def solve_captcha(file: UploadFile = File(...), type: str = Form("text")):
    import time
    start_time = time.time()
    
    if not file.content_type.startswith('image/'):
        raise HTTPException(400, "Must be an image")
    
    model = math_model if type == "math" else text_model
    num_to_char = MATH_NUM_TO_CHAR if type == "math" else TEXT_NUM_TO_CHAR
    model_name = "Math CAPTCHA Model" if type == "math" else "Text CAPTCHA Model"
    
    if model is None:
        raise HTTPException(500, f"{type.title()} model not loaded")
    
    try:
        img = preprocess_image(await file.read())
        preds = model.predict(img, verbose=0)
        result, conf, char_details = decode(preds, num_to_char)
        
        processing_time = round((time.time() - start_time) * 1000)  # ms
        
        response = {
            "success": True,
            "prediction": result,
            "confidence": conf,
            "type": type,
            "model": model_name,
            "architecture": "CNN + ViT + BiLSTM",
            "processing_time_ms": processing_time,
            "char_details": char_details,
            "vocab_size": len(num_to_char)
        }
        
        if type == "math":
            response["expression"] = result
            response["prediction"] = safe_eval_math(result)
            
        return response
    except Exception as e:
        raise HTTPException(500, str(e))

@app.get("/api/health")
async def health():
    return {"text": text_model is not None, "math": math_model is not None}

app.mount("/", StaticFiles(directory=str(WEBAPP_DIR), html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*50)
    print("🌐 Server: http://localhost:8000")
    print("="*50 + "\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)
