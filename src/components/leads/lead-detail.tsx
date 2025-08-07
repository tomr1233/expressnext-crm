"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Calendar, User, Building, Globe, TrendingUp, Tag } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lead } from "@/lib/dynamodb";
import { ApiClient } from "@/lib/api-client";

interface LeadDetailProps {
  leadId: string;
}

export function LeadDetail({ leadId }: LeadDetailProps) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchLead = async () => {
      try {
        const response = await ApiClient.get(`/api/leads/${leadId}`);
        if (!response.ok) {
          throw new Error(response.status === 404 ? 'Lead not found' : 'Failed to fetch lead');
        }
        const data = await response.json();
        setLead(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchLead();
  }, [leadId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading lead details...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/leads')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Leads
          </Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-500">Error: {error}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!lead) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/leads')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Leads
        </Button>
        <Badge
          variant={
            lead.status === "qualified"
              ? "default"
              : lead.status === "unqualified"
              ? "destructive"
              : "secondary"
          }
        >
          {lead.status}
        </Badge>
      </div>

      {/* Main lead information */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <User className="h-6 w-6" />
                {lead.name}
              </CardTitle>
              <CardDescription className="text-lg flex items-center gap-2 mt-2">
                <Building className="h-4 w-4" />
                {lead.company}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Bio Match Score */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-full">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Bio Match Score</p>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-semibold">{lead.bio_match}%</p>
                  <div
                    className={`h-2 w-16 rounded-full ${
                      lead.bio_match >= 80
                        ? "bg-green-200 dark:bg-green-900"
                        : lead.bio_match >= 60
                        ? "bg-yellow-200 dark:bg-yellow-900"
                        : "bg-red-200 dark:bg-red-900"
                    }`}
                  >
                    <div
                      className={`h-2 rounded-full ${
                        lead.bio_match >= 80
                          ? "bg-green-500 dark:bg-green-400"
                          : lead.bio_match >= 60
                          ? "bg-yellow-500 dark:bg-yellow-400"
                          : "bg-red-500 dark:bg-red-400"
                      }`}
                      style={{ width: `${lead.bio_match}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Followers */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Followers</p>
                <p className="text-lg font-semibold">{lead.followers.toLocaleString()}</p>
              </div>
            </div>

            {/* Source */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                <Globe className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Source</p>
                <p className="text-lg font-semibold">{lead.source}</p>
              </div>
            </div>
          </div>

          {/* Website */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Website</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(lead.website, '_blank')}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Visit Website
            </Button>
          </div>

          {/* Tags */}
          {lead.tags.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Tags</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {lead.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Created: {new Date(lead.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Updated: {new Date(lead.updated_at).toLocaleDateString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}