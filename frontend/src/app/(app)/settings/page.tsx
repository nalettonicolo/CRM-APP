"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FileText, ImageIcon, Shield } from "lucide-react";
import { authApi, backupApi, privacyApi, settingsApi } from "@/lib/api";
import { DEFAULT_APP_NAME } from "@/lib/branding";
import { DOCUMENT_COPY } from "@/lib/document-copy";
import { cn } from "@/lib/utils";

const textareaClass =
  "flex min-h-[88px] w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: settingsApi.get,
  });

  const { data: smtpStatus } = useQuery({
    queryKey: ["settings", "smtp-status"],
    queryFn: settingsApi.smtpStatus,
  });

  const { data: privacyInfo } = useQuery({
    queryKey: ["privacy", "version"],
    queryFn: privacyApi.version,
  });

  const privacyMaintenance = useMutation({
    mutationFn: privacyApi.maintenance,
    onSuccess: (res) => {
      setBanner(
        `Pulizia completata: ${res.deletedLeads} lead e ${res.deletedActivityLogs} log rimossi.`
      );
      setTimeout(() => setBanner(""), 5000);
    },
    onError: () => setBanner("Errore durante la pulizia dati scaduti."),
  });

  const [banner, setBanner] = useState("");
  const [appName, setAppName] = useState(DEFAULT_APP_NAME);
  const [tagline, setTagline] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#6366f1");
  const [company, setCompany] = useState({
    name: "",
    vat: "",
    address: "",
    email: "",
    phone: "",
    website: "",
    bankName: "",
    iban: "",
    bic: "",
  });
  const [quoteDefaults, setQuoteDefaults] = useState({
    withholdingTaxPercent: "20",
    stampDutyAmount: "2",
  });
  const [smtp, setSmtp] = useState({
    host: "smtp.gmail.com",
    port: "587",
    user: "",
    pass: "",
    from: "",
    fromName: "Nicolò Service",
    secure: false,
  });
  const [testEmailTo, setTestEmailTo] = useState("");
  const [twoFaCode, setTwoFaCode] = useState("");
  const [twoFaSetup, setTwoFaSetup] = useState<{
    secret: string;
    qrCodeUrl: string;
  } | null>(null);

  useEffect(() => {
    if (!data) return;
    const an = data.app_name as { name?: string; tagline?: string };
    setAppName(an?.name?.trim() || DEFAULT_APP_NAME);
    setTagline(an?.tagline?.trim() || "");
    setPrimaryColor((data.colors as { primary?: string })?.primary || "#6366f1");
    const co = (data.company as Record<string, string>) || {};
    setCompany({
      name: co.name || "",
      vat: co.vat || "",
      address: co.address || "",
      email: co.email || "",
      phone: co.phone || "",
      website: co.website || "",
      bankName: co.bankName || "",
      iban: co.iban || "",
      bic: co.bic || "",
    });
    const qd = (data.quote_defaults as Record<string, number>) || {};
    setQuoteDefaults({
      withholdingTaxPercent:
        qd.withholdingTaxPercent != null
          ? String(qd.withholdingTaxPercent)
          : "20",
      stampDutyAmount:
        qd.stampDutyAmount != null ? String(qd.stampDutyAmount) : "2",
    });
    const sm = (data.smtp as Record<string, string>) || {};
    setSmtp({
      host: sm.host || "smtp.gmail.com",
      port: sm.port || "587",
      user: sm.user || "",
      pass: "",
      from: sm.from || sm.user || "",
      fromName: (sm.fromName as string) || "Nicolò Service",
      secure: String(sm.secure) === "true",
    });
    if (!testEmailTo && (sm.user || co.email)) {
      setTestEmailTo((sm.user as string) || co.email || "");
    }
  }, [data]);

  const [emailTestPending, setEmailTestPending] = useState<
    "smtp" | "quote" | "report" | "invoice" | null
  >(null);

  const runEmailTest = async (type: "smtp" | "quote" | "report" | "invoice") => {
    if (!testEmailTo) return;
    setEmailTestPending(type);
    try {
      const res =
        type === "smtp"
          ? await settingsApi.testSmtp(testEmailTo)
          : await settingsApi.testEmail(type, testEmailTo);
      qc.invalidateQueries({ queryKey: ["settings", "smtp-status"] });
      setBanner(res.message || "Email di test inviata.");
      setTimeout(() => setBanner(""), 5000);
    } catch (err) {
      setBanner(
        err instanceof Error
          ? err.message
          : "Invio test fallito. Controlla password app Gmail."
      );
    } finally {
      setEmailTestPending(null);
    }
  };

  const backupMut = useMutation({
    mutationFn: backupApi.trigger,
    onSuccess: (res) => {
      const drive = res.drive;
      if (drive?.uploaded) {
        setBanner(`Backup OK. ${drive.message}`);
      } else if (drive) {
        setBanner(`Backup locale OK. Google Drive: ${drive.message}`);
      } else {
        setBanner("Backup completato (solo locale).");
      }
      setTimeout(() => setBanner(""), 6000);
    },
    onError: () => setBanner("Errore backup."),
  });

  const setup2faMut = useMutation({
    mutationFn: authApi.setup2fa,
    onSuccess: (res) => setTwoFaSetup(res),
  });

  const enable2faMut = useMutation({
    mutationFn: () => authApi.enable2fa(twoFaCode),
    onSuccess: () => {
      setBanner("2FA attivata.");
      setTwoFaSetup(null);
      setTwoFaCode("");
    },
    onError: () => setBanner("Codice 2FA non valido."),
  });

  const disable2faMut = useMutation({
    mutationFn: () => authApi.disable2fa(twoFaCode),
    onSuccess: () => {
      setBanner("2FA disattivata.");
      setTwoFaCode("");
    },
    onError: () => setBanner("Codice 2FA non valido."),
  });

  const saveMut = useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) =>
      settingsApi.update(key, value),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["settings", "public"] });
      qc.invalidateQueries({ queryKey: ["settings", "smtp-status"] });
      if (vars.key === "smtp") {
        setSmtp((s) => ({ ...s, pass: "" }));
      }
      setBanner("Salvato.");
      setTimeout(() => setBanner(""), 2500);
    },
    onError: () => setBanner("Errore durante il salvataggio."),
  });

  if (isLoading && !data) {
    return (
      <>
        <Header title="Impostazioni" />
        <div className="p-6 text-muted-foreground">Caricamento…</div>
      </>
    );
  }

  return (
    <>
      <Header title="Impostazioni" />
      <div className="max-w-3xl space-y-6 p-6">
        {banner && (
          <p
            className={cn(
              "rounded-lg border px-3 py-2 text-sm",
              banner.startsWith("Errore")
                ? "border-red-500/40 bg-red-500/10 text-red-700"
                : "border-green-500/40 bg-green-500/10 text-green-800"
            )}
          >
            {banner}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/settings/testi">
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-5 w-5 text-primary" />
                  Testi
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Homepage pubblica, descrizioni servizi, voci report e altri
                  testi configurabili.
                </p>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/settings/immagini">
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  Immagini
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Logo, favicon e galleria foto eventi mostrata in homepage.
                </p>
              </CardHeader>
            </Card>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Privacy e conformità
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Documenti legali, conservazione dati e diritti degli interessati
              (GDPR). Verifica che email e ragione sociale in &quot;Contatti
              in home&quot; siano corretti: compaiono nell&apos;informativa
              privacy.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Link href="/privacy" target="_blank">
                <Button variant="outline" size="sm">
                  Informativa privacy
                </Button>
              </Link>
              <Link href="/cookie-policy" target="_blank">
                <Button variant="outline" size="sm">
                  Cookie policy
                </Button>
              </Link>
              <Link href="/termini" target="_blank">
                <Button variant="outline" size="sm">
                  Termini d&apos;uso
                </Button>
              </Link>
            </div>
            {privacyInfo && (
              <p className="text-xs text-muted-foreground">
                Versione informativa: {privacyInfo.privacyPolicyVersion} · Lead
                non convertiti: {privacyInfo.leadRetentionDays} giorni · Log
                attività: {privacyInfo.activityLogRetentionDays} giorni
              </p>
            )}
            <Button
              variant="outline"
              disabled={privacyMaintenance.isPending}
              onClick={() => {
                if (
                  !window.confirm(
                    "Eliminare lead non convertiti e log attività oltre i termini di conservazione configurati?"
                  )
                ) {
                  return;
                }
                privacyMaintenance.mutate();
              }}
            >
              {privacyMaintenance.isPending
                ? "Pulizia in corso..."
                : "Pulizia dati scaduti"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Nome e colori</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Nome attività / prodotto
              </label>
              <Input value={appName} onChange={(e) => setAppName(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Tagline breve</label>
              <Input value={tagline} onChange={(e) => setTagline(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Colore primario</label>
              <Input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-24"
              />
            </div>
            <Button
              disabled={saveMut.isPending}
              onClick={async () => {
                setBanner("");
                try {
                  await settingsApi.update("app_name", {
                    name: appName.trim(),
                    tagline: tagline.trim(),
                  });
                  await settingsApi.update("colors", {
                    ...(data?.colors &&
                    typeof data.colors === "object" &&
                    !Array.isArray(data.colors)
                      ? (data.colors as Record<string, unknown>)
                      : {}),
                    primary: primaryColor,
                  });
                  await qc.invalidateQueries({ queryKey: ["settings"] });
                  await qc.invalidateQueries({ queryKey: ["settings", "public"] });
                  setBanner("Salvato.");
                  setTimeout(() => setBanner(""), 2500);
                } catch {
                  setBanner("Errore durante il salvataggio.");
                }
              }}
            >
              Salva nome e colori
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contatti in home (footer)</CardTitle>
            <p className="text-sm text-muted-foreground">
              Compariranno sotto il copyright sulla pagina pubblica. L&apos;email
              aziendale riceve anche le notifiche del form contatti del sito.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Ragione sociale"
              value={company.name}
              onChange={(e) => setCompany((c) => ({ ...c, name: e.target.value }))}
            />
            <Input
              placeholder="P. IVA"
              value={company.vat}
              onChange={(e) => setCompany((c) => ({ ...c, vat: e.target.value }))}
            />
            <Input
              placeholder="Indirizzo"
              value={company.address}
              onChange={(e) =>
                setCompany((c) => ({ ...c, address: e.target.value }))
              }
            />
            <Input
              placeholder="Email"
              type="email"
              value={company.email}
              onChange={(e) => setCompany((c) => ({ ...c, email: e.target.value }))}
            />
            <Input
              placeholder="Telefono"
              value={company.phone}
              onChange={(e) => setCompany((c) => ({ ...c, phone: e.target.value }))}
            />
            <Input
              placeholder="Sito web (https://…)"
              value={company.website}
              onChange={(e) =>
                setCompany((c) => ({ ...c, website: e.target.value }))
              }
            />
            <Input
              placeholder="Banca (opzionale)"
              value={company.bankName}
              onChange={(e) =>
                setCompany((c) => ({ ...c, bankName: e.target.value }))
              }
            />
            <Input
              placeholder="IBAN (opzionale)"
              value={company.iban}
              onChange={(e) => setCompany((c) => ({ ...c, iban: e.target.value }))}
            />
            <Input
              placeholder="BIC/SWIFT (opzionale)"
              value={company.bic}
              onChange={(e) => setCompany((c) => ({ ...c, bic: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              L&apos;email azienda riceve le notifiche del form contatto sul sito.
            </p>
            <Button
              disabled={saveMut.isPending}
              onClick={() => saveMut.mutate({ key: "company", value: company })}
            >
              Salva contatti
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preventivi — valori predefiniti</CardTitle>
            <p className="text-sm text-muted-foreground">
              Ritenuta d&apos;acconto e marca da bollo applicati automaticamente ai
              nuovi preventivi (modificabili per singolo documento). Non si
              applicano a fatture o altri moduli.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Ritenuta d&apos;acconto %
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={quoteDefaults.withholdingTaxPercent}
                  onChange={(e) =>
                    setQuoteDefaults((q) => ({
                      ...q,
                      withholdingTaxPercent: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Marca da bollo (€)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={quoteDefaults.stampDutyAmount}
                  onChange={(e) =>
                    setQuoteDefaults((q) => ({
                      ...q,
                      stampDutyAmount: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <Button
              disabled={saveMut.isPending}
              onClick={() =>
                saveMut.mutate({
                  key: "quote_defaults",
                  value: {
                    withholdingTaxPercent:
                      Number(quoteDefaults.withholdingTaxPercent) || 0,
                    stampDutyAmount:
                      Number(quoteDefaults.stampDutyAmount) || 0,
                  },
                })
              }
            >
              Salva predefiniti preventivo
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email Gmail (SMTP)</CardTitle>
            <p className="text-sm text-muted-foreground">
              Usa una{" "}
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                password per le app
              </a>{" "}
              (16 caratteri, senza spazi), non la password normale di Gmail. Su
              Mint puoi usare anche le variabili SMTP nel file .env del backend.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {smtpStatus && (
              <p
                className={cn(
                  "rounded-lg px-3 py-2 text-sm",
                  smtpStatus.configured
                    ? "border border-green-500/40 bg-green-500/10 text-green-800"
                    : "border border-amber-500/40 bg-amber-500/10 text-amber-900"
                )}
              >
                {smtpStatus.configured
                  ? `SMTP attivo (${smtpStatus.from || smtpStatus.user})`
                  : "SMTP non configurato: le email dal sito e dal CRM non partono finché non salvi host, utente e password app."}
              </p>
            )}
            <Input
              placeholder="Host (smtp.gmail.com)"
              value={smtp.host}
              onChange={(e) => setSmtp((s) => ({ ...s, host: e.target.value }))}
            />
            <Input
              placeholder="Porta (587)"
              value={smtp.port}
              onChange={(e) => setSmtp((s) => ({ ...s, port: e.target.value }))}
            />
            <Input
              placeholder="Email Gmail"
              value={smtp.user}
              onChange={(e) =>
                setSmtp((s) => ({
                  ...s,
                  user: e.target.value,
                  from: s.from || e.target.value,
                }))
              }
            />
            <Input
              type="password"
              placeholder={
                smtpStatus?.hasPassword
                  ? "Lascia vuoto per non modificare la password"
                  : "Password per le app Gmail (16 caratteri)"
              }
              value={smtp.pass}
              onChange={(e) => setSmtp((s) => ({ ...s, pass: e.target.value }))}
            />
            <Input
              placeholder="Email mittente"
              value={smtp.from}
              onChange={(e) => setSmtp((s) => ({ ...s, from: e.target.value }))}
            />
            <Input
              placeholder="Nome mittente"
              value={smtp.fromName}
              onChange={(e) => setSmtp((s) => ({ ...s, fromName: e.target.value }))}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={saveMut.isPending}
                onClick={() => saveMut.mutate({ key: "smtp", value: smtp })}
              >
                Salva SMTP
              </Button>
            </div>
            <div className="border-t border-border pt-4">
              <p className="mb-1 text-sm font-medium">
                {DOCUMENT_COPY.emailTests.sectionTitle}
              </p>
              <p className="mb-3 text-xs text-muted-foreground">
                {DOCUMENT_COPY.emailTests.sectionHint}
              </p>
              <Input
                type="email"
                placeholder="Email destinazione test"
                className="mb-3 max-w-md"
                value={testEmailTo}
                onChange={(e) => setTestEmailTo(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["smtp", DOCUMENT_COPY.emailTests.smtp],
                    ["quote", DOCUMENT_COPY.emailTests.quote],
                    ["report", DOCUMENT_COPY.emailTests.report],
                    ["invoice", DOCUMENT_COPY.emailTests.invoice],
                  ] as const
                ).map(([type, label]) => (
                  <Button
                    key={type}
                    variant="outline"
                    size="sm"
                    disabled={!testEmailTo || emailTestPending !== null}
                    onClick={() => runEmailTest(type)}
                  >
                    {emailTestPending === type
                      ? DOCUMENT_COPY.emailTests.pending
                      : label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Backup database</CardTitle>
            <p className="text-sm text-muted-foreground">
              Manuale da qui; automatico ogni 5 giorni su Mint + Google Drive (vedi
              docs/guida-email-smtp-completa.md).
            </p>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              disabled={backupMut.isPending}
              onClick={() => backupMut.mutate()}
            >
              {backupMut.isPending ? "Backup in corso…" : "Esegui backup ora"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Autenticazione a due fattori</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!twoFaSetup ? (
              <Button
                variant="outline"
                disabled={setup2faMut.isPending}
                onClick={() => setup2faMut.mutate()}
              >
                Configura 2FA
              </Button>
            ) : (
              <div className="space-y-3 rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground break-all">
                  Secret: {twoFaSetup.secret}
                </p>
                {twoFaSetup.qrCodeUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={twoFaSetup.qrCodeUrl}
                    alt="QR 2FA"
                    className="mx-auto h-40 w-40"
                  />
                )}
                <Input
                  placeholder="Codice a 6 cifre"
                  value={twoFaCode}
                  onChange={(e) => setTwoFaCode(e.target.value)}
                />
                <Button
                  disabled={enable2faMut.isPending || twoFaCode.length < 6}
                  onClick={() => enable2faMut.mutate()}
                >
                  Attiva 2FA
                </Button>
              </div>
            )}
            <div className="border-t border-border pt-4">
              <p className="mb-2 text-sm text-muted-foreground">Disattiva 2FA</p>
              <Input
                placeholder="Codice corrente"
                value={twoFaCode}
                onChange={(e) => setTwoFaCode(e.target.value)}
              />
              <Button
                variant="destructive"
                className="mt-2"
                disabled={disable2faMut.isPending || !twoFaCode}
                onClick={() => disable2faMut.mutate()}
              >
                Disattiva
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Piani di pagamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Modelli di acconti e saldi riutilizzabili in ogni preventivo.
            </p>
            <Link href="/settings/payment-terms">
              <Button variant="outline">Gestisci modelli acconti</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Automazione preventivi</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/settings/automation">
              <Button variant="outline">Gestisci regole automazione</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
