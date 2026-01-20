---
title: CAPTCHA Solver
emoji: 🔐
colorFrom: blue
colorTo: purple
sdk: docker
pinned: false
license: mit
---

# 🔐 CAPTCHA Solver

An AI-powered CAPTCHA recognition system using **CNN + Vision Transformer + BiLSTM** architecture.

## Features

- ✅ **Text CAPTCHA** - Alphanumeric recognition
- ✅ **Math CAPTCHA** - Arithmetic expression solving
- ✅ **Real-time inference** - Fast predictions
- ✅ **Beautiful UI** - Modern, responsive design

## Architecture

```
Input Image → CNN → Vision Transformer → BiLSTM → Output
```

## Usage

1. Upload a CAPTCHA image
2. Select type (Text or Math)
3. Get instant prediction with confidence scores

## Models

- `Final_Project_ViT_four.h5` - Text CAPTCHA (35MB)
- `Unified_Pro_Model_Math.h5` - Math CAPTCHA (64MB)
