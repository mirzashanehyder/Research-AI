import { useRef, useMemo, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import * as THREE from 'three'

function Galaxy({ mouse }: { mouse: { x: number; y: number } }) {
  const ref = useRef<THREE.Points>(null)
  const coreRef = useRef<THREE.Points>(null)
  const groupRef = useRef<THREE.Group>(null)

  const { positions, colors } = useMemo(() => {
    const count = 9000
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    const arms = 3
    for (let i = 0; i < count; i++) {
      const arm = Math.floor(Math.random() * arms)
      const t = Math.random()
      const angle = t * Math.PI * 6 + (arm / arms) * Math.PI * 2
      const radius = t * 4.5 + 0.3
      const spread = (1 - t) * 0.7 + 0.05
      const x = Math.cos(angle) * radius + (Math.random() - 0.5) * spread
      const y = (Math.random() - 0.5) * spread * 0.4
      const z = Math.sin(angle) * radius + (Math.random() - 0.5) * spread
      pos[i * 3]     = x
      pos[i * 3 + 1] = y
      pos[i * 3 + 2] = z
      // color gradient: inner violet→blue, outer cyan→white
      const blend = Math.min(radius / 4.5, 1)
      if (arm === 0) { col[i*3]=0.55+blend*0.4; col[i*3+1]=0.2+blend*0.7; col[i*3+2]=1 }
      else if (arm === 1) { col[i*3]=0.48+blend*0.5; col[i*3+1]=0.1+blend*0.8; col[i*3+2]=0.9+blend*0.1 }
      else { col[i*3]=0.2+blend*0.6; col[i*3+1]=0.5+blend*0.4; col[i*3+2]=1 }
    }
    return { positions: pos, colors: col }
  }, [])

  const corePositions = useMemo(() => {
    const count = 2500
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r = Math.pow(Math.random(), 2) * 1.2
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      pos[i*3]   = r * Math.sin(phi) * Math.cos(theta)
      pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta) * 0.3
      pos[i*3+2] = r * Math.cos(phi)
    }
    return pos
  }, [])

  useFrame((_, dt) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += dt * 0.04
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x, mouse.y * 0.18, 0.04
      )
      groupRef.current.rotation.z = THREE.MathUtils.lerp(
        groupRef.current.rotation.z, mouse.x * -0.06, 0.04
      )
    }
    if (coreRef.current) {
      ;(coreRef.current.material as THREE.PointsMaterial).size =
        0.022 + Math.sin(Date.now() * 0.002) * 0.004
    }
  })

  return (
    <group ref={groupRef} rotation={[0.4, 0, 0]}>
      <points ref={ref}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.018} vertexColors transparent opacity={0.88}
          blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation />
      </points>
      <points ref={coreRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[corePositions, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.024} color="#C084FC" transparent opacity={0.9}
          blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation />
      </points>
      {/* core glow */}
      <mesh>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshBasicMaterial color="#7C3AED" transparent opacity={0.12}
          blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshBasicMaterial color="#A855F7" transparent opacity={0.22}
          blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

export default function GalaxyCanvas({ mouse }: { mouse: { x: number; y: number } }) {
  return (
    <Canvas camera={{ position: [0, 4.5, 7], fov: 50 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
      dpr={[1, 1.8]}>
      <Suspense fallback={null}>
        <Stars radius={120} depth={80} count={8000} factor={4} saturation={0.7} fade speed={0.3} />
        <Galaxy mouse={mouse} />
      </Suspense>
    </Canvas>
  )
}
