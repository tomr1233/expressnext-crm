import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const pipelineStages = [
  { name: "Contacted", count: 12, value: "$45,000" },
  { name: "Demo Scheduled", count: 8, value: "$32,000" },
  { name: "Negotiating", count: 5, value: "$28,000" },
  { name: "Proposal Sent", count: 3, value: "$15,000" },
];

export function PipelineOverview() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {pipelineStages.map((stage) => (
            <div key={stage.name} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{stage.name}</p>
                <p className="text-xs text-gray-500">{stage.count} deals</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{stage.value}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}