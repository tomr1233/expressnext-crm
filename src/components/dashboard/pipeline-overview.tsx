"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { ApiClient } from "@/lib/api-client";
import { Deal } from "@/lib/supabase";

interface PipelineStage {
  name: string;
  count: number;
  value: number;
}

export function PipelineOverview() {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPipelineData = async () => {
      try {
        const response = await ApiClient.get('/api/deals');
        if (!response.ok) {
          throw new Error('Failed to fetch pipeline data');
        }
        const deals = await response.json();

        const stageGroups = deals.reduce((acc: Record<string, { count: number; value: number }>, deal: Deal) => {
          const stage = deal.stage || 'Unknown';
          if (!acc[stage]) {
            acc[stage] = { count: 0, value: 0 };
          }
          acc[stage].count++;
          acc[stage].value += deal.value || 0;
          return acc;
        }, {});

        const pipelineStages = Object.entries(stageGroups).map(([name, data]) => ({
          name,
          count: (data as { count: number; value: number }).count,
          value: (data as { count: number; value: number }).value,
        }));

        setStages(pipelineStages);
      } catch (error) {
        console.error('Error fetching pipeline data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPipelineData();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between animate-pulse">
                <div>
                  <div className="h-4 bg-muted rounded w-24 mb-1"></div>
                  <div className="h-3 bg-muted rounded w-16"></div>
                </div>
                <div className="h-4 bg-muted rounded w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No pipeline data found.
            </p>
          ) : (
            stages.map((stage) => (
              <div key={stage.name} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{stage.name}</p>
                  <p className="text-xs text-muted-foreground">{stage.count} deals</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">${stage.value.toLocaleString()}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}