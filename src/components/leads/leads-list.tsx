import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Eye } from "lucide-react";

const leads = [
  {
    id: 1,
    name: "Sarah Johnson",
    company: "TechStart Inc",
    source: "LinkedIn",
    bioMatch: 85,
    followers: 1250,
    website: "https://techstart.com",
    status: "qualified",
    tags: ["AI", "SaaS"],
  },
  {
    id: 2,
    name: "Michael Chen",
    company: "Digital Solutions",
    source: "Twitter",
    bioMatch: 72,
    followers: 890,
    website: "https://digitalsol.com",
    status: "unqualified",
    tags: ["Marketing", "Automation"],
  },
  {
    id: 3,
    name: "Emily Rodriguez",
    company: "Growth Labs",
    source: "Cold Email",
    bioMatch: 91,
    followers: 2100,
    website: "https://growthlabs.io",
    status: "new",
    tags: ["Growth", "AI", "B2B"],
  },
];

export function LeadsList() {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name & Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bio Match %
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Followers
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Website
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tags
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {lead.name}
                      </div>
                      <div className="text-sm text-gray-500">{lead.company}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {lead.source}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-gray-900">
                        {lead.bioMatch}%
                      </div>
                      <div
                        className={`ml-2 h-2 w-16 rounded-full ${
                          lead.bioMatch >= 80
                            ? "bg-green-200"
                            : lead.bioMatch >= 60
                            ? "bg-yellow-200"
                            : "bg-red-200"
                        }`}
                      >
                        <div
                          className={`h-2 rounded-full ${
                            lead.bioMatch >= 80
                              ? "bg-green-500"
                              : lead.bioMatch >= 60
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${lead.bioMatch}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {lead.followers.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <a
                      href={lead.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      <span className="text-sm">Visit</span>
                    </a>
                  </td>
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {lead.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}