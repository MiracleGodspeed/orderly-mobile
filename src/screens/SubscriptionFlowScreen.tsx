import React, { useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";

import RenewSubscriptionStep from "../components/RenewSubscriptionStep";
import PaymentMethodStep from "../components/PaymentMethodStep";
import SubscriptionSuccessStep from "../components/SubscriptionSuccessStep";

export default function SubscriptionFlowScreen() {
  // These hooks are only allowed here because this is the 'Screen'
  const navigation = useNavigation();
  const route = useRoute<any>();

  const [step, setStep] = useState<"renew" | "payment" | "success">("renew");
  const [cycle, setCycle] = useState<"Monthly" | "Quarterly" | "Yearly">("Monthly");
  const [selectedPlan, setSelectedPlan] = useState({
    name: route.params?.initialPlanName || "Pro",
    price: 0,
  });

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <View className="flex-1">
        {step === "renew" && (
          <RenewSubscriptionStep
            selectedPlan={selectedPlan}
            billingCycle={cycle}
            setBillingCycle={setCycle} // Pass the setter down
            onContinue={(plan, chosenCycle) => {
              let finalPrice = plan.price;
              if (chosenCycle === "Quarterly") finalPrice = plan.price * 3;
              if (chosenCycle === "Yearly") finalPrice = plan.price * 12 * 0.9;

              setSelectedPlan({ name: plan.name, price: finalPrice });
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
            onPay={() => setStep("success")}
          />
        )}

        {step === "success" && (
          <SubscriptionSuccessStep onDone={() => navigation.goBack()} />
        )}
      </View>
    </SafeAreaView>
  );
}