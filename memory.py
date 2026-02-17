class DebateMemory:
    def __init__(self):
        self.history = []

    def add_message(self, role, content):
        self.history.append({"role": role, "content": content})

    def get_messages(self):
        return self.history

    def get_transcript(self):
        transcript = ""
        for msg in self.history:
            role_name = "User" if msg["role"] == "user" else "AI"
            transcript += f"{role_name}: {msg['content']}\n\n"
        return transcript
