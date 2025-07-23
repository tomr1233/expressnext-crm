import { Button } from "@/components/ui/button";
import { Plus, Filter } from "lucide-react";

export function OnboardingHeader() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Client Onboarding</h1>
        <p className="text-muted-foreground mt-2">Manage post-sale client handoff and setup</p>
      </div>
      <div className="flex items-center space-x-3">
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Onboarding
        </Button>
      </div>
    </div>
  );
}