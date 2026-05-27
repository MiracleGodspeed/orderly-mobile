// Mirrors PromoCardDto on the backend. The mobile dashboard
// carousel maps `iconKey` to a curated Ionicons glyph and calls
// `navigation.navigate(buttonRoute)` on CTA tap.
export interface PromoCard {
  id: string;
  body: string;
  buttonText: string;
  buttonRoute: string;
  iconKey: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  lastUpdated: string | null;
}

export interface GetPromoCardsResponse {
  code: string;
  message: string;
  data: PromoCard[];
}
