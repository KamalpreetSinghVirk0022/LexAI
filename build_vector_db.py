import json
import chromadb
from sentence_transformers import SentenceTransformer
import os
from tqdm import tqdm

def build_vector_db(json_file, persist_directory):
    if not os.path.exists(json_file):
        print(f"Error: Dataset file {json_file} not found.")
        return

    print("Loading data...")
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    if not data:
        print("Dataset is empty. Nothing to embed.")
        return

    print("Loading embedding model 'all-MiniLM-L6-v2'...")
    model = SentenceTransformer("all-MiniLM-L6-v2")

    print(f"Initializing ChromaDB at {persist_directory}...")
    client = chromadb.PersistentClient(path=persist_directory)
    
    # Try to delete the collection if it exists to start fresh
    try:
        client.delete_collection("legal_chatbot_db")
    except Exception:
        pass
        
    collection = client.create_collection("legal_chatbot_db")

    batch_size = 100
    print(f"Processing {len(data)} documents...")

    for i in tqdm(range(0, len(data), batch_size)):
        batch = data[i:i+batch_size]
        texts = [item["text"] for item in batch]
        ids = [f"doc_{j}" for j in range(i, i + len(batch))]
        
        # Generate embeddings
        embeddings = model.encode(texts).tolist()
        
        # Add to ChromaDB
        collection.add(
            embeddings=embeddings,
            documents=texts,
            ids=ids
        )

    print("Vector database built successfully!")

if __name__ == "__main__":
    dataset_file = "clean_legal_dataset.json"
    vector_db_path = "vector_db"
    build_vector_db(dataset_file, vector_db_path)
