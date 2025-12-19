# CAPTCHA Solver Web App

AI-powered CAPTCHA recognition using CNN + Vision Transformer + BiLSTM architecture.

## 🚀 Quick Start

### 1. Activate Virtual Environment
```powershell
cd c:\Users\karth\Desktop\captcha_v2\webapp
.\venv\Scripts\activate
```

### 2. Run the Server
```powershell
python server.py
```

### 3. Open Browser
Navigate to: **http://localhost:8000**

## 📊 Model Performance

| Model | Accuracy |
|-------|----------|
| Text CAPTCHA | 84.91% (sequence) |
| Math CAPTCHA | 97.74% (solution) |

## 🎯 Features

- Drag & drop image upload
- Text and Math CAPTCHA support
- Real-time prediction with confidence scores
- Solve history with localStorage persistence
- Premium glassmorphism UI

## 📁 Project Structure

```
captcha_v2/
├── models/
│   ├── Final_Project_Pro_Stream.h5    # Text model
│   └── Unified_Pro_Model_Math.h5      # Math model
├── webapp/
│   ├── venv/           # Virtual environment
│   ├── index.html      # Frontend
│   ├── styles.css      # Styling
│   ├── app.js          # JavaScript
│   ├── server.py       # FastAPI backend
│   └── requirements.txt
└── results/            # Training metrics
```

## 🔧 API Endpoints

- `GET /` - Web interface
- `POST /api/solve` - Solve CAPTCHA (multipart form: file, type)
- `GET /api/health` - Health check

## ⚠️ Troubleshooting

If the server fails to start, ensure you're using the virtual environment:
```powershell
.\venv\Scripts\activate
python server.py
```
