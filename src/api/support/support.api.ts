import { apiClient } from "../client";

export interface SupportConfig {
  showContactDetails: boolean;
  phone: string | null;
  whatsApp: string | null;
  email: string | null;
  helpCenterUrl: string | null;
}

interface RawSupportConfig {
  showContactDetails?: boolean;
  phone?: string | null;
  whatsApp?: string | null;
  email?: string | null;
  helpCenterUrl?: string | null;
}

/**
 * Fetches the admin-controlled support config that drives the Help &
 * Support screen. When `showContactDetails` is false the app should
 * surface the contact form instead of the phone/whatsapp/email rows.
 */
export const getSupportConfig = async (): Promise<SupportConfig> => {
  const response = await apiClient.get<{
    code: string;
    message: string;
    data: RawSupportConfig;
  }>("/support/config", { validateStatus: () => true });

  if (response.data?.code !== "200") {
    throw new Error(response.data?.message || "Couldn't load support details.");
  }
  const raw = response.data.data ?? {};
  return {
    showContactDetails: raw.showContactDetails ?? true,
    phone: raw.phone ?? null,
    whatsApp: raw.whatsApp ?? null,
    email: raw.email ?? null,
    helpCenterUrl: raw.helpCenterUrl ?? null,
  };
};

/**
 * Submits a contact-form message. The backend pulls the sender email
 * from the JWT — the form input is just the message body, capped at
 * 1000 chars to match the UI.
 */
export const submitSupportMessage = async (message: string): Promise<void> => {
  const response = await apiClient.post<{ code: string; message: string }>(
    "/support/contact",
    { Message: message },
    { validateStatus: () => true }
  );
  if (response.data?.code !== "200") {
    const detail =
      response.data?.message ||
      `HTTP ${response.status} ${response.statusText ?? ""}`.trim();
    throw new Error(detail || "Couldn't send your message.");
  }
};
