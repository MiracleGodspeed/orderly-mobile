export type OrderStatus = 'Pending' | 'Paid' | 'Shipped';

  export type Order = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  customerName: string;
  amount: string;
   image: any;
};

/** Prefill payload for editing a manually-entered offline order — passed
 *  to the LogOrder screen so it opens in edit mode. */
export type EditOfflineOrderParam = {
  batchId: string;
  channel: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  markAsPaid: boolean;
  items: Array<{
    id: string;
    title: string;
    price: number;
    image?: string | null;
    quantity: number;
  }>;
};

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  AuthOptions: undefined;
  Login: undefined;
  Signup: undefined;
  EmailSignUp: undefined;
  OtpVerification: { email: string; password: string };
  OtpSuccess: undefined;
  ForgotPassword: undefined;
  ResetLink: undefined;
  ResetPassword: undefined;
  SetupStep1: undefined;
  SetupStep2: undefined;
  SetupStep3: undefined;
  /** Post-onboarding "your store is live" celebration — stacked on top
   *  of Home by SetupStep3 so dismissing it lands on the dashboard.
   *  Params come straight from the fresh store fetched during setup. */
  StoreLive: { storeName?: string | null; slug?: string | null };
  Home: undefined;
  // Optional `filter` lets Growth Partner insights deep-link to the
  // orders list pre-scoped (e.g. filter=unfulfilled).
  Orders: { filter?: string } | undefined;
  Store: undefined;
  Reports: undefined;
  Profile: undefined;
  ManageStore: undefined;
  WholesalePricing: undefined;
  ProductsDashboard: undefined;
  // Optional deep-link params: `filter` (low_stock | out_of_stock), a
  // specific `productId` to focus, or `openAddProduct` to land with the
  // add-product modal already open (launch celebration, setup checklist,
  // activation pushes).
  ProductsList:
    | { filter?: string; productId?: string; openAddProduct?: boolean }
    | undefined;
  OrderDetails: {
    order: Order;
  };

  ReportsAnalytics: undefined;
  // Dedicated report-download screen (branded PDF / Excel for any week or
  // month) — reached from the dashboard insight card and from Analytics.
  ReportDownload: undefined;
  StoreInformation: undefined;
  PersonalDetails: undefined;
  PayoutSettings: undefined;
  SubscriptionBilling: undefined;
  SubscriptionFlow: { initialPlanName?: string };
  Security: undefined;
  ChangePassword: undefined;
  Notifications: undefined;
  HelpSupport: undefined;
  LegalPolicies: undefined;
  NotificationProfile: undefined;
  LocationManagement: undefined;
  CustomDomain: undefined;
  // Optional `segment` (best | vip | lapsed_60d | lapsed_90d | one_time)
  // opens the Customers screen pre-filtered to a Growth Partner segment
  // with the wa.me broadcast action.
  Customers: { segment?: string } | undefined;
  /** Vendor-facing newsletter management — toggle the storefront prompt
   *  on/off and browse the subscriber list. */
  Newsletter: undefined;
  /** Product ratings & reviews from customers. Plan-gated on
   *  products.reviews. */
  Reviews: undefined;
  /** Coupon/discount code management. Plan-gated on discounts.codes. */
  Discounts: undefined;
  /** The vendor's own order questions — event date, message on the
   *  cake, measurements. Deliberately NOT plan-gated at the nav level:
   *  a downgraded vendor's questions are still live on their storefront
   *  and still collecting, so the screen has to stay reachable and show
   *  them read-only. */
  OrderQuestions: undefined;
  DeleteAccount: undefined;
  // With `edit` set, the LogOrder screen opens in edit mode, prefilled
  // from an existing manually-entered offline order.
  LogOrder: { edit?: EditOfflineOrderParam } | undefined;
  /** Invoices & receipts — list, generate receipts from invoices,
   *  download branded PDFs. */
  Invoices: undefined;
  /** Create an invoice or receipt from catalog products. */
  CreateInvoice: undefined;
  /** Expense tracking — money out, so reports show real profit. */
  Expenses: undefined;
  /** Surface for vendors to reject a manual bank-transfer payment.
   *  Reached from the Reject action button on the actionable push, or
   *  manually from order details when the payment is awaiting
   *  confirmation. The reference uniquely identifies the payment;
   *  customerName + orderTotal are passed for header context only and
   *  the screen falls back gracefully when they're absent. */
  RejectManualPayment: {
    reference: string;
    customerName?: string;
    orderTotal?: number;
  };
  /** Lets the vendor pick how customers pay them — Online (Paystack) vs
   *  Direct to bank — and, for online, who absorbs the platform fee.
   *  The Direct option is what unlocks the manual-payment Confirm/Reject
   *  push flow added alongside this screen. */
  PaymentSetup: undefined;
  /** Vendor-facing staff & permissions screen. Lists current teammates,
   *  shows the seat-count vs plan limit, and lets the vendor invite,
   *  edit, suspend, reactivate, and remove staff. Gated on the
   *  STAFF_ACCOUNTS feature key. */
  StaffManagement: undefined;
  /** Top-level "More" hub — the destination of the fifth tab. Holds
   *  every secondary feature area (store config, billing, workspace,
   *  support). Profile (personal info) is a separate sub-screen
   *  reached via the profile pill at the top of this hub. */
  MoreHub: undefined;

};