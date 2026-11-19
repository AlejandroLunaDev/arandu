"""A vision model reads page images through OpenRouter (OPENROUTER_API_KEY); the provider may not keep the data."""

import base64
import io
import json
import os
import urllib.request

from engine import fetch

MODEL = "anthropic/claude-sonnet-5.5"
URL = "https://openrouter.ai/api/v1/chat/completions"


def read_json(prompt, images):
    """Send prompt with the PIL images, in order, and return the JSON object the model answers."""
    content = [{"type": "text", "text": prompt}]
    for image in images:
        png = io.BytesIO()
        image.save(png, "PNG")
        content.append({"type": "image_url",
                        "image_url": {"url": "data:image/png;base64," + base64.b64encode(png.getvalue()).decode()}})
    body = {"model": MODEL, "temperature": 0, "messages": [{"role": "user", "content": content}],
            "provider": {"data_collection": "deny"}, "response_format": {"type": "json_object"}}
    request = urllib.request.Request(URL, json.dumps(body).encode(), {
        "Authorization": f"Bearer {os.environ['OPENROUTER_API_KEY']}", "Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=600, context=fetch._TLS) as response:
        answer = json.load(response)["choices"][0]["message"]["content"]
    return json.loads(answer[answer.index("{"):answer.rindex("}") + 1])  # a model may wrap the JSON in a fence
