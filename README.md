# Debate.ai – Local Functional Prototype

A local terminal-based debate system where you can challenge an AI opponent on any topic in real-time.

## Features
- **Real-time Debate**: Turn-based CLI interaction.
- **AI Opponent**: Powered by OpenRouter (LLaMA 3.1 8b).
- **Dynamic Difficulty**: Argument quality heuristic scaling.
- **Fallacy Detection**: AI-powered analysis of user arguments.
- **Voice Mode**: One-to-one voice debate usage Whisper (STT) and local TTS.
- **Post-Debate Summary**: Comprehensive evaluation of your performance.

## Project Structure
```
debate_ai/
├── main.py                 # CLI entry point
├── llm_client.py           # OpenRouter API wrapper
├── debate_engine.py        # Debate turn logic
├── scoring.py              # Argument quality scoring
├── analysis.py             # Fallacy detection & post-debate analysis
├── memory.py               # Debate transcript handling
├── prompts/                # System and analysis prompts
└── README.md
```

## Setup Instructions

1. **Install Requirements**:
   ```bash
   pip install requests sounddevice numpy scipy pyttsx3
   ```

2. **Set API Key**:
   Obtain an API key from [OpenRouter](https://openrouter.ai/).
   Set it as an environment variable:
   ```powershell
   # Windows PowerShell
   $env:OPENROUTER_API_KEY = "your_key_here"
   ```

3. **Run the Prototype**:
   ```bash
   python main.py
   ```

## Example Session
1. Enter topic: "The use of AI in creative arts is detrimental to human artists."
2. Choose position: "Pro"
3. AI takes "Con" position and responds to your arguments while checking for logical fallacies.
4. Type `exit` to see the final analysis.
"# debate-ai" 
"# debate-ai" 
