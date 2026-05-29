import { LegalDocumentView } from "@/components/legal/legal-document-view";
import {
  privacyPolicySections,
  resolveLegalIdentity,
} from "@/lib/legal-content";
import {
  fetchPublicSettingsServer,
  getAppName,
  getCompany,
} from "@/lib/public-settings";

export const metadata = {
  title: "Informativa privacy — Nicolò Service",
  description: "Informativa sul trattamento dei dati personali (GDPR).",
};

export default async function PrivacyPage() {
  const settings = await fetchPublicSettingsServer();
  const identity = resolveLegalIdentity(getCompany(settings), getAppName(settings));

  return (
    <LegalDocumentView
      title="Informativa privacy"
      subtitle={`Trattamento dati personali — ${identity.businessName}`}
      sections={privacyPolicySections(identity)}
    />
  );
}
