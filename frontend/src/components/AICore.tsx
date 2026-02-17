'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sphere, MeshDistortMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { useDebateStore } from '@/store/debateStore'

export function AICore() {
    const meshRef = useRef<THREE.Mesh>(null)
    const { isAISpeaking, audioData } = useDebateStore()

    // Calculate intensity from audio data
    const intensity = useMemo(() => {
        if (!audioData || audioData.length === 0) return 0
        const sum = audioData.reduce((acc, val) => acc + val, 0)
        return sum / audioData.length / 255
    }, [audioData])

    useFrame((state) => {
        if (!meshRef.current) return

        const time = state.clock.getElapsedTime()

        // Idle rotation
        meshRef.current.rotation.x = Math.sin(time * 0.3) * 0.1
        meshRef.current.rotation.y += 0.005

        // Pulse based on audio or speaking state
        const basePulse = 1 + Math.sin(time * 2) * 0.05
        const audioPulse = isAISpeaking ? 1 + intensity * 0.3 : 1
        meshRef.current.scale.setScalar(basePulse * audioPulse)
    })

    return (
        <Sphere ref={meshRef} args={[1, 128, 128]}>
            <MeshDistortMaterial
                color={isAISpeaking ? "#00ffff" : "#0088ff"}
                attach="material"
                distort={isAISpeaking ? 0.4 + intensity * 0.3 : 0.2}
                speed={isAISpeaking ? 3 : 1}
                roughness={0.2}
                metalness={0.8}
                emissive={isAISpeaking ? "#00aaff" : "#004488"}
                emissiveIntensity={isAISpeaking ? 0.5 + intensity : 0.2}
            />
        </Sphere>
    )
}
