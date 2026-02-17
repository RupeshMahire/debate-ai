import { create } from 'zustand'

interface Message {
    role: 'user' | 'ai' | 'system'
    text: string
    timestamp: number
}

interface DebateStore {
    ws: WebSocket | null
    connected: boolean
    messages: Message[]
    isRecording: boolean
    isAISpeaking: boolean
    isPaused: boolean
    topic: string
    position: string
    difficulty: number
    audioData: Uint8Array | null

    setWs: (ws: WebSocket | null) => void
    setConnected: (connected: boolean) => void
    addMessage: (message: Message) => void
    setRecording: (recording: boolean) => void
    setAISpeaking: (speaking: boolean) => void
    setPaused: (paused: boolean) => void
    setTopic: (topic: string) => void
    setPosition: (position: string) => void
    setDifficulty: (difficulty: number) => void
    setAudioData: (data: Uint8Array | null) => void
}

export const useDebateStore = create<DebateStore>((set) => ({
    ws: null,
    connected: false,
    messages: [],
    isRecording: false,
    isAISpeaking: false,
    isPaused: false,
    topic: '',
    position: 'Pro',
    difficulty: 1,
    audioData: null,

    setWs: (ws) => set({ ws }),
    setConnected: (connected) => set({ connected }),
    addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
    setRecording: (recording) => set({ isRecording: recording }),
    setAISpeaking: (speaking) => set({ isAISpeaking: speaking }),
    setPaused: (paused) => set({ isPaused: paused }),
    setTopic: (topic) => set({ topic }),
    setPosition: (position) => set({ position }),
    setDifficulty: (difficulty) => set({ difficulty }),
    setAudioData: (data) => set({ audioData: data }),
}))
