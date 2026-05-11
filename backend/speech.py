import whisper
import os
import tempfile

# Initialize whisper model (using 'base' for faster processing, can be changed to 'small' or 'medium')
print("Initializing Whisper model...")
try:
    model = whisper.load_model("base")
except Exception as e:
    print(f"Warning: Whisper model failed to load. Make sure FFmpeg is installed. Error: {e}")
    model = None

def transcribe_audio(audio_bytes: bytes, filename: str) -> str:
    """
    Saves audio to a temporary file and uses Whisper to transcribe it to text.
    """
    if model is None:
        return "Speech to text is currently unavailable."
        
    ext = os.path.splitext(filename)[1]
    if not ext:
        ext = ".wav"
        
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
    temp_file_path = temp_file.name
    
    try:
        temp_file.write(audio_bytes)
        temp_file.close()
        
        # Transcribe
        result = model.transcribe(temp_file_path)
        return result["text"].strip()
    except Exception as e:
        print(f"Transcription Error: {e}")
        return ""
    finally:
        # Cleanup temp file
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
