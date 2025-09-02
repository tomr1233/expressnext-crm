"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ExternalLink, Eye, Settings2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lead } from "@/lib/dynamodb";
import { ApiClient } from "@/lib/api-client";

const DEFAULT_COLUMNS = {
  name: { key: 'name', label: 'Name & Company', visible: true },
  source: { key: 'source', label: 'Source', visible: true },
  website: { key: 'website', label: 'Website', visible: true },
  status: { key: 'status', label: 'Status', visible: true },
  actions: { key: 'actions', label: 'Actions', visible: true }
};

export function LeadsList() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [columnVisibility, setColumnVisibility] = useState(DEFAULT_COLUMNS);
  const router = useRouter();

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const response = await ApiClient.get('/api/leads');
        if (!response.ok) {
          throw new Error('Failed to fetch leads');
        }
        const data = await response.json();
        setLeads(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading leads...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-500">Error: {error}</div>
        </CardContent>
      </Card>
    );
  }

  const toggleColumn = (columnKey: string) => {
    setColumnVisibility(prev => ({
      ...prev,
      [columnKey]: {
        ...prev[columnKey as keyof typeof prev],
        visible: !prev[columnKey as keyof typeof prev].visible
      }
    }));
  };

  const visibleColumns = Object.entries(columnVisibility).filter(([_, column]) => column.visible);

  return (
    <Card>
      <CardContent className="p-0">
        <div className="p-4 border-b border-border flex justify-end">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="h-4 w-4 mr-2" />
                Columns
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="end">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Toggle Columns</h4>
                {Object.entries(columnVisibility).map(([key, column]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={key}
                      checked={column.visible}
                      onCheckedChange={() => toggleColumn(key)}
                    />
                    <label htmlFor={key} className="text-sm font-normal">
                      {column.label}
                    </label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                {visibleColumns.map(([key, column]) => (
                  <th key={key} className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {leads.map((lead) => {
                const renderCell = (key: string) => {
                  switch (key) {
                    case 'name':
                      return (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-foreground">
                              {lead.name}
                            </div>
                            <div className="text-sm text-muted-foreground">{lead.company}</div>
                          </div>
                        </td>
                      );
                    case 'source':
                      return (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          {lead.source}
                        </td>
                      );
                    case 'bioMatch':
                      return (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="text-sm font-medium text-foreground">
                              {lead.bio_match}%
                            </div>
                            <div
                              className={`ml-2 h-2 w-16 rounded-full ${
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
                        </td>
                      );
                    case 'followers':
                      return (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          {lead.followers.toLocaleString()}
                        </td>
                      );
                    case 'website':
                      return (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <a
                            href={lead.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80 flex items-center"
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            <span className="text-sm">Visit</span>
                          </a>
                        </td>
                      );
                    case 'status':
                      return (
                        <td className="px-6 py-4 whitespace-nowrap">
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
                        </td>
                      );
                    case 'tags':
                      return (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {lead.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </td>
                      );
                    case 'actions':
                      return (
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/leads/${lead.id}`);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      );
                    default:
                      return null;
                  }
                };

                return (
                  <tr 
                    key={lead.id} 
                    className="hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/leads/${lead.id}`)}
                  >
                    {visibleColumns.map(([key]) => renderCell(key))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}