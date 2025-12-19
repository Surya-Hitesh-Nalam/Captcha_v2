"""
Test script - using exact code from notebook
"""
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
import numpy as np
from PIL import Image
import sys

# Configuration from notebook
IMG_WIDTH = 128
IMG_HEIGHT = 32
MAX_LEN = 5

# Vocabulary from notebook output
all_chars = sorted(list("0123456789abcdefghijklmnopqrstuvwxyz_"))
char_to_num = {c:i for i,c in enumerate(all_chars)}
num_to_char = {i:c for i,c in enumerate(all_chars)}
VOCAB_SIZE = len(all_chars)

print(f"Vocabulary ({VOCAB_SIZE}): {''.join(all_chars)}")

# ViTBlock from notebook
class ViTBlock(layers.Layer):
    def __init__(self, embed_dim, num_heads, ff_dim, rate=0.1, **kwargs):
        super(ViTBlock, self).__init__(**kwargs)
        self.embed_dim = embed_dim
        self.num_heads = num_heads
        self.ff_dim = ff_dim
        self.rate = rate

        self.att = layers.MultiHeadAttention(num_heads=num_heads, key_dim=embed_dim)
        self.ffn = keras.Sequential([
            layers.Dense(ff_dim, activation="relu"),
            layers.Dense(embed_dim)
        ])
        self.layernorm1 = layers.LayerNormalization(epsilon=1e-6)
        self.layernorm2 = layers.LayerNormalization(epsilon=1e-6)
        self.dropout1 = layers.Dropout(rate)
        self.dropout2 = layers.Dropout(rate)

    def call(self, inputs, training=True):
        attn_output = self.att(inputs, inputs)
        attn_output = self.dropout1(attn_output, training=training)
        out1 = self.layernorm1(inputs + attn_output)
        ffn_output = self.ffn(out1)
        ffn_output = self.dropout2(ffn_output, training=training)
        return self.layernorm2(out1 + ffn_output)

    def get_config(self):
        config = super().get_config()
        config.update({
            "embed_dim": self.embed_dim,
            "num_heads": self.num_heads,
            "ff_dim": self.ff_dim,
            "rate": self.rate
        })
        return config

# Load model
print("\nLoading model...")
model = keras.models.load_model(
    '../models/Final_Project_Pro_Stream.h5',
    custom_objects={'ViTBlock': ViTBlock}
)

print(f"\nModel input shape: {model.input_shape}")
print(f"Model outputs: {len(model.outputs)}")
for i, o in enumerate(model.outputs):
    print(f"  Output {i}: shape={o.shape}")

# Check actual vocab size from model
actual_vocab = model.outputs[0].shape[-1]
print(f"\nActual vocab size from model: {actual_vocab}")

if actual_vocab != VOCAB_SIZE:
    print(f"\n⚠️ MISMATCH! Model has {actual_vocab} classes but expected {VOCAB_SIZE}")
    print("Rebuilding vocabulary for actual size...")
    # The model was trained with different chars - we need to figure out which
    # Let's just map indices directly to see what comes out
    num_to_char = {i: chr(ord('0') + i) if i < 10 else chr(ord('a') + i - 10) if i < 36 else '_' for i in range(actual_vocab)}
    print(f"Guessed vocabulary: {[num_to_char[i] for i in range(actual_vocab)]}")

# Decode function from notebook
def decode_batch(preds):
    results = []
    for i in range(len(preds[0])):
        text = ""
        for j in range(MAX_LEN):
            idx = np.argmax(preds[j][i])
            char = num_to_char.get(idx, '?')
            if char != '_': text += char
        results.append(text)
    return results

# Test with a simple generated image (zeros)
print("\n\nTest 1: Blank image prediction...")
blank_img = np.zeros((1, IMG_HEIGHT, IMG_WIDTH, 1), dtype=np.float32)
preds = model.predict(blank_img, verbose=0)
result = decode_batch(preds)
print(f"Prediction for blank image: {result}")

print("\n\nRaw prediction indices for blank image:")
for j in range(MAX_LEN):
    idx = np.argmax(preds[j][0])
    prob = preds[j][0][idx]
    print(f"  Position {j}: index={idx}, prob={prob:.4f}, char='{num_to_char.get(idx, '?')}'")

print("\n\nDone!")
