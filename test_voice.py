from voice_client import VoiceClient
import time

def test_voice():
    print("Testing VoiceClient...")
    # API key is not needed for TTS only speak method if we mock or just don't call transcribe
    # But VoiceClient init requires it. we can pass dummy if we only use speak which uses edge-tts
    client = VoiceClient(api_key="dummy_key")
    
    text = "This is a test of the realistic voice generation using Edge TTS."
    client.speak(text)
    print("Voice test complete.")

if __name__ == "__main__":
    test_voice()
