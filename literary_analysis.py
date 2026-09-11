import anthropic

client = anthropic.Anthropic()

response = client.messages.create(
    model="claude-opus-5",
    max_tokens=1024,
    system=[
        {
            "type": "text",
            "text": (
                "You are an AI assistant tasked with analyzing literary works. "
                "Your goal is to provide insightful commentary on themes, "
                "characters, and writing style."
            ),
            "cache_control": {"type": "ephemeral"},
        }
    ],
    messages=[
        {
            "role": "user",
            "content": "Analyze the major themes in 'Pride and Prejudice'.",
        }
    ],
)
print(response.usage.model_dump_json())
