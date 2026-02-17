import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

class LLMClient:
    def __init__(self):
        # Using the provided Groq API key from environment
        self.api_key = os.getenv("GROQ_API_KEY") 
        if not self.api_key:
            raise ValueError(
                "GROQ_API_KEY environment variable not found. "
                "Please set it in your environment or Render dashboard settings."
            )
        self.base_url = "https://api.groq.com/openai/v1/chat/completions"
        self.default_model = "llama-3.3-70b-versatile"

    def get_completion(self, messages, temperature=0.9, max_tokens=400):
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "https://localhost",
            "X-Title": "Debate.ai Prototype",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.default_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }

        try:
            response = requests.post(self.base_url, headers=headers, json=payload)
            if response.status_code != 200:
                return f"Error {response.status_code}: {response.text}"
            
            result = response.json()
            return result['choices'][0]['message']['content'].strip()
        except Exception as e:
            return f"Exception during API call: {str(e)}"
