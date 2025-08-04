import { Button } from "@/components/ui/button";
import { Plus, Download, Filter } from "lucide-react";
import { CSVImport } from "./csv-import";

export function LeadsHeader() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Prospecting & Leads</h1>
        <p className="text-muted-foreground mt-2">Manage and qualify your leads</p>
      </div>
      <div className="flex items-center space-x-3">
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
        <CSVImport />
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Lead
        </Button>
      </div>
    </div>
  );
}