import { Button } from "@/components/ui/button";
import { Plus, Filter } from "lucide-react";

export function PipelineHeader() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Active Pipeline</h1>
        <p className="text-gray-600 mt-2">Track deals through your sales process</p>
      </div>
      <div className="flex items-center space-x-3">
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Deal
        </Button>
      </div>
    </div>
  );
}