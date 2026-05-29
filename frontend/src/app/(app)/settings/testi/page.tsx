"use client";

import { Header } from "@/components/layout/header";
import { SettingsBackLink } from "@/components/settings/settings-back-link";
import { SiteTextsSettings } from "@/components/settings/site-texts-settings";

export default function SettingsTextsPage() {
  return (
    <>
      <Header title="Testi" />
      <div className="p-3 sm:p-4 md:p-6">
        <SettingsBackLink />
        <div className="mt-4">
          <SiteTextsSettings />
        </div>
      </div>
    </>
  );
}
