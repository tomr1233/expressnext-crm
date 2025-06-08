"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DollarSign, Calendar } from "lucide-react";

const stages = [
  { id: "contacted", name: "Contacted", color: "bg-blue-100 border-blue-200" },
  { id: "demo", name: "Demo Scheduled", color: "bg-yellow-100 border-yellow-200" },
  { id: "negotiating", name: "Negotiating", color: "bg-orange-100 border-orange-200" },
  { id: "proposal", name: "Proposal Sent", color: "bg-green-100 border-green-200" },
];

const deals = [
  {
    id: 1,
    title: "Acme Corp Automation",
    company: "Acme Corp",
    value: 15000,
    stage: "contacted",
    owner: "John Doe",
    ownerAvatar: "JD",
    dueDate: "2024-01-15",
  },
  {
    id: 2,
    title: "TechStart AI Integration",
    company: "TechStart Inc",
    value: 25000,
    stage: "demo",
    owner: "Sarah Smith",
    ownerAvatar: "SS",
    dueDate: "2024-01-20",
  },
  {
    id: 3,
    title: "Global Solutions CRM",
    company: "Global Solutions",
    value: 35000,
    stage: "negotiating",
    owner: "Mike Johnson",
    ownerAvatar: "MJ",
    dueDate: "2024-01-25",
  },
  {
    id: 4,
    title: "Digital Labs Workflow",
    company: "Digital Labs",
    value: 20000,
    stage: "proposal",
    owner: "Emily Davis",
    ownerAvatar: "ED",
    dueDate: "2024-01-30",
  },
];

export function PipelineBoard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stages.map((stage) => {
        const stageDeals = deals.filter((deal) => deal.stage === stage.id);
        const stageValue = stageDeals.reduce((sum, deal) => sum + deal.value, 0);

        return (
          <div key={stage.id} className="space-y-4">
            <div className={`p-4 rounded-lg border-2 ${stage.color}`}>
              <h3 className="font-semibold text-gray-900">{stage.name}</h3>
              <p className="text-sm text-gray-600 mt-1">
                {stageDeals.length} deals • ${stageValue.toLocaleString()}
              </p>
            </div>

            <div className="space-y-3">
              {stageDeals.map((deal) => (
                <Card key={deal.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">{deal.title}</CardTitle>
                    <p className="text-xs text-gray-500">{deal.company}</p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <DollarSign className="h-4 w-4 mr-1" />
                        ${deal.value.toLocaleString()}
                      </div>
                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(deal.dueDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={`/avatars/${deal.ownerAvatar.toLowerCase()}.png`} />
                        <AvatarFallback className="text-xs">{deal.ownerAvatar}</AvatarFallback>
                      </Avatar>
                      <Badge variant="outline" className="text-xs">
                        {deal.owner}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}