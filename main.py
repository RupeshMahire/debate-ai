import sys
from llm_client import LLMClient
from memory import DebateMemory
from scoring import Scorer
from analysis import AnalysisManager
from debate_engine import DebateEngine

def print_banner():
    print("\n" + "="*50)
    print("      🔥 DEBATE.AI – LOCAL PROTOTYPE 🔥")
    print("="*50 + "\n")

def main():
    print_banner()
    
    try:
        llm = LLMClient()
    except ValueError as e:
        print(f"ERROR: {e}")
        sys.exit(1)

    memory = DebateMemory()
    scorer = Scorer()
    analysis = AnalysisManager(llm)
    engine = DebateEngine(llm, memory, scorer, analysis)

    topic = input("Enter debate topic: ")
    position = input("Enter your position (Pro/Con): ")
    while position.lower() not in ["pro", "con"]:
        position = input("Please enter 'Pro' or 'Con': ")
    
    try:
        difficulty = int(input("Enter difficulty level (1-5): "))
        if not (1 <= difficulty <= 5):
            raise ValueError
    except ValueError:
        print("Invalid difficulty. Defaulting to 1.")
        difficulty = 1

    engine.setup_debate(topic, position, difficulty)
    
    use_voice = input("Enable Voice Mode? (y/n): ").lower() == 'y'
    if use_voice:
        from voice_client import VoiceClient
        voice_client = VoiceClient(llm.api_key)
        print("[Voice Mode Enabled]")
    
    print(f"\nDebate Started: {topic}")
    print(f"You are: {position.upper()}")
    print(f"AI is: {'CON' if position.lower() == 'pro' else 'PRO'}")
    print("Type 'exit' to end the debate.\n")

    while True:
        if use_voice:
            input("Press Enter to start recording your argument...")
            audio_file = voice_client.record_audio(duration=7)
            user_input = voice_client.transcribe(audio_file)
            print(f"You (Transcribed): {user_input}")
            if user_input.lower().strip() == 'exit.' or user_input.lower().strip() == 'exit':
                break
        else:
            user_input = input("You: ")
            if user_input.lower() == 'exit':
                break
        
        if not user_input.strip():
            continue

        print("\n[AI is thinking...]")
        ai_response, fallacies, current_diff = engine.process_user_turn(user_input)
        
        print(f"\nFallacy Detection: {fallacies}")
        print(f"Current Difficulty: {current_diff}/5")
        print(f"\nAI Opponent: {ai_response}\n")
        
        if use_voice:
            voice_client.speak(ai_response)

    print("\n" + "="*50)
    print("      POST-DEBATE ANALYSIS")
    print("="*50)
    analysis_text = engine.end_debate()
    print(analysis_text)
    
    if use_voice:
        voice_client.speak("The debate has ended. Here is your evaluation.")
    print("\nThank you for using Debate.ai!")

if __name__ == "__main__":
    main()
