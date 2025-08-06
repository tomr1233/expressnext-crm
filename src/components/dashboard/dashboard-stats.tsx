"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Target, CheckCircle, DollarSign } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiClient } from "@/lib/api-client";

interface DashboardData {
  totalLeads: number;
  activeDeals: number;
  closedDealsThisMonth: number;
  monthlyRevenue: number;
}

export function DashboardStats() {
  const [data, setData] = useState<DashboardData>({
    totalLeads: 0,
    activeDeals: 0,
    closedDealsThisMonth: 0,
    monthlyRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [leadsRes, dealsRes] = await Promise.all([
          ApiClient.get('/api/leads'),
          ApiClient.get('/api/deals'),
        ]);

        if (!leadsRes.ok || !dealsRes.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const leads = await leadsRes.json();
        const deals = await dealsRes.json();

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const activeDeals = deals.filter((deal: any) => deal.stage !== 'closed' && deal.stage !== 'lost').length;
        
        const closedDealsThisMonth = deals.filter((deal: any) => {
          if (deal.stage !== 'closed') return false;
          const dealDate = new Date(deal.updated_at);
          return dealDate.getMonth() === currentMonth && dealDate.getFullYear() === currentYear;
        }).length;

        const monthlyRevenue = deals
          .filter((deal: any) => {
            if (deal.stage !== 'closed' || !deal.value) return false;
            const dealDate = new Date(deal.updated_at);
            return dealDate.getMonth() === currentMonth && dealDate.getFullYear() === currentYear;
          })
          .reduce((sum: number, deal: any) => sum + (deal.value || 0), 0);

        setData({
          totalLeads: leads.length || 0,
          activeDeals,
          closedDealsThisMonth,
          monthlyRevenue,
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const stats = [
    {
      title: "Total Leads",
      value: data.totalLeads.toLocaleString(),
      icon: Users,
    },
    {
      title: "Active Deals",
      value: data.activeDeals.toString(),
      icon: Target,
    },
    {
      title: "Deals Closed This Month",
      value: data.closedDealsThisMonth.toString(),
      icon: CheckCircle,
    },
    {
      title: "Monthly Revenue",
      value: `$${data.monthlyRevenue.toLocaleString()}`,
      icon: DollarSign,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
