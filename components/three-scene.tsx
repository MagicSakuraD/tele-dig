"use client";

import * as React from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Model } from "@/components/excavator";

interface ThreeSceneProps {
  title?: string;
}

// 简单的立方体组件作为占位符
function PlaceholderMesh() {
  const meshRef = React.useRef<THREE.Mesh>(null);

  // 简单的旋转动画
  React.useEffect(() => {
    const animate = () => {
      if (meshRef.current) {
        meshRef.current.rotation.x += 0.005;
        meshRef.current.rotation.y += 0.01;
      }
      requestAnimationFrame(animate);
    };
    animate();
  }, []);

  return (
    <mesh ref={meshRef} position={[0, 0.5, 0]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#3b82f6" />
    </mesh>
  );
}

export function ThreeScene({ title = "3D姿态监控" }: ThreeSceneProps) {
  return (
    <div className="static">
      <div className="absolute top-2 right-0 left-4 z-50">
        <code className="bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
          {title}
        </code>
      </div>
      <div className="h-77 w-full overflow-hidden rounded-xl">
        <Canvas
          camera={{
            position: [3, 3, 3],
            fov: 50,
          }}
          style={{
            background: "linear-gradient(to bottom, #f8fafc, #e2e8f0)",
          }}
        >
          {/* 环境光 */}
          <ambientLight intensity={0.4} />

          {/* 方向光 */}
          <directionalLight position={[10, 10, 5]} intensity={1} />

          {/* 网格地面 */}
          <Grid
            position={[0, -0.5, 0]}
            args={[10, 10]}
            cellSize={0.5}
            cellThickness={0.5}
            cellColor="#6b7280"
            sectionSize={2}
            sectionThickness={1}
            sectionColor="#374151"
            fadeDistance={25}
            fadeStrength={1}
            followCamera={false}
            infiniteGrid={true}
          />

          {/* 占位符网格 - 这里将来可以替换为挖掘机模型 */}
          {/* <PlaceholderMesh /> */}
          <Model />

          {/* 轨道控制器 */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={2}
            maxDistance={10}
            minPolarAngle={0}
            maxPolarAngle={Math.PI / 2}
          />
        </Canvas>
      </div>
    </div>
  );
}
