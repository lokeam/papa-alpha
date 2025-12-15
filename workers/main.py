"""Papa-Alpha RFP Analysis Worker

FastAPI service for processing RFP documents with LLM analysis.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(
    title="Papa-Alpha Worker",
    description="RFP Analysis Worker Service",
    version="1.0.0"
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Papa-Alpha Worker",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
async def health():
    """Health check endpoint for Docker healthcheck"""
    return {
        "status": "healthy",
        "service": "worker",
        "environment": os.getenv("PYTHON_ENV", "development")
    }


@app.get("/api/test")
async def test():
    """Test endpoint to verify API is working"""
    return {
        "message": "Worker API is operational",
        "supabase_url": os.getenv("SUPABASE_URL", "not_set"),
        "redis_url": os.getenv("REDIS_URL", "not_set")
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)