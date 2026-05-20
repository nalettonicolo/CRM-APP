"use client";

import Link from "next/link";
import { Header } from "@/components/layout/header";
import { WorkGallerySettings } from "@/components/settings/work-gallery-settings";

export default function EventGallerySettingsPage() {
  return (
    <>
      <Header title="Foto lavori — home pubblica" />
      <div className="p-3 sm:p-4 md:p-6">
        <Link href="/settings" className="text-sm text-primary hover:underline">
          ← Impostazioni
        </Link>
        <div className="mt-4">
          <WorkGallerySettings />
        </div>
      </div>
    </>
  );
}
