"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DollarSign, Calendar } from "lucide-react";
import { useState, useEffect } from "react";
import { Pipeline, Deal } from "@/lib/dynamodb";

interface PipelineBoardProps {
  pipelineId?: string;
}

export function PipelineBoard({ pipelineId }: PipelineBoardProps) {
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPipelineAndDeals = async () => {
      try {
        // Fetch default pipeline if no specific pipeline ID is provided
        const pipelineResponse = await fetch('/api/pipelines');
        const pipelines = await pipelineResponse.json();
        
        let selectedPipeline = pipelines.find((p: Pipeline) => p.is_default) || pipelines[0];
        if (pipelineId) {
          selectedPipeline = pipelines.find((p: Pipeline) => p.id === pipelineId) || selectedPipeline;
        }
        
        if (!selectedPipeline) {
          throw new Error('No pipeline found');
        }

        setPipeline(selectedPipeline);

        // Fetch deals for this pipeline
        const dealsResponse = await fetch('/api/deals');
        const allDeals = await dealsResponse.json();
        const pipelineDeals = allDeals.filter((deal: Deal) => deal.pipeline_id === selectedPipeline.id);
        setDeals(pipelineDeals);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchPipelineAndDeals();
  }, [pipelineId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading pipeline...</div>
        </CardContent>
      </Card>
    );
  }

  if (error || !pipeline) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-500">Error: {error || 'Pipeline not found'}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {pipeline.stages.map((stage) => {
        const stageDeals = deals.filter((deal) => deal.stage === stage.id);
        const stageValue = stageDeals.reduce((sum, deal) => sum + deal.value, 0);

        return (
          <div key={stage.id} className="space-y-4">
            <div className={`p-4 rounded-lg border-2`} style={{ backgroundColor: stage.color + '20', borderColor: stage.color }}>
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
                        {new Date(deal.due_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">{deal.owner.split(' ').map(n => n[0]).join('')}</AvatarFallback>
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