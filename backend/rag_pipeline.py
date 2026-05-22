import chromadb
from chromadb.utils.embedding_functions import DefaultEmbeddingFunction
from groq import Groq
import os
from dotenv import load_dotenv
import web_search
from rights_knowledge import get_rights_context

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
LEGAL_KEYWORDS = (
    "law", "legal", "ipc", "crpc", "constitution", "fir", "bail", "police",
    "court", "judge", "rights", "complaint", "consumer", "divorce", "marriage",
    "property", "tenant", "cybercrime", "arrest", "advocate", "lawyer",
    "section", "act", "crime", "offence", "offense", "contract", "succession",
    "inheritance", "harassment", "domestic violence", "maintenance", "rti",
    "gst", "tax", "cheque bounce", "fraud", "scam"
)

LOCALIZED_DISCLAIMERS = {
    "Hindi": "\n\n**अस्वीकरण:** यह चैटबॉट केवल शैक्षिक उद्देश्यों के लिए कानूनी जानकारी प्रदान करता है और पेशेवर कानूनी सलाह का विकल्प नहीं है।",
    "Bengali": "\n\n**দাবিত্যাগ:** এই চ্যাটবট শুধুমাত্র শিক্ষামূলক উদ্দেশ্যে আইনি তথ্য প্রদান করে এবং এটি পেশাদার আইনি পরামর্শের বিকল্প নয়।",
    "Gujarati": "\n\n**અસ્વીકરણ:** આ ચેટબોટ માત્ર શૈક્ષણિક હેતુઓ માટે કાનૂની માહિતી આપે છે અને વ્યાવસાયિક કાનૂની સલાહનો વિકલ્પ નથી.",
    "Marathi": "\n\n**अस्वीकरण:** हा चॅटबॉट केवळ शैक्षणिक उद्देशांसाठी कायदेशीर माहिती पुरवतो आणि तो व्यावसायिक कायदेशीर सल्ल्याचा पर्याय नाही.",
    "Punjabi": "\n\n**ਅਸਵੀਕਰਨ:** ਇਹ ਚੈਟਬੋਟ ਸਿਰਫ਼ ਸਿੱਖਿਆਤਮਕ ਮਕਸਦ ਲਈ ਕਾਨੂੰਨੀ ਜਾਣਕਾਰੀ ਦਿੰਦਾ ਹੈ ਅਤੇ ਇਹ ਪੇਸ਼ੇਵਰ ਕਾਨੂੰਨੀ ਸਲਾਹ ਦਾ ਬਦਲ ਨਹੀਂ ਹੈ।",
    "Tamil": "\n\n**பொறுப்புத்துறப்பு:** இந்த சாட்பாட் கல்வி நோக்கங்களுக்காக மட்டுமே சட்ட தகவலை வழங்குகிறது; இது தொழில்முறை சட்ட ஆலோசனைக்கு மாற்றாகாது.",
    "Telugu": "\n\n**నిరాకరణ:** ఈ చాట్‌బాట్ విద్యాపరమైన ప్రయోజనాల కోసం మాత్రమే న్యాయ సమాచారాన్ని అందిస్తుంది; ఇది వృత్తిపరమైన న్యాయ సలహాకు ప్రత్యామ్నాయం కాదు.",
    "Kannada": "\n\n**ಜವಾಬ್ದಾರಿ ನಿರಾಕರಣೆ:** ಈ ಚಾಟ್‌ಬಾಟ್ ಶಿಕ್ಷಣ ಉದ್ದೇಶಗಳಿಗಾಗಿ ಮಾತ್ರ ಕಾನೂನು ಮಾಹಿತಿಯನ್ನು ನೀಡುತ್ತದೆ; ಇದು ವೃತ್ತಿಪರ ಕಾನೂನು ಸಲಹೆಗೆ ಪರ್ಯಾಯವಲ್ಲ.",
    "Malayalam": "\n\n**അറിയിപ്പ്:** ഈ ചാറ്റ്ബോട്ട് വിദ്യാഭ്യാസ ആവശ്യങ്ങൾക്കായി മാത്രമാണ് നിയമ വിവരങ്ങൾ നൽകുന്നത്; ഇത് പ്രൊഫഷണൽ നിയമോപദേശത്തിന് പകരമല്ല.",
}

LOCALIZED_WEB_SEARCH_PROMPTS = {
    "Hindi": "मुझे इस प्रश्न के बारे में अपने कानूनी ज्ञान भंडार में पर्याप्त विश्वसनीय जानकारी नहीं मिली। क्या आप चाहते हैं कि मैं वेब पर नवीनतम जानकारी खोजकर उसी के आधार पर उत्तर दूँ?",
    "Bengali": "এই প্রশ্ন সম্পর্কে আমার আইনি জ্ঞানভান্ডারে যথেষ্ট নির্ভরযোগ্য তথ্য পাইনি। আপনি কি চান আমি ওয়েবে হালনাগাদ তথ্য খুঁজে সেই ভিত্তিতে উত্তর দিই?",
    "Gujarati": "મને આ પ્રશ્ન વિશે મારા કાનૂની જ્ઞાનભંડારમાં પૂરતી વિશ્વસનીય માહિતી મળી નથી. શું તમે ઇચ્છો છો કે હું વેબ પર નવી માહિતી શોધી તેના આધારે જવાબ આપું?",
    "Marathi": "मला या प्रश्नाबद्दल माझ्या कायदेशीर ज्ञानसंग्रहात पुरेशी विश्वासार्ह माहिती मिळाली नाही. तुम्हाला हवे असल्यास मी वेबवर अद्ययावत माहिती शोधून त्यावर आधारित उत्तर देऊ शकतो.",
    "Punjabi": "ਮੈਨੂੰ ਇਸ ਪ੍ਰਸ਼ਨ ਬਾਰੇ ਆਪਣੇ ਕਾਨੂੰਨੀ ਗਿਆਨ ਭੰਡਾਰ ਵਿੱਚ ਕਾਫ਼ੀ ਭਰੋਸੇਯੋਗ ਜਾਣਕਾਰੀ ਨਹੀਂ ਮਿਲੀ। ਜੇ ਤੁਸੀਂ ਚਾਹੋ ਤਾਂ ਮੈਂ ਵੈੱਬ ਤੋਂ ਨਵੀਂ ਜਾਣਕਾਰੀ ਲੱਭ ਕੇ ਉਸ ਦੇ ਆਧਾਰ 'ਤੇ ਜਵਾਬ ਦੇ ਸਕਦਾ ਹਾਂ।",
    "Tamil": "இந்த கேள்விக்கு எனது சட்ட அறிவகத்தில் போதுமான நம்பகமான தகவல் கிடைக்கவில்லை. நீங்கள் விரும்பினால், இணையத்தில் புதுப்பிக்கப்பட்ட தகவலைத் தேடி அதைப் பயன்படுத்தி பதிலளிக்கிறேன்.",
    "Telugu": "ఈ ప్రశ్నకు సంబంధించినంత నమ్మదగిన సమాచారం నా న్యాయ జ్ఞానభాండాగారంలో లభించలేదు. మీరు కోరుకుంటే, వెబ్‌లో తాజా సమాచారాన్ని వెతికి దాని ఆధారంగా సమాధానం ఇస్తాను.",
    "Kannada": "ಈ ಪ್ರಶ್ನೆಗೆ ಸಂಬಂಧಿಸಿದಷ್ಟು ನಂಬಲರ್ಹ ಮಾಹಿತಿ ನನ್ನ ಕಾನೂನು ಜ್ಞಾನಕೋಶದಲ್ಲಿ ಸಿಗಲಿಲ್ಲ. ನೀವು ಬಯಸಿದರೆ, ನಾನು ವೆಬ್‌ನಲ್ಲಿ ಹೊಸ ಮಾಹಿತಿಯನ್ನು ಹುಡುಕಿ ಅದರ ಆಧಾರದ ಮೇಲೆ ಉತ್ತರಿಸುತ್ತೇನೆ.",
    "Malayalam": "ഈ ചോദ്യത്തെക്കുറിച്ച് എന്റെ നിയമ വിജ്ഞാനശേഖരത്തിൽ മതിയായ വിശ്വസനീയ വിവരങ്ങൾ ലഭിച്ചില്ല. നിങ്ങൾ ആഗ്രഹിക്കുന്നുവെങ്കിൽ, വെബിൽ പുതുക്കിയ വിവരങ്ങൾ തിരഞ്ഞ് അതിന്റെ അടിസ്ഥാനത്തിൽ ഞാൻ മറുപടി നൽകാം.",
}

LOCALIZED_NO_WEB_RESULTS = {
    "Hindi": "मैंने वेब पर खोजने की कोशिश की, लेकिन इस समय उपयोगी परिणाम प्राप्त नहीं कर सका।",
    "Bengali": "আমি ওয়েবে খোঁজার চেষ্টা করেছি, কিন্তু এই মুহূর্তে উপযোগী ফল পাইনি।",
    "Gujarati": "મેં વેબ પર શોધવાનો પ્રયાસ કર્યો, પરંતુ હાલમાં ઉપયોગી પરિણામો મેળવી શક્યો નથી.",
    "Marathi": "मी वेबवर शोधण्याचा प्रयत्न केला, पण सध्या उपयुक्त निकाल मिळाले नाहीत.",
    "Punjabi": "ਮੈਂ ਵੈੱਬ 'ਤੇ ਖੋਜ ਕਰਨ ਦੀ ਕੋਸ਼ਿਸ਼ ਕੀਤੀ, ਪਰ ਇਸ ਵੇਲੇ ਮੈਨੂੰ ਕੋਈ ਲਾਭਕਾਰੀ ਨਤੀਜੇ ਨਹੀਂ ਮਿਲੇ।",
    "Tamil": "இணையத்தில் தேட முயன்றேன், ஆனால் இப்போது பயனுள்ள முடிவுகளை பெற முடியவில்லை.",
    "Telugu": "వెబ్‌లో వెతకడానికి ప్రయత్నించాను, కానీ ప్రస్తుతం ఉపయోగకరమైన ఫలితాలు దొరకలేదు.",
    "Kannada": "ನಾನು ವೆಬ್‌ನಲ್ಲಿ ಹುಡುಕಲು ಪ್ರಯತ್ನಿಸಿದೆ, ಆದರೆ ಈ ಕ್ಷಣದಲ್ಲಿ ಉಪಯುಕ್ತ ಫಲಿತಾಂಶಗಳನ್ನು ಪಡೆಯಲಾಗಲಿಲ್ಲ.",
    "Malayalam": "ഞാൻ വെബിൽ തിരയാൻ ശ്രമിച്ചു, പക്ഷേ ഇപ്പോൾ പ്രയോജനകരമായ ഫലങ്ങൾ ലഭിച്ചില്ല.",
}


def get_disclaimer(target_language: str = "English") -> str:
    return LOCALIZED_DISCLAIMERS.get(target_language, DISCLAIMER)


def get_web_search_prompt(target_language: str = "English") -> str:
    return LOCALIZED_WEB_SEARCH_PROMPTS.get(target_language, WEB_SEARCH_PROMPT)


def get_no_web_results_message(target_language: str = "English") -> str:
    base_message = LOCALIZED_NO_WEB_RESULTS.get(
        target_language,
        "I tried searching the web, but I could not retrieve useful web results right now."
    )
    return base_message + get_disclaimer(target_language)

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


def looks_legal_query(query: str) -> bool:
    query_lower = query.lower()
    return any(keyword in query_lower for keyword in LEGAL_KEYWORDS)


def should_offer_web_search(query: str, context_docs: list, distances: list, use_web_search: bool) -> bool:
    if use_web_search:
        return False
    if not looks_legal_query(query):
        return True
    return not is_context_confident(context_docs, distances)


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


def build_english_search_query(query: str) -> str:
    if not query.strip():
        return query

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Convert the user's request into a short English web search query. "
                        "Preserve names, legal sections, and key facts. Return only the search query."
                    ),
                },
                {"role": "user", "content": query},
            ],
            temperature=0.1,
            max_tokens=80,
        )
        english_query = response.choices[0].message.content.strip()
        return english_query or query
    except Exception as e:
        print(f"English search query conversion error: {e}")
        return query


def search_web_with_english_fallback(query: str, target_language: str = "English") -> tuple:
    search_queries = [query]
    english_query = query

    if target_language.lower() != "english":
        english_query = build_english_search_query(query)
        if english_query and english_query.lower() != query.lower():
            search_queries.append(english_query)

    for search_query in search_queries:
        results = web_search.search_web(search_query)
        if results:
            return results, search_query

    return [], english_query

def _build_prompt(query: str, context_docs: list, history: list = None, context_label: str = "Context", target_language: str = "English") -> list:
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

    language_instruction = ""
    if target_language and target_language.lower() != "english":
        language_instruction = (
            f" Respond entirely in {target_language}, regardless of the language used in the user's question. "
            "Keep section numbers, statute names, URLs, and proper nouns accurate."
        )

    return [
        {"role": "system", "content": "You are a helpful legal assistant for Indian Law. IMPORTANT: Do not assume the user's state (e.g., Karnataka, Maharashtra) or city unless they explicitly mention it in their query. Keep your advice generalized to Indian law or advise them to check their local state laws if applicable." + language_instruction},
        {"role": "user", "content": prompt}
    ]


def generate_answer(query: str, context_docs: list, history: list = None, context_label: str = "Context", target_language: str = "English") -> str:
    messages = _build_prompt(query, context_docs, history, context_label=context_label, target_language=target_language)
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages,
            temperature=0.3,
            max_tokens=1024
        )
        answer = response.choices[0].message.content.strip()
        return answer + get_disclaimer(target_language)
    except Exception as e:
        return f"I encountered an error while generating the response: {str(e)}" + get_disclaimer(target_language)


def stream_answer(query: str, context_docs: list, history: list = None, context_label: str = "Context", target_language: str = "English"):
    """Generator that yields text chunks from the Groq streaming API."""
    messages = _build_prompt(query, context_docs, history, context_label=context_label, target_language=target_language)
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
        yield get_disclaimer(target_language)
    except Exception as e:
        yield f"Error: {str(e)}" + get_disclaimer(target_language)


def process_query(query: str, history: list = None, use_web_search: bool = False, target_language: str = "English") -> tuple:
    """Returns (answer: str, sources: list, meta: dict)."""
    context_docs, sources, distances = retrieve_context(query)
    rights_context_docs = get_rights_context(query)
    if rights_context_docs:
        context_docs = rights_context_docs + context_docs
        if not sources:
            sources = [{"name": "Rights Guide", "page": ""}]

    if should_offer_web_search(query, context_docs, distances, use_web_search):
        return get_web_search_prompt(target_language), [], {"web_search_suggested": True}

    if use_web_search:
        web_results, search_query_used = search_web_with_english_fallback(query, target_language)
        if not web_results:
            return get_no_web_results_message(target_language), [], {"web_search_used": True}
        context_docs = web_results_to_context(web_results)
        sources = [{"name": result["title"], "page": result["url"]} for result in web_results]
        answer = generate_answer(query, context_docs, history, context_label="Web search results", target_language=target_language)
        return answer, sources, {"web_search_used": True, "web_search_query": search_query_used}

    answer = generate_answer(query, context_docs, history, target_language=target_language)
    if target_language.lower() == "english" and any(marker in answer.lower() for marker in UNKNOWN_ANSWER_MARKERS):
        return get_web_search_prompt(target_language), [], {"web_search_suggested": True}
    return answer, sources, {"web_search_suggested": False, "web_search_used": False}


def process_query_stream(query: str, history: list = None, use_web_search: bool = False, target_language: str = "English") -> tuple:
    """Returns (generator, sources: list, meta: dict)."""
    context_docs, sources, distances = retrieve_context(query)
    rights_context_docs = get_rights_context(query)
    if rights_context_docs:
        context_docs = rights_context_docs + context_docs
        if not sources:
            sources = [{"name": "Rights Guide", "page": ""}]

    if should_offer_web_search(query, context_docs, distances, use_web_search):
        def prompt_generator():
            yield get_web_search_prompt(target_language)
        return prompt_generator(), [], {"web_search_suggested": True}

    if use_web_search:
        web_results, search_query_used = search_web_with_english_fallback(query, target_language)
        if not web_results:
            def no_results_generator():
                yield get_no_web_results_message(target_language)
            return no_results_generator(), [], {"web_search_used": True}
        context_docs = web_results_to_context(web_results)
        sources = [{"name": result["title"], "page": result["url"]} for result in web_results]
        return stream_answer(query, context_docs, history, context_label="Web search results", target_language=target_language), sources, {"web_search_used": True, "web_search_query": search_query_used}

    base_generator = stream_answer(query, context_docs, history, target_language=target_language)

    def guarded_generator():
        chunks = []
        for chunk in base_generator:
            chunks.append(chunk)
            yield chunk

    meta = {"web_search_suggested": False, "web_search_used": False}
    return guarded_generator(), sources, meta
