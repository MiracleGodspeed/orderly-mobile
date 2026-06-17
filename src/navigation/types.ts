export type OrderStatus = 'Pending' | 'Paid' | 'Shipped';

  export type Order = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  customerName: string;
  amount: string;
   image: any;
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
  Home: undefined;
  // Optional `filter` lets Growth Partner insights deep-link to the
  // orders list pre-scoped (e.g. filter=unfulfilled).
  Orders: { filter?: string } | undefined;
  Store: undefined;
  Reports: undefined;
  Profile: undefined;
  ManageStore: undefined;
  ProductsDashboard: undefined;
  // Optional deep-link params: `filter` (low_stock | out_of_stock) or a
  // specific `productId` to focus.
  ProductsList: { filter?: string; productId?: string } | undefined;
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
  DeleteAccount: undefined;
  LogOrder: undefined;
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