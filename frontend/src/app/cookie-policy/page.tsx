import { LegalDocumentView } from "@/components/legal/legal-document-view";
import { cookiePolicySections } from "@/lib/legal-content";

export const metadata = {
  title: "Cookie policy — Nicolò Service",
  description: "Informazioni su cookie e tecnologie di archiviazione locale.",
};

export default function CookiePolicyPage() {
  return (
    <LegalDocumentView
      title="Cookie policy"
      subtitle="Cookie e storage locale utilizzati dal sito e dal portale"
      sections={cookiePolicySections()}
    />
  );
}
