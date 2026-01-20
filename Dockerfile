# CAPTCHA Solver - Production Dockerfile
# Optimized for Hugging Face Spaces, Render, and Railway

FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies for OpenCV and TensorFlow
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (for layer caching)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY webapp/ ./webapp/
COPY models/ ./models/
COPY app.py .

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=7860

# Expose port (7860 for HF Spaces)
EXPOSE 7860

# Start the FastAPI server
CMD ["python", "app.py"]
