/** Base URL API lato server (SSR): preferisce rete locale su Mint. */
export function getServerApiBase(): string {
  const raw =
    process.env.API_INTERNAL_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    "";
  return raw.replace(/\/$/, "");
}
