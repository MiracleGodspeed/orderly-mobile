import { apiClient } from "../client";
import { GetPromoCardsResponse, PromoCard } from "./promoCards.types";

// Backend ships pascal-cased property names in some envelopes and
// camel-cased in others depending on the JSON contract registered
// for the controller. The carousel only needs a handful of fields,
// so we normalise here once instead of scattering `?? Camel ?? Pascal`
// across the component.
const normalise = (raw: any): PromoCard => ({
  id: raw.id ?? raw.Id,
  body: raw.body ?? raw.Body ?? "",
  buttonText: raw.buttonText ?? raw.ButtonText ?? "",
  buttonRoute: raw.buttonRoute ?? raw.ButtonRoute ?? "",
  iconKey: raw.iconKey ?? raw.IconKey ?? null,
  isActive: raw.isActive ?? raw.IsActive ?? false,
  displayOrder: raw.displayOrder ?? raw.DisplayOrder ?? 0,
  createdAt: raw.createdAt ?? raw.CreatedAt ?? "",
  lastUpdated: raw.lastUpdated ?? raw.LastUpdated ?? null,
});

export const getActivePromoCards = async (): Promise<PromoCard[]> => {
  // validateStatus: () => true keeps 401s out of the error path so
  // the response interceptor can do its refresh-token dance instead
  // of axios throwing here. Empty list on any non-200 — the
  // dashboard simply doesn't render the carousel.
  const response = await apiClient.get<GetPromoCardsResponse>(
    "/promo-cards/active",
    { validateStatus: () => true }
  );
  if (response.data?.code !== "200" || !Array.isArray(response.data?.data)) {
    return [];
  }
  return response.data.data.map(normalise);
};
