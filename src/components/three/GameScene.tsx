"use client";

import { OrbitControls, Text } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { avatarColor } from "@/features/game/avatars";
import { board } from "@/features/game/content/board";
import { boardPoint, pathBetween } from "@/features/game/random";
import type { GameState } from "@/features/game/types";

function FpsProbe() {
  const frames = useRef<number[]>([]);
  useFrame(() => {
    const now = performance.now();
    frames.current.push(now);
    frames.current = frames.current.filter((stamp) => now - stamp < 1000);
    window.__wqFps = frames.current.length;
  });
  return null;
}

function District() {
  return (
    <group>
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <cylinderGeometry args={[2.4, 2.5, 0.12, 40]} />
        <meshStandardMaterial color="#1a3348" roughness={0.8} />
      </mesh>
      <mesh position={[-0.8, 0.55, 0.2]} castShadow>
        <boxGeometry args={[1.1, 0.9, 0.8]} />
        <meshStandardMaterial color="#d7c7a4" />
      </mesh>
      <mesh position={[-0.8, 1.08, 0.2]}>
        <boxGeometry args={[1.2, 0.16, 0.9]} />
        <meshStandardMaterial color="#8c6424" metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[0.9, 0.4, -0.4]} castShadow>
        <boxGeometry args={[1.3, 0.55, 0.7]} />
        <meshStandardMaterial color="#c46b3a" />
      </mesh>
      <mesh position={[0.15, 1.35, -0.1]} castShadow>
        <cylinderGeometry args={[0.16, 0.22, 2.2, 12]} />
        <meshStandardMaterial color="#c4a15a" metalness={0.5} roughness={0.35} />
      </mesh>
    </group>
  );
}

function BoardMesh({ quality, activePosition }: { quality: "low" | "high"; activePosition: number }) {
  const geometry = useMemo(() => new THREE.BoxGeometry(1.05, 0.18, 1.05), []);
  const materials = useMemo(() => {
    const map = new Map<string, THREE.MeshStandardMaterial>();
    for (const space of board) {
      if (!map.has(space.accent)) {
        map.set(space.accent, new THREE.MeshStandardMaterial({ color: space.accent, roughness: 0.62, metalness: 0.04 }));
      }
    }
    return map;
  }, []);
  useEffect(() => {
    return () => {
      geometry.dispose();
      for (const material of materials.values()) material.dispose();
    };
  }, [geometry, materials]);
  return (
    <group>
      {board.map((space) => {
        const point = boardPoint(space.position, 6.15);
        const material = materials.get(space.accent);
        return (
          <group key={space.id} position={[point.x, 0.12, point.z]}>
            {material && (
              <mesh geometry={geometry} material={material} castShadow={quality === "high"} receiveShadow={quality === "high"} />
            )}
            {quality === "high" && (
              <Text position={[0, 0.16, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.13} color="#1b2430" anchorX="center" anchorY="middle" maxWidth={0.9}>
                {space.name}
              </Text>
            )}
            {space.position === activePosition && (
              <mesh position={[0, 0.12, 0]}>
                <boxGeometry args={[1.15, 0.04, 1.15]} />
                <meshBasicMaterial color="#f3eee4" />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

function Tokens({ state, displayIndex }: { state: GameState; displayIndex: number }) {
  return (
    <>
      {state.players.map((player, index) => {
        const positionIndex = player.id === state.players[state.activePlayerIndex]?.id ? displayIndex : player.boardPosition;
        const point = boardPoint(positionIndex, 6.15);
        return (
          <group key={player.id} position={[point.x, 0.28, point.z]}>
            <mesh position={[0, 0.22, 0]} castShadow>
              <sphereGeometry args={[0.26, 20, 20]} />
              <meshStandardMaterial color={avatarColor(player.avatarId)} />
            </mesh>
            <mesh position={[0, 0.02, 0]}>
              <cylinderGeometry args={[0.16, 0.22, 0.16, 16]} />
              <meshStandardMaterial color="#1b2430" />
            </mesh>
            {index === state.activePlayerIndex && (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
                <ringGeometry args={[0.34, 0.46, 24]} />
                <meshBasicMaterial color="#f3eee4" />
              </mesh>
            )}
          </group>
        );
      })}
    </>
  );
}

function Dice({ rolls, spinning }: { rolls: number[]; spinning: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (!group.current || !spinning) return;
    group.current.rotation.x += delta * 6;
    group.current.rotation.y += delta * 4;
  });
  if (rolls.length === 0) return null;
  return (
    <group ref={group} position={[0, 1.6, 0]}>
      {rolls.map((face, index) => (
        <mesh key={`${face}-${index}`} position={[(index - (rolls.length - 1) / 2) * 0.8, 0, 0]} castShadow>
          <boxGeometry args={[0.48, 0.48, 0.48]} />
          <meshStandardMaterial color="#f3eee4" />
          {!spinning && (
            <Text position={[0, 0.26, 0]} fontSize={0.22} color="#1b2430" anchorX="center">
              {String(face)}
            </Text>
          )}
        </mesh>
      ))}
    </group>
  );
}

function CameraRig({ resetSignal }: { resetSignal: number }) {
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const camera = useThree((state) => state.camera);
  useEffect(() => {
    camera.position.set(11, 13, 11);
    const target = controls.current?.target;
    target?.set(0, 0, 0);
    controls.current?.update();
  }, [resetSignal, camera]);
  return (
    <OrbitControls
      ref={controls}
      enablePan
      minPolarAngle={0.55}
      maxPolarAngle={1.25}
      minAzimuthAngle={-0.9}
      maxAzimuthAngle={0.9}
      minDistance={8}
      maxDistance={24}
    />
  );
}

function SceneBody({
  state,
  quality,
  reducedMotion,
  resetSignal,
  onArrive,
}: {
  state: GameState;
  quality: "low" | "high";
  reducedMotion: boolean;
  resetSignal: number;
  onArrive: () => void;
}) {
  const active = state.players[state.activePlayerIndex];
  const pending = state.pending;
  const travelKey = pending ? `${pending.from}-${pending.to}-${pending.total}-${active?.month}` : "still";
  const [displayIndex, setDisplayIndex] = useState(active?.boardPosition ?? 0);
  const [spinning, setSpinning] = useState(false);
  const started = useRef("");

  useEffect(() => {
    if (!active) return;
    if (!pending || reducedMotion || started.current === travelKey) {
      setDisplayIndex(active.boardPosition);
      setSpinning(false);
      if (pending) onArrive();
      return;
    }
    started.current = travelKey;
    setSpinning(true);
    const steps = pathBetween(pending.from, pending.to, state.rules.boardSpaces);
    let cancelled = false;
    const timers: number[] = [];
    timers.push(window.setTimeout(() => setSpinning(false), 650));
    steps.forEach((step, index) => {
      timers.push(window.setTimeout(() => setDisplayIndex(step), 650 + index * 180));
    });
    timers.push(
      window.setTimeout(() => {
        if (!cancelled) onArrive();
      }, 650 + steps.length * 180),
    );
    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [travelKey, active, pending, reducedMotion, onArrive, state.rules.boardSpaces]);

  return (
    <>
      <color attach="background" args={["#0b1b2c"]} />
      <fog attach="fog" args={["#0b1b2c", 16, 36]} />
      <ambientLight intensity={0.62} />
      <directionalLight position={[8, 14, 6]} intensity={1.15} castShadow={quality === "high"} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]} receiveShadow>
        <circleGeometry args={[9.2, 48]} />
        <meshStandardMaterial color="#17344c" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]}>
        <ringGeometry args={[8.5, 9.05, 48]} />
        <meshStandardMaterial color="#8c6424" metalness={0.45} roughness={0.4} />
      </mesh>
      <District />
      <BoardMesh quality={quality} activePosition={displayIndex} />
      {active && <Tokens state={state} displayIndex={displayIndex} />}
      <Dice rolls={pending?.rolls ?? []} spinning={spinning} />
      <CameraRig resetSignal={resetSignal} />
      <FpsProbe />
    </>
  );
}

export function GameScene(props: {
  state: GameState;
  quality: "low" | "high";
  reducedMotion: boolean;
  resetSignal: number;
  onArrive: () => void;
}) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const onChange = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);
  return (
    <Canvas
      shadows={props.quality === "high" ? { type: THREE.PCFShadowMap } : false}
      dpr={props.quality === "high" ? [1, 1.6] : 1}
      frameloop={hidden ? "demand" : "always"}
      gl={{ antialias: props.quality === "high", powerPreference: "high-performance" }}
      camera={{ position: [11, 13, 11], fov: 38 }}
    >
      <Suspense fallback={null}>
        <SceneBody {...props} />
      </Suspense>
    </Canvas>
  );
}

declare global {
  interface Window {
    __wqFps?: number;
  }
}
