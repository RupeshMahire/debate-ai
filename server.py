from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from debate_engine import DebateEngine
from llm_client import LLMClient
from memory import DebateMemory
from scoring import Scorer
from analysis import AnalysisManager
from voice_client import VoiceClient
import asyncio
import base64
import os
import tempfile
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("DebateServer")

app = FastAPI(title="Debate AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances (in a real app, manage functionality per session)
llm = None
try:
    llm = LLMClient()
    logger.info("LLM Client initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize LLM Client: {e}")
    logger.warning("Server will start but WebSocket connections may fail")

@app.get("/")
async def root():
    return {"message": "Debate AI API is running"}

@app.websocket("/ws/debate")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket connected")
    
    if not llm:
        logger.error("LLM not initialized, closing connection")
        await websocket.send_json({"type": "error", "message": "Server not properly initialized"})
        await websocket.close()
        return
    
    # Session state
    try:
        session_engine = DebateEngine(llm, DebateMemory(), Scorer(), AnalysisManager(llm))
        session_voice = VoiceClient(llm.api_key)
    except Exception as e:
        logger.error(f"Failed to initialize session: {e}")
        await websocket.send_json({"type": "error", "message": "Failed to initialize debate session"})
        await websocket.close()
        return
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message['type'] == 'setup':
                topic = message.get('topic')
                position = message.get('position', 'Pro')
                difficulty = int(message.get('difficulty', 1))
                
                session_engine.setup_debate(topic, position, difficulty)
                
                # Send initial system message or confirmation
                await websocket.send_json({
                    "type": "info",
                    "message": f"Debate started on '{topic}'. You are {position}."
                })
                
                # Get opening statement from AI if it's AI's turn (usually AI is Con if user is Pro)
                # But typically user starts. If needed, AI can start.
                # For now, wait for user input.
                
            elif message['type'] == 'user_audio':
                # Receive base64 audio chunk
                # In a real app, we'd stream this. For prototype, we might expect a full blob or chunks.
                # Let's assume client sends a "finished" flag or we process audio chunks.
                # Simpler for now: Client handles STT or sends text? 
                # PROMPT SAYS: "Implement a fully automated voice interaction loop"
                # Ideally: Client records -> STT (Client side or Server side) -> Text
                # Let's assume Client does STT for lower latency/utilizing browser API, 
                # OR sends audio blob for server whisper.
                pass

            elif message['type'] == 'user_text':
                user_input = message.get('text')
                
                # 1. Process Turn
                ai_response, fallacies, difficulty = session_engine.process_user_turn(user_input)
                
                # 2. Generate Audio (TTS)
                # We need to generate audio and stream it back.
                # VoiceClient.speak plays it locally. We need a method to get bytes.
                
                # Hack: Use VoiceClient to generate file, then read bytes
                temp_dir = tempfile.gettempdir()
                output_file = os.path.join(temp_dir, f"response_{os.urandom(4).hex()}.mp3")
                
                await session_voice._generate_audio(ai_response, output_file)
                
                # Read and send bytes
                with open(output_file, "rb") as f:
                    audio_bytes = f.read()
                    audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')
                
                # Clean up
                try:
                    os.remove(output_file)
                except:
                    pass
                
                # 3. Send Response
                await websocket.send_json({
                    "type": "ai_response",
                    "text": ai_response,
                    "audio": audio_b64,
                    "fallacies": fallacies,
                    "difficulty": difficulty
                })
                
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.close()
