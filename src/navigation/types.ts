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
  Orders: undefined;
  Store: undefined;
  Reports: undefined;
  Profile: undefined;
  ManageStore: undefined;
  ProductsDashboard: undefined;
  ProductsList: undefined;
  OrderDetails: {
    order: Order;
  };

  ReportsAnalytics: undefined;
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
  Customers: undefined;

};