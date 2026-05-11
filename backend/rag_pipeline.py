import chromadb
from sentence_transformers import SentenceTransformer
from groq import Groq
import os
from dotenv import load_dotenv

# Load environment variables from the .env file
load_dotenv()

# Initialize components globally to avoid reloading on every request
print("Initializing Embedding Model...")
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

print("Connecting to ChromaDB...")
chroma_client = chromadb.PersistentClient(path="../vector_db")

try:
    collection = chroma_client.get_collection("legal_chatbot_db")
except Exception as e:
    print("Warning: ChromaDB collection not found. Make sure to run build_vector_db.py.")
    collection = None

# Initialize Groq client
groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

DISCLAIMER = "\n\n**Disclaimer:** This chatbot provides legal information for educational purposes only and is not a substitute for professional legal advice."

def retrieve_context(query: str, top_k: int = 3):
    """Returns (docs, sources) where sources is a list of metadata dicts."""
    if collection is None:
        return [], []
    
    query_embedding = embedding_model.encode([query]).tolist()
    
    results = collection.query(
        query_embeddings=query_embedding,
        n_results=top_k,
        include=["documents", "metadatas"]
    )
    
    docs = results['documents'][0] if results['documents'] and results['documents'][0] else []
    metadatas = results['metadatas'][0] if results.get('metadatas') and results['metadatas'][0] else []

    # Build clean source list: unique filenames
    seen = set()
    sources = []
    for meta in metadatas:
        if not meta:
            continue
        name = meta.get('source') or meta.get('filename') or meta.get('file') or ''
        page = meta.get('page') or meta.get('page_number') or ''
        if name and name not in seen:
            seen.add(name)
            sources.append({'name': name, 'page': str(page) if page else ''})
    return docs, sources

def _build_prompt(query: str, context_docs: list, history: list = None) -> list:
    """Build the messages list for the Groq API call."""
    context_text = "\n\n".join(context_docs) if context_docs else "No relevant context found."
    
    history_text = ""
    if history:
        history_text = "Previous Conversation:\n"
        for msg in history[-6:]:
            role = "User" if msg["role"] == "user" else "Assistant"
            history_text += f"{role}: {msg['content']}\n"
        history_text += "\n"
    
    prompt = f"""Answer the legal question using the context below and the previous conversation history if relevant. If the answer is not in the context, say you don't know.

{history_text}Context:
{context_text}

Current Question:
{query}"""

    return [
        {"role": "system", "content": "You are a helpful legal assistant for Indian Law. IMPORTANT: Do not assume the user's state (e.g., Karnataka, Maharashtra) or city unless they explicitly mention it in their query. Keep your advice generalized to Indian law or advise them to check their local state laws if applicable."},
        {"role": "user", "content": prompt}
    ]


def generate_answer(query: str, context_docs: list, history: list = None) -> str:
    messages = _build_prompt(query, context_docs, history)
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages,
            temperature=0.3,
            max_tokens=1024
        )
        answer = response.choices[0].message.content.strip()
        return answer + DISCLAIMER
    except Exception as e:
        return f"I encountered an error while generating the response: {str(e)}" + DISCLAIMER


def stream_answer(query: str, context_docs: list, history: list = None):
    """Generator that yields text chunks from the Groq streaming API."""
    messages = _build_prompt(query, context_docs, history)
    try:
        stream = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages,
            temperature=0.3,
            max_tokens=1024,
            stream=True
        )
        for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta
        yield DISCLAIMER
    except Exception as e:
        yield f"Error: {str(e)}" + DISCLAIMER


def process_query(query: str, history: list = None) -> tuple:
    """Returns (answer: str, sources: list)"""
    context_docs, sources = retrieve_context(query)
    answer = generate_answer(query, context_docs, history)
    return answer, sources


def process_query_stream(query: str, history: list = None) -> tuple:
    """Returns (generator, sources: list)"""
    context_docs, sources = retrieve_context(query)
    return stream_answer(query, context_docs, history), sources
