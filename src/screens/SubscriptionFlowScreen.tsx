import { useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";

import RenewSubscriptionStep from "../components/RenewSubscriptionStep";
import PaymentMethodStep from "../components/PaymentMethodStep";
import SubscriptionSuccessStep from "../components/SubscriptionSuccessStep";

type SelectedPlan = {
  id: number | null;
  name: string;
  price: number;
};

export default function SubscriptionFlowScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();

  const [step, setStep] = useState<"renew" | "payment" | "success">("renew");
  const [cycle, setCycle] = useState<"Monthly" | "Quarterly" | "Yearly">(
    "Monthly"
  );
  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan>({
    id: null,
    name: route.params?.initialPlanName || "Pro",
    price: 0,
  });
  const [paymentReference, setPaymentReference] = useState<string | undefined>();

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
            currentPlanActive={route.params?.currentPlanActive ?? true}
            onContinue={(plan, chosenCycle) => {
              let finalPrice = plan.price;
              if (chosenCycle === "Quarterly") finalPrice = plan.price * 3;
              if (chosenCycle === "Yearly")
                finalPrice = Math.round(plan.price * 12 * 0.9);

              setSelectedPlan({ id: plan.id, name: plan.name, price: finalPrice });
              setCycle(chosenCycle);
              setStep("payment");
            }}
            onClose={() => navigation.goBack()}
          />
        )}

        {step === "payment" && (
          <PaymentMethodStep
            plan={selectedPlan}
            billingCycle={cycle}
            onBack={() => setStep("renew")}
            onPaymentVerified={(reference) => {
              setPaymentReference(reference);
              setStep("success");
            }}
          />
        )}

        {step === "success" && (
          <SubscriptionSuccessStep
            planName={selectedPlan.name}
            amount={selectedPlan.price}
            billingCycle={cycle}
            paymentReference={paymentReference}
            onDone={() => navigation.goBack()}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
