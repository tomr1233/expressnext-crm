import { OnboardingList } from "@/components/onboarding/onboarding-list";
import { OnboardingHeader } from "@/components/onboarding/onboarding-header";

export default function OnboardingPage() {
  return (
    <div className="space-y-6">
      <OnboardingHeader />
      <OnboardingList />
    </div>
  );
}