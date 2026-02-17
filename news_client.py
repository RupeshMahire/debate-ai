from duckduckgo_search import DDGS
from datetime import datetime

class NewsClient:
    def __init__(self):
        self.ddgs = DDGS()

    def get_news(self, topic, max_results=3):
        """
        Fetches live news for a given topic.
        Returns a formatted string summary.
        """
        try:
            print(f"\n[Searching for live news on: '{topic}'...]")
            results = self.ddgs.text(f"{topic} news {datetime.now().year}", max_results=max_results)
            
            if not results:
                return "No recent news found."

            summary = "Recent News Context:\n"
            for i, res in enumerate(results, 1):
                title = res.get('title', 'Unknown Title')
                body = res.get('body', 'No snippet available.')
                # url = res.get('href', '')
                summary += f"{i}. {title}: {body}\n"
            
            return summary.strip()
        except Exception as e:
            print(f"[!] Error fetching news: {e}")
            return "Could not fetch live news."

if __name__ == "__main__":
    # Test
    client = NewsClient()
    print(client.get_news("Artificial Intelligence"))
