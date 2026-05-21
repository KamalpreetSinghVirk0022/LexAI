import chromadb
from chromadb.utils.embedding_functions import DefaultEmbeddingFunction
from groq import Groq
import os
from dotenv import load_dotenv
import web_search

# Load environment variables from the .env file
load_dotenv()

# Initialize components globally to avoid reloading on every request
print("Initializing Embedding Model (ONNX)...")
embedding_model = DefaultEmbeddingFunction()

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
WEB_SEARCH_PROMPT = "I could not find enough reliable information about this question in my legal knowledge base. Would you like me to search the web for updated information and answer using those web results?"
RAG_MAX_DISTANCE = float(os.getenv("RAG_MAX_DISTANCE", "1.2"))
UNKNOWN_ANSWER_MARKERS = (
    "i don't know",
    "i do not know",
    "not in the context",
    "no relevant context found",
    "not enough information",
)

def retrieve_context(query: str, top_k: int = 3):
    """Returns (docs, sources, distances). Lower distances mean better matches."""
    if collection is None:
        return [], [], []
    
    query_embedding = embedding_model([query])
    
    results = collection.query(
        query_embeddings=query_embedding,
        n_results=top_k,
        include=["documents", "metadatas", "distances"]
    )
    
    docs = results['documents'][0] if results['documents'] and results['documents'][0] else []
    metadatas = results['metadatas'][0] if results.get('metadatas') and results['metadatas'][0] else []
    distances = results['distances'][0] if results.get('distances') and results['distances'][0] else []

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
    return docs, sources, distances


def is_context_confident(context_docs: list, distances: list) -> bool:
    if not context_docs:
        return False
    if not distances:
        return True
    best_distance = min(distances)
    return best_distance <= RAG_MAX_DISTANCE


def web_results_to_context(results: list) -> list:
    context_docs = []
    for index, result in enumerate(results, start=1):
        context_docs.append(
            f"Web Result {index}\n"
            f"Title: {result.get('title', '')}\n"
            f"URL: {result.get('url', '')}\n"
            f"Snippet: {result.get('snippet', '')}"
        )
    return context_docs

def _build_prompt(query: str, context_docs: list, history: list = None, context_label: str = "Context") -> list:
    """Build the messages list for the Groq API call."""
    context_text = "\n\n".join(context_docs) if context_docs else "No relevant context found."
    
    history_text = ""
    if history:
        history_text = "Previous Conversation:\n"
        for msg in history[-6:]:
            role = "User" if msg["role"] == "user" else "Assistant"
            history_text += f"{role}: {msg['content']}\n"
        history_text += "\n"
    
    prompt = f"""Answer the legal question using the {context_label.lower()} below and the previous conversation history if relevant. If the answer is not in the {context_label.lower()}, say you don't know.

{history_text}{context_label}:
{context_text}

Current Question:
{query}"""

    return [
        {"role": "system", "content": "You are a helpful legal assistant for Indian Law. IMPORTANT: Do not assume the user's state (e.g., Karnataka, Maharashtra) or city unless they explicitly mention it in their query. Keep your advice generalized to Indian law or advise them to check their local state laws if applicable."},
        {"role": "user", "content": prompt}
    ]


def generate_answer(query: str, context_docs: list, history: list = None, context_label: str = "Context") -> str:
    messages = _build_prompt(query, context_docs, history, context_label=context_label)
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


def stream_answer(query: str, context_docs: list, history: list = None, context_label: str = "Context"):
    """Generator that yields text chunks from the Groq streaming API."""
    messages = _build_prompt(query, context_docs, history, context_label=context_label)
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


def process_query(query: str, history: list = None, use_web_search: bool = False) -> tuple:
    """Returns (answer: str, sources: list, meta: dict)."""
    context_docs, sources, distances = retrieve_context(query)

    if not use_web_search and not is_context_confident(context_docs, distances):
        return WEB_SEARCH_PROMPT, [], {"web_search_suggested": True}

    if use_web_search:
        web_results = web_search.search_web(query)
        if not web_results:
            return "I tried searching the web, but I could not retrieve useful web results right now." + DISCLAIMER, [], {"web_search_used": True}
        context_docs = web_results_to_context(web_results)
        sources = [{"name": result["title"], "page": result["url"]} for result in web_results]
        answer = generate_answer(query, context_docs, history, context_label="Web search results")
        return answer, sources, {"web_search_used": True}

    answer = generate_answer(query, context_docs, history)
    if any(marker in answer.lower() for marker in UNKNOWN_ANSWER_MARKERS):
        return WEB_SEARCH_PROMPT, [], {"web_search_suggested": True}
    return answer, sources, {"web_search_suggested": False, "web_search_used": False}


def process_query_stream(query: str, history: list = None, use_web_search: bool = False) -> tuple:
    """Returns (generator, sources: list, meta: dict)."""
    context_docs, sources, distances = retrieve_context(query)

    if not use_web_search and not is_context_confident(context_docs, distances):
        def prompt_generator():
            yield WEB_SEARCH_PROMPT
        return prompt_generator(), [], {"web_search_suggested": True}

    if use_web_search:
        web_results = web_search.search_web(query)
        if not web_results:
            def no_results_generator():
                yield "I tried searching the web, but I could not retrieve useful web results right now." + DISCLAIMER
            return no_results_generator(), [], {"web_search_used": True}
        context_docs = web_results_to_context(web_results)
        sources = [{"name": result["title"], "page": result["url"]} for result in web_results]
        return stream_answer(query, context_docs, history, context_label="Web search results"), sources, {"web_search_used": True}

    base_generator = stream_answer(query, context_docs, history)

    def guarded_generator():
        chunks = []
        for chunk in base_generator:
            chunks.append(chunk)
            yield chunk

    meta = {"web_search_suggested": False, "web_search_used": False}
    return guarded_generator(), sources, meta
