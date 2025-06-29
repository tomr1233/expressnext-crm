import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

const closedDeals = [
  {
    id: 1,
    client: "Acme Corporation",
    dealValue: 45000,
    closeDate: new Date("2024-01-10"),
    owner: "John Doe",
    notes: "Large enterprise deal with 3-year contract",
    industry: "Manufacturing",
  },
  {
    id: 2,
    client: "TechStart Inc",
    dealValue: 28000,
    closeDate: new Date("2024-01-08"),
    owner: "Sarah Smith",
    notes: "AI automation for customer service",
    industry: "Technology",
  },
  {
    id: 3,
    client: "Global Solutions",
    dealValue: 62000,
    closeDate: new Date("2024-01-05"),
    owner: "Mike Johnson",
    notes: "Complete CRM overhaul and integration",
    industry: "Consulting",
  },
  {
    id: 4,
    client: "Digital Labs",
    dealValue: 35000,
    closeDate: new Date("2024-01-03"),
    owner: "Emily Davis",
    notes: "Workflow automation and AI chatbot",
    industry: "Marketing",
  },
];

export function ClosedDealsTable() {
  const totalValue = closedDeals.reduce((sum, deal) => sum + deal.dealValue, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-foreground">
              ${totalValue.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground">Total Deal Value</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-foreground">
              {closedDeals.length}
            </div>
            <p className="text-sm text-muted-foreground">Deals Closed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-foreground">
              ${Math.round(totalValue / closedDeals.length).toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground">Average Deal Size</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Deal Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Close Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Owner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Industry
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {closedDeals.map((deal) => (
                  <tr key={deal.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-foreground">
                        {deal.client}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-green-600 dark:text-green-400">
                        ${deal.dealValue.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-foreground">
                        {deal.closeDate.toLocaleDateString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(deal.closeDate, { addSuffix: true })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-foreground">{deal.owner}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="outline">{deal.industry}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-foreground max-w-xs truncate">
                        {deal.notes}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}