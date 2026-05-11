from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import uvicorn
import os
import json

# Import our backend modules
import rag_pipeline
import ocr
import speech
import pdf_parser

app = FastAPI(title="Legal Advice Chatbot API")

# Configure CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from typing import List, Optional

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    query: str
    history: Optional[List[Message]] = []

class Source(BaseModel):
    name: str
    page: str = ""

class ChatResponse(BaseModel):
    answer: str
    sources: Optional[List[Source]] = []


@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    
    history_dicts = [{"role": msg.role, "content": msg.content} for msg in request.history] if request.history else []
    
    answer, sources = rag_pipeline.process_query(request.query, history=history_dicts)
    return ChatResponse(answer=answer, sources=[Source(**s) for s in sources])


@app.post("/chat/stream")
async def chat_stream_endpoint(request: ChatRequest):
    """Server-Sent Events endpoint for streaming AI responses."""
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    history_dicts = [{"role": msg.role, "content": msg.content} for msg in request.history] if request.history else []
    generator, sources = rag_pipeline.process_query_stream(request.query, history=history_dicts)

    def event_stream():
        # First, emit sources as a special event
        sources_payload = json.dumps([s for s in sources])
        yield f"event: sources\ndata: {sources_payload}\n\n"

        # Then stream the text chunks
        for chunk in generator:
            # Escape the chunk for SSE format
            safe_chunk = chunk.replace("\n", "\\n")
            yield f"data: {safe_chunk}\n\n"

        # Signal stream end
        yield "event: done\ndata: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )


@app.post("/voice", response_model=ChatResponse)
async def voice_endpoint(file: UploadFile = File(...)):
    audio_bytes = await file.read()
    
    query = speech.transcribe_audio(audio_bytes, file.filename)
    if not query:
        return ChatResponse(answer="Could not transcribe audio.", sources=[])
        
    answer, sources = rag_pipeline.process_query(query)
    return ChatResponse(answer=f"[Transcribed]: {query}\n\n{answer}", sources=[Source(**s) for s in sources])


@app.post("/image", response_model=ChatResponse)
async def image_endpoint(file: UploadFile = File(...)):
    image_bytes = await file.read()
    
    extracted_text = ocr.extract_text_from_image(image_bytes)
    if not extracted_text:
        return ChatResponse(answer="Could not extract text from the image.", sources=[])
        
    answer, sources = rag_pipeline.process_query(extracted_text)
    return ChatResponse(answer=f"[Extracted Text]: {extracted_text[:200]}...\n\n{answer}", sources=[Source(**s) for s in sources])


@app.post("/document", response_model=ChatResponse)
async def document_endpoint(file: UploadFile = File(...)):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
        
    pdf_bytes = await file.read()
    
    extracted_text = pdf_parser.extract_text_from_pdf(pdf_bytes)
    if not extracted_text:
        return ChatResponse(answer="Could not extract text from the PDF. It might be empty or scanned.", sources=[])
        
    answer, sources = rag_pipeline.process_query(extracted_text)
    return ChatResponse(answer=f"[Extracted Document]: {extracted_text[:200]}...\n\n{answer}", sources=[Source(**s) for s in sources])


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
