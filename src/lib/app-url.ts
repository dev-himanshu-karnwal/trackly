const DEFAULT_APP_URL = "https://trackly.dctinfotech.com";

/** App origin for redirects and links (server/runtime env). */
export function getAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const base = configured || DEFAULT_APP_URL;
  return base.replace(/\/$/, "");
}

export function getPasswordResetRedirectUrl(): string {
  return `${getAppUrl()}/reset-password`;
}
