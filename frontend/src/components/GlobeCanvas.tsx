import { useRef, useMemo, useState, useEffect, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Stars, Line } from '@react-three/drei'
import * as THREE from 'three'

const R = 2.4 // globe radius

// ── helpers ──────────────────────────────────────────────────────────────────
function ll2v3(lat: number, lon: number, r: number): THREE.Vector3 {
  const phi   = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta),
  )
}

// ── lat-lon grid ──────────────────────────────────────────────────────────────
function GlobeGrid() {
  const geo = useMemo(() => {
    const r = R + 0.012
    const v: number[] = []
    const step = 5

    for (let lat = -80; lat <= 80; lat += 20) {
      const phi = ((90 - lat) * Math.PI) / 180
      for (let lon = 0; lon < 360; lon += step) {
        const t1 = (lon * Math.PI) / 180
        const t2 = ((lon + step) * Math.PI) / 180
        v.push(
          -r*Math.sin(phi)*Math.cos(t1), r*Math.cos(phi), r*Math.sin(phi)*Math.sin(t1),
          -r*Math.sin(phi)*Math.cos(t2), r*Math.cos(phi), r*Math.sin(phi)*Math.sin(t2),
        )
      }
    }
    for (let lon = 0; lon < 360; lon += 20) {
      const theta = ((lon + 180) * Math.PI) / 180
      for (let lat = -85; lat < 85; lat += step) {
        const p1 = ((90 - lat) * Math.PI) / 180
        const p2 = ((90 - lat - step) * Math.PI) / 180
        v.push(
          -r*Math.sin(p1)*Math.cos(theta), r*Math.cos(p1), r*Math.sin(p1)*Math.sin(theta),
          -r*Math.sin(p2)*Math.cos(theta), r*Math.cos(p2), r*Math.sin(p2)*Math.sin(theta),
        )
      }
    }

    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3))
    return g
  }, [])

  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#7C3AED" transparent opacity={0.18}
        blending={THREE.AdditiveBlending} depthWrite={false} />
    </lineSegments>
  )
}

// ── atmosphere ────────────────────────────────────────────────────────────────
function Atmosphere() {
  return (
    <>
      <mesh>
        <sphereGeometry args={[R * 1.08, 48, 48]} />
        <meshBasicMaterial color="#7C3AED" transparent opacity={0.09}
          blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.BackSide} />
      </mesh>
      <mesh>
        <sphereGeometry args={[R * 1.22, 48, 48]} />
        <meshBasicMaterial color="#3B82F6" transparent opacity={0.04}
          blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.BackSide} />
      </mesh>
      <mesh>
        <sphereGeometry args={[R * 1.04, 48, 48]} />
        <meshBasicMaterial color="#A855F7" transparent opacity={0.05}
          blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.FrontSide} />
      </mesh>
    </>
  )
}

// ── research node ─────────────────────────────────────────────────────────────
function ResearchNode({ lat, lon, phase }: { lat: number; lon: number; phase: number }) {
  const dotRef  = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const pos = useMemo(() => ll2v3(lat, lon, R + 0.025), [lat, lon])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 1.6 + phase
    if (dotRef.current) {
      dotRef.current.scale.setScalar(1 + Math.sin(t) * 0.45)
      ;(dotRef.current.material as THREE.MeshBasicMaterial).opacity = 0.55 + Math.sin(t) * 0.3
    }
    if (ringRef.current) {
      const s = 1 + ((Math.sin(t) + 1) / 2) * 2.2
      ringRef.current.scale.setScalar(s)
      ;(ringRef.current.material as THREE.MeshBasicMaterial).opacity =
        (1 - (Math.sin(t) + 1) / 2) * 0.45
    }
  })

  return (
    <group position={pos}>
      <mesh ref={dotRef}>
        <sphereGeometry args={[0.028, 8, 8]} />
        <meshBasicMaterial color="#C084FC" transparent opacity={0.85}
          blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.022, 0.045, 16]} />
        <meshBasicMaterial color="#7C3AED" transparent opacity={0.5}
          blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// ── connection arc ────────────────────────────────────────────────────────────
function Arc({ a, b, delay }: { a: [number,number]; b: [number,number]; delay: number }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  const pts = useMemo(() => {
    const p1 = ll2v3(a[0], a[1], R + 0.025)
    const p2 = ll2v3(b[0], b[1], R + 0.025)
    const mid = p1.clone().add(p2).normalize().multiplyScalar(R + 1.0)
    return new THREE.QuadraticBezierCurve3(p1, mid, p2).getPoints(60)
  }, [a, b])

  if (!show) return null

  return (
    <Line points={pts} color="#7C3AED" lineWidth={0.7}
      transparent opacity={0.45} blending={THREE.AdditiveBlending} />
  )
}

// ── orbiting particles ────────────────────────────────────────────────────────
function Particles() {
  const ref = useRef<THREE.Points>(null)

  const pos = useMemo(() => {
    const arr = new Float32Array(300 * 3)
    for (let i = 0; i < 300; i++) {
      const r = R + 0.2 + Math.random() * 1.3
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      arr[i*3]   = r * Math.sin(phi) * Math.cos(theta)
      arr[i*3+1] = r * Math.sin(phi) * Math.sin(theta)
      arr[i*3+2] = r * Math.cos(phi)
    }
    return arr
  }, [])

  useFrame((_, dt) => {
    if (ref.current) {
      ref.current.rotation.y += dt * 0.05
      ref.current.rotation.x += dt * 0.012
    }
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[pos, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.016} color="#A855F7" transparent opacity={0.55}
        blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation />
    </points>
  )
}

// ── scene data ────────────────────────────────────────────────────────────────
const HUBS: [number, number][] = [
  [42.3, -71.1], [51.5, -0.1],  [48.1, 11.6],  [35.7, 139.7],
  [39.9, 116.4], [-33.9, 151.2],[1.4,  103.8],  [37.8, -122.4],
  [19.1, 72.9],  [55.8, 37.6],
]
const ARCS: [number,number][] = [
  [0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0],[1,8],[3,9],[0,4],[2,6],
]

// ── main scene ────────────────────────────────────────────────────────────────
function Scene({ mouse }: { mouse: { x: number; y: number } }) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((_, dt) => {
    if (!groupRef.current) return
    groupRef.current.rotation.y += dt * 0.09
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x, mouse.y * 0.22, 0.05,
    )
  })

  return (
    <>
      <ambientLight intensity={0.15} />
      <directionalLight position={[4, 3, 4]}  intensity={0.9} color="#9333EA" />
      <directionalLight position={[-4,-3,-4]} intensity={0.4} color="#3B82F6" />
      <pointLight position={[0, 0, 8]} intensity={0.6} color="#7C3AED" distance={20} />

      <Stars radius={90} depth={60} count={6000} factor={3} saturation={0.6} fade speed={0.4} />

      <group ref={groupRef}>
        {/* Globe body */}
        <mesh>
          <sphereGeometry args={[R, 64, 64]} />
          <meshStandardMaterial
            color="#050e1f" metalness={0.5} roughness={0.6}
            emissive="#0d1b38" emissiveIntensity={0.35} />
        </mesh>

        <GlobeGrid />
        <Atmosphere />

        {HUBS.map(([lat, lon], i) => (
          <ResearchNode key={i} lat={lat} lon={lon} phase={i * 0.78} />
        ))}

        {ARCS.map(([a, b], i) => (
          <Arc key={i} a={HUBS[a]} b={HUBS[b]} delay={i * 350} />
        ))}

        <Particles />
      </group>
    </>
  )
}

// ── canvas export ─────────────────────────────────────────────────────────────
export default function GlobeCanvas({ mouse }: { mouse: { x: number; y: number } }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 7], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
      dpr={[1, 2]}
    >
      <Suspense fallback={null}>
        <Scene mouse={mouse} />
      </Suspense>
    </Canvas>
  )
}
