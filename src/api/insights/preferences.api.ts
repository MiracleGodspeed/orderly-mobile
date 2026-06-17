import { apiClient } from "../client";

export interface NotificationPreferences {
  lowStockAlerts: boolean;
  reports: boolean;
  engagementNudges: boolean;
  encouragement: boolean;
  milestones: boolean;
}

const ALL_ON: NotificationPreferences = {
  lowStockAlerts: true,
  reports: true,
  engagementNudges: true,
  encouragement: true,
  milestones: true,
};

interface Envelope<T> {
  code: string;
  message: string;
  data: T;
}

export const getNotificationPreferences =
  async (): Promise<NotificationPreferences> => {
    const res = await apiClient.get<Envelope<NotificationPreferences>>(
      "/notification-preferences",
      { validateStatus: () => true },
    );
    if (res.data?.code !== "200" || !res.data?.data) return ALL_ON;
    return res.data.data;
  };

export const updateNotificationPreferences = async (
  prefs: NotificationPreferences,
): Promise<boolean> => {
  const res = await apiClient.put<Envelope<NotificationPreferences>>(
    "/notification-preferences",
    prefs,
    { validateStatus: () => true },
  );
  return res.data?.code === "200";
};
