import os
import tempfile
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

# Initialize Groq client
try:
    groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
except Exception as e:
    print(f"Failed to initialize Groq client: {e}")
    groq_client = None

def transcribe_audio(audio_bytes: bytes, filename: str) -> str:
    """
    Saves audio to a temporary file and uses Groq Whisper API to transcribe it to text.
    """
    if not groq_client:
        return "Speech to text is currently unavailable (Groq client not initialized)."
        
    ext = os.path.splitext(filename)[1]
    if not ext:
        ext = ".wav"
        
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
    temp_file_path = temp_file.name
    
    try:
        temp_file.write(audio_bytes)
        temp_file.close()
        
        # Transcribe using Groq
        with open(temp_file_path, "rb") as file:
            transcription = groq_client.audio.transcriptions.create(
                file=(filename, file.read()),
                model="whisper-large-v3-turbo",
                response_format="text"
            )
            return transcription.strip()
    except Exception as e:
        print(f"Transcription Error: {e}")
        return ""
    finally:
        # Cleanup temp file
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
