import { Button } from "@/components/ui/button";
import { Download, Filter, Calendar } from "lucide-react";

export function DealsHeader() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Closed Deals</h1>
        <p className="text-gray-600 mt-2">Review your won deals and performance</p>
      </div>
      <div className="flex items-center space-x-3">
        <Button variant="outline" size="sm">
          <Calendar className="h-4 w-4 mr-2" />
          Date Range
        </Button>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>
    </div>
  );
}