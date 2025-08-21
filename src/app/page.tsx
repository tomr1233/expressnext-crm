import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { PipelineOverview } from "@/components/dashboard/pipeline-overview";
import { GoogleAnalyticsOverview } from "@/components/dashboard/google-analytics-overview";
import { ProtectedRoute } from "@/components/auth/protected-route";

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Hi, Welcome to the Dashboard</p>
        </div>
        
        <DashboardStats />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PipelineOverview />
          <RecentActivity />
        </div>
        <GoogleAnalyticsOverview />

      </div>
    </ProtectedRoute>
  );
}
