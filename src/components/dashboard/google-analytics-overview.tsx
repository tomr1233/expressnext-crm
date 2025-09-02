"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { MousePointer, TrendingUp, Clock, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiClient } from "@/lib/api-client";

interface AnalyticsMetrics {
  activeUsers: number;
  sessions: number;
  pageViews: number;
  bounceRate: number;
  avgSessionDuration: number;
  newUsers: number;
}

interface TopPage {
  path: string;
  pageViews: number;
  uniquePageViews: number;
}

interface TrafficSource {
  source: string;
  sessions: number;
  users: number;
}

export function GoogleAnalyticsOverview() {
  const [metrics, setMetrics] = useState<AnalyticsMetrics>({
    activeUsers: 0,
    sessions: 0,
    pageViews: 0,
    bounceRate: 0,
    avgSessionDuration: 0,
    newUsers: 0,
  });
  const [topPages, setTopPages] = useState<TopPage[]>([]);
  const [trafficSources, setTrafficSources] = useState<TrafficSource[]>([]);
  const [realtimeUsers, setRealtimeUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        const [overviewRes, topPagesRes, trafficRes, realtimeRes] = await Promise.all([
          ApiClient.get('/api/analytics/overview'),
          ApiClient.get('/api/analytics/top-pages'),
          ApiClient.get('/api/analytics/traffic-sources'),
          ApiClient.get('/api/analytics/realtime'),
        ]);

        if (overviewRes.ok) {
          setMetrics(await overviewRes.json());
        }
        if (topPagesRes.ok) {
          setTopPages(await topPagesRes.json());
        }
        if (trafficRes.ok) {
          setTrafficSources(await trafficRes.json());
        }
        if (realtimeRes.ok) {
          const realtime = await realtimeRes.json();
          setRealtimeUsers(realtime.activeUsers);
        }
      } catch (_error) {
        setError('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatBounceRate = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`;
  };

  const metricsCards = [
    {
      title: "Real Time Sessions and Page Views",
      value: loading ? 0 : metrics.sessions.toLocaleString(),
      icon: MousePointer,
      color: "text-green-600",
    },
    {
      title: "New Visitors Past 7 Days",
      value: loading ? 0 : metrics.newUsers.toLocaleString(),
      icon: UserPlus,
      color: "text-orange-600",
    },
    {
      title: "Average Session Duration",
      value: loading ? "0:00" : formatDuration(metrics.avgSessionDuration),
      icon: Clock,
      color: "text-indigo-600",
    },
    {
      title: "Bounce Rate",
      value: loading ? "0%" : formatBounceRate(metrics.bounceRate),
      icon: TrendingUp,
      color: "text-red-600",
    },
  ];

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Google Analytics Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="h-6 w-6" />
          Google Analytics Overview
        </h2>
        <Badge variant="secondary" className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          {loading ? "..." : realtimeUsers} users online
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metricsCards.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <metric.icon className={`h-4 w-4 ${metric.color}`} />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold text-foreground">{metric.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Traffic Sources (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {trafficSources.length > 0 ? (
                  trafficSources.map((source, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                      <span className="text-sm text-foreground">
                        {source.source === "(direct)" ? "Direct Traffic" : source.source === "linkedin.com" ? "LinkedIn" : source.source}
                      </span>
                      <div className="text-right">
                        <div className="text-sm font-medium text-foreground">
                          {source.sessions.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {source.users.toLocaleString()} users
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">No data available</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}