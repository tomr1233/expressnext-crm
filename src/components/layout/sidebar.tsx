"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image"; // Import the Next.js Image component
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Users,
  Target,
  CheckCircle,
  UserCheck,
  FolderOpen,
  BarChart3,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Prospecting & Leads", href: "/leads", icon: Users },
  { name: "Active Pipeline", href: "/pipeline", icon: Target },
  { name: "Closed Deals", href: "/deals", icon: CheckCircle },
  { name: "Onboarding", href: "/onboarding", icon: UserCheck },
  { name: "Resources", href: "/resources", icon: FolderOpen },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <div
      className={cn(
        "bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* --- MODIFIED HEADER --- */}
      <div
        className={cn(
          "flex items-center p-4 border-b border-sidebar-border",
          // When collapsed, center the button; otherwise, space out logo and button
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        {/* Logo and Title - only shown when not collapsed */}
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="ExpressNext Logo"
              width={32}
              height={32}
            />
            <h1 className="text-xl font-bold text-sidebar-foreground">ExpressNext</h1>
          </div>
        )}

        {/* Collapse/Expand Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
      {/* --- END OF MODIFIED HEADER --- */}

      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground border border-sidebar-border"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                collapsed && "justify-center"
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span className="ml-3">{item.name}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
