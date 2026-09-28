"use client";

import { Suspense, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls, RoundedBox } from "@react-three/drei";
import { LoadingState } from "./StateViews";

// Configuratore prodotto 3D interattivo, ispirato a "Rubik" (3D Web Lab):
// ruota/zoom nel browser via WebGL (Three.js / React Three Fiber) e
// personalizza colore + finitura in tempo reale — utile per il ramo Stampa3D
// (far vedere al cliente il pezzo prima di confermare il preventivo) tanto
// quanto per qualunque prodotto configurabile del gestionale.
//
// Oggi il "prodotto" è una geometria primitiva (RoundedBox) come demo: per
// mostrare un modello reale esportato da CAD/slicer, sostituisci
// <ProductMesh /> con un loader GLTF, es.:
//
//   const { nodes, materials } = useGLTF("/models/prodotto.glb");
//   <primitive object={nodes.Prodotto} material={materials.Corpo} />
//
// I file .glb vanno prima ottimizzati per il web (Draco/meshopt) — vedi nota
// "Asset pipeline" nel README — altrimenti un modello CAD pesante blocca il
// caricamento nel browser.

export type Finish = "lucido" | "opaco" | "metallo";

const FINISH_PARAMS: Record<Finish, { roughness: number; metalness: number }> = {
  lucido: { roughness: 0.15, metalness: 0.1 },
  opaco: { roughness: 0.9, metalness: 0 },
  metallo: { roughness: 0.3, metalness: 1 },
};

const COLOR_PRESETS = [
  { name: "Viola brand", hex: "#7C5CFC" },
  { name: "Antracite", hex: "#1F2233" },
  { name: "Bianco", hex: "#F2EEFF" },
  { name: "Verde", hex: "#22C55E" },
  { name: "Ambra", hex: "#F5A524" },
];

function ProductMesh({ color, finish }: { color: string; finish: Finish }) {
  const params = FINISH_PARAMS[finish];
  return (
    <RoundedBox args={[1.6, 1, 1]} radius={0.12} smoothness={4} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={params.roughness} metalness={params.metalness} />
    </RoundedBox>
  );
}

export function ProductConfigurator() {
  const [color, setColor] = useState(COLOR_PRESETS[0].hex);
  const [finish, setFinish] = useState<Finish>("lucido");
  const finishes = useMemo(() => Object.keys(FINISH_PARAMS) as Finish[], []);

  return (
    <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden p-6 lg:grid-cols-[1fr_18rem]">
      <div className="relative min-h-[420px] overflow-hidden rounded-xl border border-surface-border bg-surface-raised/60">
        <Suspense fallback={<div className="grid h-full place-items-center"><LoadingState label="Carico la scena 3D…" /></div>}>
          <Canvas camera={{ position: [2.4, 1.6, 2.4], fov: 40 }} shadows dpr={[1, 2]}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[4, 6, 4]} intensity={1.2} castShadow />
            <ProductMesh color={color} finish={finish} />
            <ContactShadows position={[0, -0.55, 0]} opacity={0.5} scale={6} blur={2.4} far={2} />
            <Environment preset="city" />
            <OrbitControls enablePan={false} minDistance={2} maxDistance={5} />
          </Canvas>
        </Suspense>
        <span className="badge absolute left-3 top-3 bg-surface/80 text-white/60">Trascina per ruotare · scroll per zoom</span>
      </div>

      <div className="card flex flex-col gap-5 p-5">
        <div>
          <p className="mb-2 text-sm font-semibold text-white/80">Colore</p>
          <div className="flex flex-wrap gap-2">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c.hex}
                onClick={() => setColor(c.hex)}
                title={c.name}
                aria-label={c.name}
                className={`h-8 w-8 rounded-full border-2 transition-colors ${
                  color === c.hex ? "border-brand-300" : "border-transparent hover:border-white/30"
                }`}
                style={{ background: c.hex }}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-white/80">Finitura</p>
          <div className="flex gap-2">
            {finishes.map((f) => (
              <button
                key={f}
                onClick={() => setFinish(f)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                  finish === f ? "bg-brand-500 text-surface" : "bg-white/8 text-white/60 hover:bg-white/15"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto space-y-2 border-t border-surface-border pt-4">
          <p className="text-xs text-white/45">Configurazione selezionata</p>
          <p className="text-sm">
            Colore <span className="font-medium">{COLOR_PRESETS.find((c) => c.hex === color)?.name}</span>, finitura{" "}
            <span className="font-medium capitalize">{finish}</span>
          </p>
          <button className="btn-primary w-full text-sm">Richiedi preventivo per questa configurazione</button>
        </div>
      </div>
    </div>
  );
}
