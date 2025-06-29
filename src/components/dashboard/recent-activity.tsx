import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

const activities = [
  {
    id: 1,
    user: "John Doe",
    action: "closed deal with",
    target: "Acme Corp",
    time: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    avatar: "JD",
  },
  {
    id: 2,
    user: "Sarah Smith",
    action: "added new lead",
    target: "TechStart Inc",
    time: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    avatar: "SS",
  },
  {
    id: 3,
    user: "Mike Johnson",
    action: "moved deal to",
    target: "Negotiating stage",
    time: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
    avatar: "MJ",
  },
  {
    id: 4,
    user: "Emily Davis",
    action: "completed onboarding for",
    target: "Global Solutions",
    time: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
    avatar: "ED",
  },
];

export function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-center space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={`/avatars/${activity.avatar.toLowerCase()}.png`} />
                <AvatarFallback>{activity.avatar}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">
                  <span className="font-medium">{activity.user}</span>{" "}
                  {activity.action}{" "}
                  <span className="font-medium">{activity.target}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(activity.time, { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}