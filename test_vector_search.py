import chromadb
from sentence_transformers import SentenceTransformer

def test_search(query):
    print(f"Query: {query}")
    print("Loading embedding model 'all-MiniLM-L6-v2'...")
    model = SentenceTransformer("all-MiniLM-L6-v2")
    
    print("Connecting to ChromaDB...")
    client = chromadb.PersistentClient(path="vector_db")
    try:
        collection = client.get_collection("legal_chatbot_db")
    except Exception as e:
        print("Error: Collection not found. Please build the vector DB first.")
        return

    print("Encoding query...")
    query_embedding = model.encode([query]).tolist()
    
    print("Searching vector database...")
    results = collection.query(
        query_embeddings=query_embedding,
        n_results=3
    )

    print("\nTop 3 Relevant Documents:")
    if results['documents'] and results['documents'][0]:
        for i, doc in enumerate(results['documents'][0]):
            print(f"\n--- Document {i+1} ---")
            print(doc)
    else:
        print("No documents found.")

if __name__ == "__main__":
    test_query = "What is the punishment for cyber terrorism under Indian law?"
    test_search(test_query)
