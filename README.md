# LexAI — Indian Legal AI Assistant (RAG Architecture)

LexAI is an end-to-end Legal AI Assistant designed for Indian legal datasets. It uses a Retrieval Augmented Generation (RAG) architecture with text, audio, and image inputs.

## Architecture

- **Frontend:** React + Vite + Tailwind CSS + Lucide Icons (Premium Glassmorphism Design)
- **Backend:** FastAPI
- **Vector Database:** ChromaDB
- **Embeddings:** `all-MiniLM-L6-v2` (SentenceTransformers)
- **LLM:** Llama 3.1 via Groq (`llama-3.1-8b-instant`)
- **OCR:** Tesseract OCR
- **Speech-to-Text:** OpenAI Whisper

## Prerequisites

1. **Python 3.8+**
2. **Node.js** (for frontend)
3. **FFmpeg** (required by Whisper for audio processing)
4. **Tesseract OCR** (required by pytesseract for image processing)
5. **Groq API Key** (set as an environment variable)

## Setup & Run Instructions

### 1. Set Groq API Key

Set your Groq API key in your terminal before running the backend:

**Windows (PowerShell):**
```powershell
$env:GROQ_API_KEY="your_actual_api_key_here"
```

### 2. Backend Setup

Open a terminal in the `LexAI` (legalchatbot) folder:

```powershell
# Activate the virtual environment
.\venv\Scripts\activate

# Navigate to the backend folder
cd backend

# Run the FastAPI server
python main.py
```
The backend will run on `http://localhost:8000`.

### 3. Frontend Setup

Open a new terminal in the `legalchatbot/frontend/react-app` folder:

```powershell
# Install dependencies (if not already installed)
npm install

# Run the development server
npm run dev
```
The frontend will typically run on `http://localhost:5173`.

## Data Pipeline (For reference)

If you need to rebuild the datasets:

1. Put your CSV, JSON, and PDF files in the `datasets/` folder.
2. Run `python clean_data.py` to generate `clean_legal_dataset.json`.
3. Run `python build_vector_db.py` to create the ChromaDB vector storage.

---
**Disclaimer:** LexAI provides legal information for educational purposes only and is not a substitute for professional legal advice.
