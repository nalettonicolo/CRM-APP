"use client";

import dynamic from "next/dynamic";
import { Topbar } from "@/components/Topbar";
import { LoadingState } from "@/components/StateViews";

// Il Canvas WebGL (Three.js) non può fare server-side rendering: import
// dinamico con ssr:false, così Next.js non prova a eseguirlo sul server.
const ProductConfigurator = dynamic(
  () => import("@/components/ProductConfigurator").then((m) => m.ProductConfigurator),
  { ssr: false, loading: () => <div className="p-6"><LoadingState label="Carico il configuratore 3D…" /></div> },
);

export default function ConfiguratorPage() {
  return (
    <>
      <Topbar title="Configuratore 3D" subtitle="Anteprima e personalizzazione prodotto — stile 3D Web Lab / Rubik" />
      <ProductConfigurator />
    </>
  );
}
