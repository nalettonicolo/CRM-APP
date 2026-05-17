import { LandingPage } from "@/components/landing/landing-page";
import { fetchPublicSettingsServer } from "@/lib/public-settings";

export default async function HomePage() {
  const initialSettings = await fetchPublicSettingsServer();
  return <LandingPage initialSettings={initialSettings} />;
}
