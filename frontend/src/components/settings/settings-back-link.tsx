import Link from "next/link";

export function SettingsBackLink() {
  return (
    <Link href="/settings" className="text-sm text-primary hover:underline">
      ← Impostazioni
    </Link>
  );
}
