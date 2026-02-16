import json  # For JSON handling.
import requests  # For HTTP requests.
from typing import Generator  # For streaming generator typing.

from ..utils import token_generation, optimization_secrets  # Import YOUR existing functions.


class LLMClient:
    """
    Enterprise VOX LLM client.
    Uses OAuth token instead of API key.
    """

    def __init__(self):
        self.url = optimization_secrets["VESSSEL_OPENAI_API"]  # Internal VOX LLM endpoint.

    def stream_chat(self, messages: list) -> Generator[str, None, None]:
        """
        Stream chat response from VOX LLM.
        """

        access_token = token_generation()  # Generate access token using your existing logic.

        headers = {
            "Authorization": f"Bearer {access_token}",  # Use Bearer token auth.
            "Content-Type": "application/json"
        }

        payload = {
            "engine": "gpt-4o-mini",  # You already use this.
            "messages": messages,
            "temperature": 0.3,
            "stream": True  # IMPORTANT: enable streaming.
        }

        with requests.post(self.url, headers=headers, json=payload, stream=True) as response:
            for line in response.iter_lines():
                if line:
                    decoded = line.decode("utf-8")

                    if decoded.startswith("data:"):
                        data = decoded.replace("data:", "").strip()

                        if data == "[DONE]":
                            break

                        try:
                            json_data = json.loads(data)
                            delta = json_data.get("choices", [{}])[0].get("delta", {}).get("content", "")
                            if delta:
                                yield delta
                        except Exception:
                            continue
