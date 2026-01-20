"""
CAPTCHA Solver - Hugging Face Spaces Entry Point
This file redirects to the FastAPI server for HF Spaces deployment
"""

import sys
from pathlib import Path

# Add webapp to path
sys.path.insert(0, str(Path(__file__).parent / "webapp"))

# Import the FastAPI app
from server import app

# For Hugging Face Spaces
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
