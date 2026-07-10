import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const NODE_COUNT = 120
const CONNECTION_DIST = 12
const MAX_LINES = NODE_COUNT * 6

// Persistent 3D backdrop rendered once at the app root, behind every screen
// (login, task list, task detail). Mounting it here instead of per-page means
// navigating between routes never tears down/recreates the WebGL context.
export function SiteBackgroundCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x000000, 0)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.set(0, 0, 30)

    const positions = []
    for (let i = 0; i < NODE_COUNT; i++) {
      positions.push({
        x: (Math.random() - 0.5) * 80,
        y: (Math.random() - 0.5) * 50,
        z: (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 0.03,
        vy: (Math.random() - 0.5) * 0.02,
        vz: (Math.random() - 0.5) * 0.01,
      })
    }

    const pointGeo = new THREE.BufferGeometry()
    const pointPositions = new Float32Array(NODE_COUNT * 3)
    const pointColors = new Float32Array(NODE_COUNT * 3)
    for (let i = 0; i < NODE_COUNT; i++) {
      pointPositions[i * 3] = positions[i].x
      pointPositions[i * 3 + 1] = positions[i].y
      pointPositions[i * 3 + 2] = positions[i].z
      pointColors[i * 3] = 0.18
      pointColors[i * 3 + 1] = 0.35
      pointColors[i * 3 + 2] = 0.92
    }
    pointGeo.setAttribute('position', new THREE.BufferAttribute(pointPositions, 3))
    pointGeo.setAttribute('color', new THREE.BufferAttribute(pointColors, 3))

    const pointMat = new THREE.PointsMaterial({
      size: 0.35,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
    })
    const points = new THREE.Points(pointGeo, pointMat)
    scene.add(points)

    const lineGeo = new THREE.BufferGeometry()
    const linePos = new Float32Array(MAX_LINES * 2 * 3)
    const lineCol = new Float32Array(MAX_LINES * 2 * 3)
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3))
    lineGeo.setAttribute('color', new THREE.BufferAttribute(lineCol, 3))
    const lineMaterial = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.25 })
    const lineSegments = new THREE.LineSegments(lineGeo, lineMaterial)
    scene.add(lineSegments)

    let mx = 0
    let my = 0
    const handleMouseMove = (e) => {
      mx = (e.clientX / window.innerWidth - 0.5) * 0.5
      my = (e.clientY / window.innerHeight - 0.5) * 0.3
    }
    document.addEventListener('mousemove', handleMouseMove)

    function updateLines() {
      let lineIdx = 0
      for (let i = 0; i < NODE_COUNT; i++) {
        for (let j = i + 1; j < NODE_COUNT; j++) {
          if (lineIdx >= MAX_LINES) break
          const dx = positions[i].x - positions[j].x
          const dy = positions[i].y - positions[j].y
          const dz = positions[i].z - positions[j].z
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
          if (dist < CONNECTION_DIST) {
            const alpha = 1 - dist / CONNECTION_DIST
            const base = lineIdx * 6
            linePos[base] = positions[i].x
            linePos[base + 1] = positions[i].y
            linePos[base + 2] = positions[i].z
            linePos[base + 3] = positions[j].x
            linePos[base + 4] = positions[j].y
            linePos[base + 5] = positions[j].z
            lineCol[base] = 0.18 * alpha
            lineCol[base + 1] = 0.35 * alpha
            lineCol[base + 2] = 0.92 * alpha
            lineCol[base + 3] = 0.18 * alpha
            lineCol[base + 4] = 0.35 * alpha
            lineCol[base + 5] = 0.92 * alpha
            lineIdx++
          }
        }
      }
      lineGeo.setDrawRange(0, lineIdx * 2)
      lineGeo.attributes.position.needsUpdate = true
      lineGeo.attributes.color.needsUpdate = true
    }

    let frameId
    let running = true
    function animate() {
      if (!running) return
      frameId = requestAnimationFrame(animate)
      for (let i = 0; i < NODE_COUNT; i++) {
        const p = positions[i]
        p.x += p.vx
        p.y += p.vy
        p.z += p.vz
        if (Math.abs(p.x) > 40) p.vx *= -1
        if (Math.abs(p.y) > 25) p.vy *= -1
        if (Math.abs(p.z) > 15) p.vz *= -1
        pointPositions[i * 3] = p.x
        pointPositions[i * 3 + 1] = p.y
        pointPositions[i * 3 + 2] = p.z
      }
      pointGeo.attributes.position.needsUpdate = true
      updateLines()
      camera.position.x += (mx * 4 - camera.position.x) * 0.04
      camera.position.y += (-my * 3 - camera.position.y) * 0.04
      camera.lookAt(0, 0, 0)
      renderer.render(scene, camera)
    }
    animate()

    // Stop rendering while the tab/app is backgrounded (phone screen off,
    // switched app) - this is the one place a continuous WebGL loop run
    // across the whole site actually matters for battery, and it costs
    // nothing visually since nobody's looking at it while hidden.
    const handleVisibility = () => {
      running = !document.hidden
      if (running) animate()
      else cancelAnimationFrame(frameId)
    }
    document.addEventListener('visibilitychange', handleVisibility)

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      running = false
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('visibilitychange', handleVisibility)
      pointGeo.dispose()
      pointMat.dispose()
      lineGeo.dispose()
      lineMaterial.dispose()
      renderer.dispose()
    }
  }, [])

  return <canvas ref={canvasRef} className="site-background-canvas" aria-hidden="true" />
}
