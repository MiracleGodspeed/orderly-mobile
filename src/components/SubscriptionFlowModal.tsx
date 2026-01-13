import { Modal, View } from "react-native";
import { useState, useEffect } from "react";
import RenewSubscriptionStep from "./RenewSubscriptionStep";
import PaymentMethodStep from "./PaymentMethodStep";
import SubscriptionSuccessStep from "./SubscriptionSuccessStep";

type Step = "renew" | "payment" | "success";
type BillingCycle = "Monthly" | "Quarterly" | "Yearly";


export default function SubscriptionFlowModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>("renew");

  const [plan, setPlan] = useState({
    name: "Pro",
    price: 29000,
  });

 const [billingCycle, setBillingCycle] =
  useState<BillingCycle>("Monthly");

   useEffect(() => {
    if (visible) {
      setStep("renew");
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-black/40 justify-end">
        <View className="bg-white rounded-t-3xl min-h-[80%]">
          {step === "renew" && (
            <RenewSubscriptionStep
              selectedPlan={plan}
              billingCycle={billingCycle}
              onContinue={(p, cycle) => {
                setPlan(p);
                setBillingCycle(cycle);
                setStep("payment");
              }}
              onClose={onClose}
            />
          )}

          {step === "payment" && (
            <PaymentMethodStep
              plan={plan}
              billingCycle={billingCycle}
              onBack={() => setStep("renew")}
              onPay={() => setStep("success")}
            />
          )}

          {step === "success" && (
            <SubscriptionSuccessStep onDone={onClose} />
          )}
        </View>
      </View>
    </Modal>
  );
}
