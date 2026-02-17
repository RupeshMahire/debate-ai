'use client'

import { useRef, useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { motion } from 'framer-motion'
import { Mic, MicOff, Play, Pause, Settings, Bot } from 'lucide-react'
import { AICore } from './AICore'
import { AudioVisualizer } from './AudioVisualizer'
import { useDebateStore } from '@/store/debateStore'
import { cn } from '@/lib/utils'

export function DebateInterface() {
    const {
        ws,
        connected,
        messages,
        isRecording,
        isAISpeaking,
        isPaused,
        topic,
        position,
        difficulty,
        setWs,
        setConnected,
        addMessage,
        setRecording,
        setAISpeaking,
        setPaused,
        setTopic,
        setPosition,
        setDifficulty,
        setAudioData,
    } = useDebateStore()

    const [showSetup, setShowSetup] = useState(true)
    const [mounted, setMounted] = useState(false)
    const audioContextRef = useRef<AudioContext | null>(null)
    const recognitionRef = useRef<any>(null)
    const currentAudioRef = useRef<HTMLAudioElement | null>(null)

    // Hydration guard
    useEffect(() => {
        setMounted(true)
    }, [])

    // Play audio from base64
    const playAudio = async (base64Audio: string) => {
        // Stop any currently playing audio
        if (currentAudioRef.current) {
            currentAudioRef.current.pause()
            currentAudioRef.current.src = ""
            currentAudioRef.current = null
        }

        const audioBlob = base64ToBlob(base64Audio, 'audio/mp3')
        const audioUrl = URL.createObjectURL(audioBlob)
        const audio = new Audio(audioUrl)
        currentAudioRef.current = audio

        // Setup audio analysis
        if (!audioContextRef.current) {
            audioContextRef.current = new AudioContext()
        }

        const source = audioContextRef.current.createMediaElementSource(audio)
        const analyser = audioContextRef.current.createAnalyser()
        analyser.fftSize = 256

        source.connect(analyser)
        analyser.connect(audioContextRef.current.destination)

        const dataArray = new Uint8Array(analyser.frequencyBinCount)

        const updateAudioData = () => {
            analyser.getByteFrequencyData(dataArray)
            setAudioData(dataArray)

            if (!audio.paused) {
                requestAnimationFrame(updateAudioData)
            }
        }

        audio.play()
        updateAudioData()

        return new Promise<void>((resolve) => {
            audio.onended = () => {
                setAudioData(null)
                URL.revokeObjectURL(audioUrl)
                currentAudioRef.current = null
                resolve()
            }
        })
    }

    // Start debate
    const startDebate = () => {
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'wss://debate-ai.onrender.com/ws/debate'
        const socket = new WebSocket(wsUrl)

        socket.onopen = () => {
            console.log('WebSocket connected')
            setConnected(true)
            setWs(socket)

            // Send setup message after connection is established
            socket.send(JSON.stringify({
                type: 'setup',
                topic,
                position,
                difficulty,
            }))
        }

        socket.onmessage = async (event) => {
            const data = JSON.parse(event.data)

            if (data.type === 'info') {
                addMessage({ role: 'system', text: data.message, timestamp: Date.now() })
            } else if (data.type === 'ai_response') {
                addMessage({ role: 'ai', text: data.text, timestamp: Date.now() })

                // Play audio
                if (data.audio) {
                    setAISpeaking(true)
                    await playAudio(data.audio)
                    setAISpeaking(false)
                }
            }
        }

        socket.onclose = () => {
            console.log('WebSocket disconnected')
            setConnected(false)
            setWs(null)
        }

        socket.onerror = (error) => {
            console.error('WebSocket error:', error)
        }

        setShowSetup(false)
    }

    // Start recording with Web Speech API
    const startRecording = async () => {
        try {
            // Check browser support
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

            if (!SpeechRecognition) {
                alert('Speech recognition is not supported in your browser. Please use Chrome.')
                return
            }

            // Get microphone for visualization
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

            if (!audioContextRef.current) {
                audioContextRef.current = new AudioContext()
            }

            const source = audioContextRef.current.createMediaStreamSource(stream)
            const analyser = audioContextRef.current.createAnalyser()
            analyser.fftSize = 256

            source.connect(analyser)

            const dataArray = new Uint8Array(analyser.frequencyBinCount)

            const updateRecordingData = () => {
                if (!isRecording) return
                analyser.getByteFrequencyData(dataArray)
                setAudioData(dataArray)
                requestAnimationFrame(updateRecordingData)
            }

            // Start speech recognition
            const recognition = new SpeechRecognition()
            recognitionRef.current = recognition
            recognition.continuous = false
            recognition.interimResults = false
            recognition.lang = 'en-US'

            recognition.onstart = () => {
                console.log('Speech recognition started - speak now!')
                setRecording(true)
                updateRecordingData()
            }

            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript
                console.log('Transcribed:', transcript)

                if (transcript && ws) {
                    addMessage({ role: 'user', text: transcript, timestamp: Date.now() })
                    ws.send(JSON.stringify({
                        type: 'user_text',
                        text: transcript,
                    }))
                }
            }

            recognition.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error)

                // Provide user-friendly error messages
                let errorMessage = 'Speech recognition error occurred.'
                switch (event.error) {
                    case 'no-speech':
                        errorMessage = 'No speech detected. Please try again and speak clearly.'
                        break
                    case 'audio-capture':
                        errorMessage = 'No microphone detected. Please check your audio input device.'
                        break
                    case 'not-allowed':
                        errorMessage = 'Microphone access denied. Please grant permission in your browser settings.'
                        break
                    case 'network':
                        errorMessage = 'Network error occurred. Please check your connection.'
                        break
                    case 'aborted':
                        // User stopped recording, don't show error
                        break
                    default:
                        errorMessage = `Speech recognition error: ${event.error}`
                }

                if (event.error !== 'aborted' && errorMessage) {
                    addMessage({ role: 'system', text: errorMessage, timestamp: Date.now() })
                }

                setRecording(false)
                setAudioData(null)
                stream.getTracks().forEach(track => track.stop())
            }

            recognition.onend = () => {
                console.log('Speech recognition ended')
                setRecording(false)
                setAudioData(null)
                stream.getTracks().forEach(track => track.stop())
            }

            recognition.start()

        } catch (error) {
            console.error('Error starting recording:', error)
            alert('Error accessing microphone. Please grant permission.')
        }
    }

    const stopRecording = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop()
        }
        setRecording(false)
        setAudioData(null)
    }

    // Trigger AI opponent to speak
    const triggerAIResponse = () => {
        if (ws && connected && !isPaused && !isAISpeaking) {
            // Send a request for AI to make an opening statement or continue the debate
            ws.send(JSON.stringify({
                type: 'user_text',
                text: '[AI_TURN]', // Special marker for AI to take initiative
            }))
            addMessage({ role: 'system', text: 'Requesting AI response...', timestamp: Date.now() })
        }
    }

    // Helper function
    const base64ToBlob = (base64: string, type: string) => {
        const byteCharacters = atob(base64)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        return new Blob([byteArray], { type })
    }

    if (!mounted) return null

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-black text-white">
            {/* Setup Modal */}
            {showSetup && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-gray-800/90 backdrop-blur-md p-8 rounded-2xl border border-cyan-500/30 max-w-md w-full"
                    >
                        <h2 className="text-3xl font-bold mb-6 text-cyan-400">Setup Debate</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Topic</label>
                                <input
                                    type="text"
                                    value={topic || ''}
                                    onChange={(e) => setTopic(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-700/50 border border-cyan-500/30 rounded-lg focus:outline-none focus:border-cyan-400"
                                    placeholder="Enter debate topic..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Your Position</label>
                                <select
                                    value={position}
                                    onChange={(e) => setPosition(e.target.value)}
                                    aria-label="Select your debate position"
                                    title="Choose Pro or Con position"
                                    className="w-full px-4 py-2 bg-gray-700/50 border border-cyan-500/30 rounded-lg focus:outline-none focus:border-cyan-400"
                                >
                                    <option value="Pro">Pro</option>
                                    <option value="Con">Con</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Difficulty (1-5)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="5"
                                    value={isNaN(difficulty) ? '' : difficulty}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        setDifficulty(isNaN(val) ? 1 : val);
                                    }}
                                    aria-label="Debate difficulty level"
                                    title="Set difficulty from 1 to 5"
                                    placeholder="1-5"
                                    className="w-full px-4 py-2 bg-gray-700/50 border border-cyan-500/30 rounded-lg focus:outline-none focus:border-cyan-400"
                                />
                            </div>

                            <button
                                onClick={startDebate}
                                className="w-full px-6 py-3 bg-cyan-500 hover:bg-cyan-600 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                            >
                                <Play size={20} />
                                Start Debate
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {/* Main Interface */}
            <div className="container mx-auto px-4 py-8">
                <motion.h1
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-5xl font-bold text-center mb-8 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent"
                >
                    Debate AI
                </motion.h1>

                {/* 3D AI Core */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="w-full h-96 mb-8 rounded-2xl overflow-hidden border border-cyan-500/30 bg-black/20 backdrop-blur-sm"
                >
                    <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
                        <ambientLight intensity={0.5} />
                        <pointLight position={[10, 10, 10]} intensity={1} />
                        <AICore />
                        <OrbitControls enableZoom={false} enablePan={false} />
                        <Environment preset="night" />
                    </Canvas>
                </motion.div>

                {/* Audio Visualizer */}
                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="mb-8"
                >
                    <AudioVisualizer />
                </motion.div>

                {/* Controls */}
                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="flex justify-center gap-4 mb-8 flex-wrap"
                >
                    <button
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={isAISpeaking || isPaused}
                        className={cn(
                            "px-8 py-4 rounded-full font-semibold transition-all flex items-center gap-3",
                            isRecording
                                ? "bg-red-500 hover:bg-red-600 animate-pulse"
                                : "bg-cyan-500 hover:bg-cyan-600",
                            (isAISpeaking || isPaused) && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        {isRecording ? <MicOff size={24} /> : <Mic size={24} />}
                        {isRecording ? "Stop Recording" : "Start Speaking"}
                    </button>

                    {connected && (
                        <>
                            {!isPaused ? (
                                <button
                                    onClick={() => {
                                        setPaused(true)
                                        if (isRecording) stopRecording()

                                        // Stop and clear audio if AI is speaking
                                        if (currentAudioRef.current) {
                                            currentAudioRef.current.pause()
                                            currentAudioRef.current.src = ""
                                            currentAudioRef.current = null
                                        }
                                        setAISpeaking(false)
                                        setAudioData(null)

                                        addMessage({ role: 'system', text: 'AI opponent stopped', timestamp: Date.now() })
                                    }}
                                    aria-label="Stop AI opponent"
                                    title="Stop the AI opponent from speaking"
                                    className="px-6 py-4 rounded-full bg-red-500 hover:bg-red-600 transition-colors flex items-center gap-2"
                                >
                                    <Pause size={24} />
                                    Stop AI
                                </button>
                            ) : (
                                <button
                                    onClick={() => {
                                        setPaused(false)
                                        addMessage({ role: 'system', text: 'AI opponent resumed', timestamp: Date.now() })
                                        // Trigger AI to speak when resumed
                                        triggerAIResponse()
                                    }}
                                    aria-label="Resume AI opponent"
                                    title="Allow AI opponent to continue"
                                    className="px-6 py-4 rounded-full bg-green-500 hover:bg-green-600 transition-colors flex items-center gap-2"
                                >
                                    <Play size={24} />
                                    Resume AI
                                </button>
                            )}
                        </>
                    )}

                    <button
                        onClick={() => setShowSetup(true)}
                        aria-label="Open settings"
                        title="Configure debate settings"
                        className="px-6 py-4 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
                    >
                        <Settings size={24} />
                    </button>
                </motion.div>

                {/* Messages */}
                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="max-w-3xl mx-auto space-y-4"
                >
                    {messages.map((msg, i) => (
                        <motion.div
                            key={i}
                            initial={{ x: msg.role === 'user' ? 50 : -50, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className={cn(
                                "p-4 rounded-lg backdrop-blur-sm",
                                msg.role === 'user'
                                    ? "bg-cyan-500/20 border border-cyan-500/30 ml-auto max-w-[80%]"
                                    : msg.role === 'ai'
                                        ? "bg-blue-500/20 border border-blue-500/30 mr-auto max-w-[80%]"
                                        : "bg-gray-500/20 border border-gray-500/30 text-center text-sm"
                            )}
                        >
                            <p className="text-sm font-semibold mb-1">
                                {msg.role === 'user' ? 'You' : msg.role === 'ai' ? 'AI' : 'System'}
                            </p>
                            <p>{msg.text}</p>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </div>
    )
}
