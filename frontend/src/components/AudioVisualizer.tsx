'use client'

import { useEffect, useRef } from 'react'
import { useDebateStore } from '@/store/debateStore'

export function AudioVisualizer() {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const { audioData, isAISpeaking } = useDebateStore()

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let animationFrameId: number

        const draw = () => {
            const width = canvas.width
            const height = canvas.height

            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
            ctx.fillRect(0, 0, width, height)

            if (!audioData || audioData.length === 0) {
                animationFrameId = requestAnimationFrame(draw)
                return
            }

            const barWidth = width / audioData.length
            const gradient = ctx.createLinearGradient(0, 0, 0, height)
            gradient.addColorStop(0, isAISpeaking ? '#00ffff' : '#0088ff')
            gradient.addColorStop(1, isAISpeaking ? '#0088ff' : '#004488')

            ctx.fillStyle = gradient

            for (let i = 0; i < audioData.length; i++) {
                const barHeight = (audioData[i] / 255) * height * 0.8
                const x = i * barWidth
                const y = height - barHeight

                ctx.fillRect(x, y, barWidth - 1, barHeight)
            }

            animationFrameId = requestAnimationFrame(draw)
        }

        draw()

        return () => {
            cancelAnimationFrame(animationFrameId)
        }
    }, [audioData, isAISpeaking])

    return (
        <canvas
            ref={canvasRef}
            width={800}
            height={200}
            className="w-full h-32 rounded-lg bg-black/20 backdrop-blur-sm"
        />
    )
}
