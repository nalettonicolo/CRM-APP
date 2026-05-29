import { LegalDocumentView } from "@/components/legal/legal-document-view";
import { resolveLegalIdentity, termsSections } from "@/lib/legal-content";
import {
  fetchPublicSettingsServer,
  getAppName,
  getCompany,
} from "@/lib/public-settings";

export const metadata = {
  title: "Termini d'uso — Nicolò Service",
  description: "Condizioni d'uso del sito e del portale clienti.",
};

export default async function TermsPage() {
  const settings = await fetchPublicSettingsServer();
  const identity = resolveLegalIdentity(getCompany(settings), getAppName(settings));

  return (
    <LegalDocumentView
      title="Termini d'uso"
      subtitle={`Sito web e portale clienti — ${identity.businessName}`}
      sections={termsSections(identity)}
    />
  );
}
