"use client";

import { Header } from "@/components/layout/header";
import { BrandingImagesSettings } from "@/components/settings/branding-images-settings";
import { SettingsBackLink } from "@/components/settings/settings-back-link";
import { WorkGallerySettings } from "@/components/settings/work-gallery-settings";

export default function SettingsImagesPage() {
  return (
    <>
      <Header title="Immagini" />
      <div className="p-3 sm:p-4 md:p-6">
        <SettingsBackLink />
        <div className="mt-4 max-w-3xl space-y-8">
          <BrandingImagesSettings />
          <div>
            <h2 className="mb-1 text-lg font-semibold">Galleria eventi in homepage</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Foto pubblicate nella sezione &quot;I nostri eventi&quot; del sito.
            </p>
            <WorkGallerySettings showHomeLink />
          </div>
        </div>
      </div>
    </>
  );
}
