import { useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";

import RenewSubscriptionStep from "../components/RenewSubscriptionStep";
import UpgradePreviewStep from "../components/UpgradePreviewStep";
import PaymentMethodStep from "../components/PaymentMethodStep";
import SubscriptionSuccessStep from "../components/SubscriptionSuccessStep";
import type { SubscriptionUpgradeQuote } from "../api/vendor/vendor.types";

// Selected-plan snapshot threaded into PaymentMethodStep. Carries the
// three Apple product IDs so PaymentMethodStep can decide whether to
// render the Apple Pay option and which SKU to charge — without re-
// fetching the plan list.
type SelectedPlan = {
  id: number | null;
  name: string;
  price: number;
  appleProductIdMonthly?: string | null;
  appleProductIdQuarterly?: string | null;
  appleProductIdYearly?: string | null;
};

export default function SubscriptionFlowScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();

  const [step, setStep] = useState<
    "renew" | "upgrade" | "payment" | "success"
  >("renew");
  const [cycle, setCycle] = useState<"Monthly" | "Quarterly" | "Yearly">(
    "Monthly"
  );
  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan>({
    id: null,
    name: route.params?.initialPlanName || "Pro",
    price: 0,
  });
  const [paymentReference, setPaymentReference] = useState<string | undefined>();
  // When set, payment flows through proration: amount is quote.amountDue
  // and the create-subscription call gets applyProrationCredit=true.
  // Null on first-time subs / renewals / trial conversions, so those
  // flows skip the upgrade-preview step entirely.
  const [upgradeQuote, setUpgradeQuote] =
    useState<SubscriptionUpgradeQuote | null>(null);
  // Vendor's current-plan name + active state — threaded down from
  // SubscriptionBilling. Used to detect "is this an upgrade?" so we
  // know whether to insert the preview step between renew and payment.
  const currentPlanName: string | null =
    route.params?.initialPlanName ?? null;
  const currentPlanActive: boolean =
    route.params?.currentPlanActive ?? true;

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50"
      edges={["top", "bottom"]}
    >
      <View className="flex-1 bg-white">
        {step === "renew" && (
          <RenewSubscriptionStep
            selectedPlan={selectedPlan}
            billingCycle={cycle}
            setBillingCycle={setCycle}
            // Default true so existing entry points (deep-link, push,
            // etc.) keep the downgrade gate. SubscriptionBilling
            // explicitly passes false when the current sub has lapsed.
            currentPlanActive={currentPlanActive}
            onContinue={(plan, chosenCycle) => {
              let finalPrice = plan.price;
              if (chosenCycle === "Quarterly") finalPrice = plan.price * 3;
              if (chosenCycle === "Yearly")
                finalPrice = Math.round(plan.price * 12 * 0.9);

              const nextPlan: SelectedPlan = {
                id: plan.id,
                name: plan.name,
                price: finalPrice,
                appleProductIdMonthly: plan.appleProductIdMonthly,
                appleProductIdQuarterly: plan.appleProductIdQuarterly,
                appleProductIdYearly: plan.appleProductIdYearly,
              };
              setSelectedPlan(nextPlan);
              setCycle(chosenCycle);

              // Insert the upgrade-preview step only when this is a
              // genuine upgrade — different paid plan, current sub
              // still in force, and the new plan isn't cheaper than
              // the current one. Web's SubscriptionFlowModal applies
              // the same gate so the two surfaces stay in lockstep.
              const isUpgradeSelection =
                currentPlanActive &&
                !!currentPlanName &&
                plan.name !== currentPlanName;
              // Reset any prior quote — UpgradePreviewStep refetches
              // on mount from a known-empty state.
              setUpgradeQuote(null);
              setStep(isUpgradeSelection ? "upgrade" : "payment");
            }}
            onClose={() => navigation.goBack()}
          />
        )}

        {step === "upgrade" && (
          <UpgradePreviewStep
            plan={selectedPlan}
            billingCycle={cycle}
            onBack={() => setStep("renew")}
            onContinue={(quote) => {
              // If the server says no (e.g. it's actually a downgrade
              // by price even though plan name differs), abort back to
              // the picker rather than carrying a bad selection
              // forward. UpgradePreviewStep already blocks the CTA in
              // this case but this is a belt-and-braces guard.
              if (!quote.canProceed) {
                setStep("renew");
                return;
              }
              setUpgradeQuote(quote);
              setStep("payment");
            }}
          />
        )}

        {step === "payment" && (
          <PaymentMethodStep
            plan={selectedPlan}
            billingCycle={cycle}
            upgradeQuote={upgradeQuote}
            onBack={() => setStep(upgradeQuote ? "upgrade" : "renew")}
            onPaymentVerified={(reference) => {
              setPaymentReference(reference);
              setStep("success");
            }}
          />
        )}

        {step === "success" && (
          <SubscriptionSuccessStep
            planName={selectedPlan.name}
            amount={upgradeQuote?.amountDue ?? selectedPlan.price}
            billingCycle={cycle}
            paymentReference={paymentReference}
            onDone={() => navigation.goBack()}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
