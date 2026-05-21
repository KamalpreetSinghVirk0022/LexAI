import html
import re
import urllib.parse
import urllib.request


DUCKDUCKGO_HTML_URL = "https://html.duckduckgo.com/html/"


def _clean_html(value: str) -> str:
    value = re.sub(r"<[^>]+>", " ", value or "")
    value = html.unescape(value)
    return re.sub(r"\s+", " ", value).strip()


def _unwrap_duckduckgo_url(url: str) -> str:
    url = html.unescape(url or "")
    parsed = urllib.parse.urlparse(url)
    query = urllib.parse.parse_qs(parsed.query)
    if "uddg" in query and query["uddg"]:
        return query["uddg"][0]
    return url


def search_web(query: str, max_results: int = 5) -> list:
    """Search the web without requiring a paid API key.

    This uses DuckDuckGo's lightweight HTML endpoint so the feature can be
    tested locally before adding a production search provider.
    """
    if not query.strip():
        return []

    params = urllib.parse.urlencode({"q": query})
    request = urllib.request.Request(
        f"{DUCKDUCKGO_HTML_URL}?{params}",
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; LexAI/1.0; +https://example.com)",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=8) as response:
            page = response.read().decode("utf-8", errors="ignore")
    except Exception as exc:
        print(f"Web search error: {exc}")
        return []

    results = []
    blocks = re.split(r'<div class="result(?: results_links)?', page)
    for block in blocks:
        title_match = re.search(r'<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>(.*?)</a>', block, re.S)
        if not title_match:
            continue

        snippet_match = re.search(r'<a[^>]+class="result__snippet"[^>]*>(.*?)</a>', block, re.S)
        url = _unwrap_duckduckgo_url(title_match.group(1))
        title = _clean_html(title_match.group(2))
        snippet = _clean_html(snippet_match.group(1) if snippet_match else "")

        if title and url:
            results.append({
                "title": title,
                "url": url,
                "snippet": snippet,
            })

        if len(results) >= max_results:
            break

    return results
