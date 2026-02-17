import os
import requests
import tempfile
import asyncio
import edge_tts

class VoiceClient:
    def __init__(self, api_key):
        self.api_key = api_key
        self.stt_url = "https://api.groq.com/openai/v1/audio/transcriptions"
        self.model = "whisper-large-v3"
        self.voice = "en-US-ChristopherNeural" # Realistic male voice
        # self.voice = "en-US-AriaNeural" # Realistic female voice
        
    def record_audio(self, duration=5, fs=44100):
        try:
            import sounddevice as sd
            import numpy as np
            from scipy.io.wavfile import write
        except ImportError:
            print("[!] Audio recording libraries (sounddevice, numpy, scipy) not installed.")
            return None

        print(f"\n[Recording for {duration} seconds... Speak now!]")
        recording = sd.rec(int(duration * fs), samplerate=fs, channels=1)
        sd.wait()
        print("[Recording finished]")
        
        # Save to temp file
        temp_dir = tempfile.gettempdir()
        temp_path = os.path.join(temp_dir, "debate_input.wav")
        write(temp_path, fs, recording)
        return temp_path

    def transcribe(self, audio_path):
        headers = {
            "Authorization": f"Bearer {self.api_key}"
        }
        
        files = {
            'file': (os.path.basename(audio_path), open(audio_path, 'rb'), 'audio/wav'),
            'model': (None, self.model)
        }

        try:
            response = requests.post(self.stt_url, headers=headers, files=files)
            response.raise_for_status()
            result = response.json()
            return result.get('text', "")
        except Exception as e:
            return f"Error transcribing audio: {str(e)}"
        finally:
            files['file'][1].close()

    async def _generate_audio(self, text, output_file):
        communicate = edge_tts.Communicate(text, self.voice)
        await communicate.save(output_file)

    def speak(self, text):
        print(f"\n[AI is speaking...]")
        try:
            # Create a temporary file for the mp3
            temp_dir = tempfile.gettempdir()
            output_file = os.path.join(temp_dir, "debate_response.mp3")
            
            # Remove previous file if exists to avoid access errors
            if os.path.exists(output_file):
                try:
                    os.remove(output_file)
                except:
                    pass

            # Run async edge-tts generation
            asyncio.run(self._generate_audio(text, output_file))
            
            # Play using available method
            try:
                import playsound
                playsound.playsound(output_file)
            except (ImportError, Exception) as error:
                # Fallback to system default player or skip if headless
                if hasattr(os, 'startfile'):
                    print(f"[!] playsound failed or not found: {error}. Opening with system player...")
                    os.startfile(output_file)
                else:
                    print(f"[!] Audio playback not supported in this environment: {error}")
            
        except Exception as e:
            print(f"TTS Error: {e}")
