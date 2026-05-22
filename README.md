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
2. **Node.js (v18+)** (for frontend)
3. **Tesseract OCR** (required by pytesseract for image text extraction)
   - Windows: Download the installer from [UB-Mannheim](https://github.com/UB-Mannheim/tesseract/wiki) and add its installation path to your system's `PATH` variable, or configure it in the code.
   - macOS: Install via Homebrew: `brew install tesseract`
   - Linux: Install via APT: `sudo apt-get install tesseract-ocr`
4. **Groq API Key** (for Llama 3.1 LLM and Whisper speech-to-text API)
5. **Supabase Account** (for database and user authentication)

---

## Setup & Run Instructions

### 1. Database Setup (Supabase)

1. Create a free project on [Supabase](https://supabase.com).
2. Open your Supabase dashboard, navigate to **SQL Editor** → **New query**.
3. Copy all SQL commands from the [supabase_setup.sql](file:///c:/Users/Lenovo/Desktop/legalchatbot/supabase_setup.sql) file in the root folder, paste them into the SQL Editor, and click **Run**. This will set up the profiles, chats, messages, and user_documents tables along with Row-Level Security (RLS) policies and Auth triggers.

### 2. Environment Configuration

Copy and configure the environment files for both the backend and frontend.

#### Backend Env Setup:
1. Navigate to the `backend/` folder.
2. Copy `.env.example` to `.env`.
3. Open `.env` and fill in your keys:
   ```env
   GROQ_API_KEY=your_actual_groq_api_key_here
   ```

#### Frontend Env Setup:
1. Navigate to the `frontend/react-app/` folder.
2. Copy `.env.example` to `.env`.
3. Open `.env` and fill in your Supabase configuration (found under Project Settings → API in your Supabase dashboard):
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```

### 3. Backend Setup & Run

Open a terminal in the root folder (`legalchatbot`):

```powershell
# 1. Create a virtual environment (if not already created)
python -m venv venv

# 2. Activate the virtual environment
# Windows (PowerShell):
.\venv\Scripts\activate
# Windows (CMD):
.\venv\Scripts\activate.bat
# macOS/Linux:
source venv/bin/activate

# 3. Install backend dependencies
pip install -r requirements.txt

# 4. Navigate to the backend folder
cd backend

# 5. Run the FastAPI server
python main.py
```
The backend server will run on `http://localhost:8000`.

### 4. Frontend Setup & Run

Open a new terminal in the `frontend/react-app` folder:

```powershell
# 1. Install frontend Node dependencies
npm install

# 2. Run the development server
npm run dev
```
The frontend application will run on `http://localhost:5173`. Open this URL in your browser.

## Data Pipeline (For reference)

If you need to rebuild the datasets:

1. Put your CSV, JSON, and PDF files in the `datasets/` folder.
2. Run `python clean_data.py` (with the virtual environment activated in the root folder) to generate `clean_legal_dataset.json`.
3. Run `python build_vector_db.py` to recreate the ChromaDB vector storage `vector_db`.

---
**Disclaimer:** LexAI provides legal information for educational purposes only and is not a substitute for professional legal advice.
