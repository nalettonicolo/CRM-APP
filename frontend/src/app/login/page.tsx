import { LoginForm } from "@/components/auth/login-form";
import { fetchPublicSettingsServer } from "@/lib/public-settings";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const initialSettings = await fetchPublicSettingsServer();
  return <LoginForm initialSettings={initialSettings} />;
}
