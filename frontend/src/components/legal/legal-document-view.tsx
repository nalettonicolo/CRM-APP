import Link from "next/link";
import { PRIVACY_POLICY_VERSION } from "@/lib/legal-content";
import type { LegalSection } from "@/lib/legal-content";

export function LegalDocumentView({
  title,
  subtitle,
  sections,
}: {
  title: string;
  subtitle?: string;
  sections: LegalSection[];
}) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-10 border-b border-border pb-6">
        <Link href="/" className="text-sm text-primary hover:underline">
          ← Torna al sito
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Versione documento: {PRIVACY_POLICY_VERSION}
        </p>
      </header>
      <div className="space-y-8 text-sm leading-relaxed text-foreground/90">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              {section.title}
            </h2>
            {section.paragraphs.map((p, i) => (
              <p key={i} className="mb-3">
                {p}
              </p>
            ))}
            {section.list && (
              <ul className="ml-5 list-disc space-y-2">
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
      <footer className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
        <p>
          Questo testo ha valore informativo. Per adempimenti legali specifici
          consulta un professionista qualificato.
        </p>
      </footer>
    </article>
  );
}
