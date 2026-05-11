import pytesseract
from PIL import Image
import io
import os

# Important: pytesseract requires the tesseract executable to be installed on the system.
# On Windows, you may need to point pytesseract to the tesseract executable if it's not in your PATH:
# pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
# We will assume it is in the PATH for now.

def extract_text_from_image(image_bytes: bytes) -> str:
    """
    Extracts text from an image using Tesseract OCR.
    """
    try:
        image = Image.open(io.BytesIO(image_bytes))
        text = pytesseract.image_to_string(image)
        return text.strip()
    except Exception as e:
        print(f"OCR Error: {e}")
        return ""
