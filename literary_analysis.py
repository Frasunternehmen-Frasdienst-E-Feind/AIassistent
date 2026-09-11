import os

import anthropic

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

response = client.messages.create(
    model="claude-opus-5",
    max_tokens=1024,
    thinking={"type": "adaptive"},
    system="You analyze literary works.",
    messages=[{"role": "user", "content": "Analyze the themes in Pride and Prejudice."}],
)

for block in response.content:
    if block.type == "text":
        print(block.text)
