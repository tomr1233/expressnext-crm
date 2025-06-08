import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Target, CheckCircle, DollarSign } from "lucide-react";

const stats = [
  {
    title: "Total Leads",
    value: "1,234",
    change: "+12%",
    changeType: "positive" as const,
    icon: Users,
  },
  {
    title: "Active Deals",
    value: "23",
    change: "+5%",
    changeType: "positive" as const,
    icon: Target,
  },
  {
    title: "Deals Closed This Month",
    value: "8",
    change: "+25%",
    changeType: "positive" as const,
    icon: CheckCircle,
  },
  {
    title: "Monthly Revenue",
    value: "$45,231",
    change: "+18%",
    changeType: "positive" as const,
    icon: DollarSign,
  },
];

export function DashboardStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {stat.title}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <p className="text-xs text-green-600 mt-1">
              {stat.change} from last month
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}