import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle, Clock, AlertCircle } from "lucide-react";

const onboardingClients = [
  {
    id: 1,
    client: "Acme Corporation",
    assignedTo: "John Doe",
    assignedAvatar: "JD",
    startDate: "2024-01-10",
    progress: 75,
    status: "in-progress",
    steps: [
      { name: "Initial Call", completed: true },
      { name: "Access Provided", completed: true },
      { name: "System Setup", completed: true },
      { name: "Training Session", completed: false },
      { name: "Go Live", completed: false },
    ],
  },
  {
    id: 2,
    client: "TechStart Inc",
    assignedTo: "Sarah Smith",
    assignedAvatar: "SS",
    startDate: "2024-01-12",
    progress: 40,
    status: "in-progress",
    steps: [
      { name: "Initial Call", completed: true },
      { name: "Access Provided", completed: true },
      { name: "System Setup", completed: false },
      { name: "Training Session", completed: false },
      { name: "Go Live", completed: false },
    ],
  },
  {
    id: 3,
    client: "Global Solutions",
    assignedTo: "Mike Johnson",
    assignedAvatar: "MJ",
    startDate: "2024-01-08",
    progress: 100,
    status: "completed",
    steps: [
      { name: "Initial Call", completed: true },
      { name: "Access Provided", completed: true },
      { name: "System Setup", completed: true },
      { name: "Training Session", completed: true },
      { name: "Go Live", completed: true },
    ],
  },
];

export function OnboardingList() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {onboardingClients.map((client) => (
        <Card key={client.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{client.client}</CardTitle>
              <Badge
                variant={
                  client.status === "completed"
                    ? "default"
                    : client.status === "in-progress"
                    ? "secondary"
                    : "destructive"
                }
              >
                {client.status === "completed" && <CheckCircle className="h-3 w-3 mr-1" />}
                {client.status === "in-progress" && <Clock className="h-3 w-3 mr-1" />}
                {client.status === "delayed" && <AlertCircle className="h-3 w-3 mr-1" />}
                {client.status.replace("-", " ")}
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={`/avatars/${client.assignedAvatar.toLowerCase()}.png`} />
                <AvatarFallback className="text-xs">{client.assignedAvatar}</AvatarFallback>
              </Avatar>
              <span className="text-sm text-gray-600">{client.assignedTo}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Progress</span>
                  <span className="text-sm font-medium">{client.progress}%</span>
                </div>
                <Progress value={client.progress} className="h-2" />
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-900">Onboarding Steps</h4>
                {client.steps.map((step, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    {step.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                    )}
                    <span
                      className={`text-sm ${
                        step.completed ? "text-gray-900" : "text-gray-500"
                      }`}
                    >
                      {step.name}
                    </span>
                  </div>
                ))}
              </div>

              <div className="text-xs text-gray-500">
                Started: {new Date(client.startDate).toLocaleDateString()}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}