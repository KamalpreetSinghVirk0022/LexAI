RIGHTS_TOPICS = [
    {
        "id": "fundamental-rights",
        "title": "Fundamental Rights",
        "subtitle": "Constitutional protections",
        "summary": "Core protections under Part III of the Constitution, including equality, freedom, protection against exploitation, freedom of religion, cultural and educational rights, and constitutional remedies.",
        "details": [
            "Right to Equality: Articles 14 to 18 protect equality before law and prohibit discrimination on grounds such as religion, race, caste, sex, or place of birth.",
            "Right to Freedom: Articles 19 to 22 protect freedoms such as speech and expression, peaceful assembly, association, movement, residence, and profession, subject to reasonable restrictions.",
            "Right against Exploitation: Articles 23 and 24 prohibit trafficking, forced labour, and child labour in hazardous employment.",
            "Freedom of Religion: Articles 25 to 28 protect freedom of conscience and the right to profess, practice, and propagate religion, subject to public order, morality, and health.",
            "Cultural and Educational Rights: Articles 29 and 30 protect the rights of minorities to conserve their culture and establish educational institutions.",
            "Right to Constitutional Remedies: Article 32 allows people to approach the Supreme Court for enforcement of fundamental rights.",
        ],
        "sample_questions": [
            "What are the six fundamental rights in India?",
            "Can I go to court if my fundamental rights are violated?",
            "What is Article 19 in simple words?",
        ],
    },
    {
        "id": "rights-after-arrest",
        "title": "Rights After Arrest",
        "subtitle": "Protections during police action",
        "summary": "Important safeguards for a person who is arrested, including information about grounds of arrest, access to a lawyer, production before a magistrate within 24 hours, and protection against unlawful detention.",
        "details": [
            "A person arrested must be informed of the grounds of arrest and of the right to bail where applicable.",
            "The arrested person has the right to consult and be defended by a lawyer of their choice.",
            "The police must produce the arrested person before the nearest magistrate within 24 hours, excluding travel time.",
            "Unnecessary restraint should not be used unless clearly required.",
            "Family or friends should be informed about the arrest and place of detention.",
        ],
        "sample_questions": [
            "What are my rights if police arrest me?",
            "Do police have to tell my family after arrest?",
            "How long can police keep a person before producing them in court?",
        ],
    },
    {
        "id": "women-rights",
        "title": "Women's Legal Rights",
        "subtitle": "Safety, dignity, and protection",
        "summary": "Rights relating to domestic violence, workplace harassment, maintenance, police complaint handling, and access to legal remedies.",
        "details": [
            "Women have legal protection against domestic violence under the Protection of Women from Domestic Violence Act, 2005.",
            "Sexual harassment at the workplace is addressed by the POSH Act, and workplaces are expected to have an Internal Committee where applicable.",
            "A woman can seek maintenance under applicable personal laws and under Section 125 CrPC or successor provisions as applicable.",
            "Police must handle complaints with dignity, and in sensitive cases procedures may require statements to be recorded by women officers or in safer settings.",
        ],
        "sample_questions": [
            "What legal rights protect women from domestic violence?",
            "How can a woman complain about workplace harassment?",
            "Can a woman claim maintenance after separation?",
        ],
    },
    {
        "id": "consumer-rights",
        "title": "Consumer Rights",
        "subtitle": "Protection against unfair trade practices",
        "summary": "Rights to safety, information, choice, being heard, redressal, and consumer education under consumer protection law.",
        "details": [
            "Consumers have the right to be informed about quality, quantity, price, purity, standard, and other details of goods and services.",
            "Consumers can seek redressal for defective products, deficient services, unfair trade practices, and misleading advertisements.",
            "Consumer commissions exist at district, state, and national levels depending on claim value and subject matter.",
            "People should preserve bills, receipts, warranty records, and complaint correspondence when seeking redress.",
        ],
        "sample_questions": [
            "What are my consumer rights in India?",
            "Where can I complain about a defective product?",
            "What proof should I keep for a consumer complaint?",
        ],
    },
    {
        "id": "free-legal-aid",
        "title": "Free Legal Aid",
        "subtitle": "Access to justice support",
        "summary": "Eligible persons can receive free legal services through legal services authorities, especially those from vulnerable groups or with limited means.",
        "details": [
            "Free legal aid may be available through legal services authorities for eligible persons, including women, children, members of certain disadvantaged groups, persons with disabilities, and others covered by law.",
            "Legal aid can include legal advice, representation, drafting, and support in filing cases or applications.",
            "District Legal Services Authorities and State Legal Services Authorities are common access points.",
        ],
        "sample_questions": [
            "Who can get free legal aid in India?",
            "How do I apply for free legal help?",
            "What services are included in legal aid?",
        ],
    },
]


RIGHTS_KEYWORDS = (
    "fundamental right",
    "fundamental rights",
    "constitutional rights",
    "article 14",
    "article 19",
    "article 21",
    "article 32",
    "rights after arrest",
    "arrest rights",
    "consumer rights",
    "women rights",
    "women's rights",
    "legal aid",
    "free legal aid",
    "human rights",
    "right to equality",
    "right to freedom",
)


def get_rights_topics():
    return RIGHTS_TOPICS


def looks_like_rights_query(query: str) -> bool:
    query_lower = (query or "").lower()
    return any(keyword in query_lower for keyword in RIGHTS_KEYWORDS)


def get_rights_context(query: str) -> list:
    if not looks_like_rights_query(query):
        return []

    query_lower = query.lower()
    matched_topics = []
    for topic in RIGHTS_TOPICS:
        haystack = " ".join(
            [topic["title"], topic["subtitle"], topic["summary"], " ".join(topic["sample_questions"])]
        ).lower()
        if any(word in haystack for word in query_lower.split()):
            matched_topics.append(topic)

    topics_to_use = matched_topics or RIGHTS_TOPICS[:3]
    context_docs = []
    for topic in topics_to_use:
        details = "\n".join(f"- {item}" for item in topic["details"])
        questions = "\n".join(f"- {item}" for item in topic["sample_questions"])
        context_docs.append(
            f"Rights Topic: {topic['title']}\n"
            f"Subtitle: {topic['subtitle']}\n"
            f"Summary: {topic['summary']}\n"
            f"Details:\n{details}\n"
            f"Sample Questions:\n{questions}"
        )
    return context_docs
