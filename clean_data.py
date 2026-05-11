import os
import json
import csv
import pdfplumber

def extract_text_from_pdf(pdf_path):
    text = ""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception as e:
        print(f"Error reading PDF {pdf_path}: {e}")
    return text.strip()

def process_datasets(dataset_dir, output_file):
    cleaned_data = []
    
    if not os.path.exists(dataset_dir):
        print(f"Dataset directory {dataset_dir} does not exist.")
        return

    for filename in os.listdir(dataset_dir):
        file_path = os.path.join(dataset_dir, filename)
        
        if filename.endswith(".json"):
            print(f"Processing JSON: {filename}")
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    # Handle different JSON structures defensively
                    if isinstance(data, list):
                        for item in data:
                            question = item.get("question", "") or item.get("instruction", "") or item.get("query", "")
                            answer = item.get("answer", "") or item.get("output", "") or item.get("response", "")
                            if question and answer:
                                cleaned_data.append({"text": f"Question: {question}\nAnswer: {answer}"})
                            elif "text" in item:
                                cleaned_data.append({"text": item["text"]})
                    elif isinstance(data, dict):
                        # Some formats might be a dict with a list of entries
                        for k, v in data.items():
                            if isinstance(v, list):
                                for item in v:
                                    if isinstance(item, dict):
                                        question = item.get("question", "") or item.get("instruction", "")
                                        answer = item.get("answer", "") or item.get("output", "")
                                        if question and answer:
                                            cleaned_data.append({"text": f"Question: {question}\nAnswer: {answer}"})
            except Exception as e:
                print(f"Error parsing JSON {filename}: {e}")
                
        elif filename.endswith(".csv"):
            print(f"Processing CSV: {filename}")
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        # Combine all columns into a single text representation
                        row_text = "\n".join([f"{k}: {v}" for k, v in row.items() if v])
                        if row_text.strip():
                            cleaned_data.append({"text": row_text})
            except Exception as e:
                print(f"Error parsing CSV {filename}: {e}")

        elif filename.endswith(".pdf"):
            print(f"Processing PDF: {filename}")
            text = extract_text_from_pdf(file_path)
            if text:
                # Basic chunking: split by double newlines or just store chunks
                # For simplicity, split into chunks of roughly 1000 characters
                chunk_size = 1000
                for i in range(0, len(text), chunk_size):
                    chunk = text[i:i+chunk_size]
                    cleaned_data.append({"text": chunk})

    # Remove duplicates
    unique_data = []
    seen = set()
    for item in cleaned_data:
        t = item["text"].strip()
        if t and t not in seen:
            seen.add(t)
            unique_data.append({"text": t})

    print(f"Total cleaned documents extracted: {len(unique_data)}")

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(unique_data, f, ensure_ascii=False, indent=4)
    print(f"Cleaned dataset saved to {output_file}")

if __name__ == "__main__":
    dataset_folder = "datasets"
    output_json = "clean_legal_dataset.json"
    process_datasets(dataset_folder, output_json)
