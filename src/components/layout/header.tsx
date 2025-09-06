"use client";

import { Bell, Search, LogOut, User, Settings, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/contexts/auth-context";
import { Badge } from "@/components/ui/badge";
import { getHighestRole } from "@/lib/auth-roles";

export function Header() {
  const { user, signOut } = useAuth();
  
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleCopyAccessToken = async () => {
    try {
      const accessToken = user?.accessToken;
      if (accessToken) {
        await navigator.clipboard.writeText(accessToken);
        // You could add a toast notification here if you have one
        console.log('Access token copied to clipboard');
      } else {
        console.error('No access token available');
      }
    } catch (error) {
      console.error('Failed to copy access token:', error);
    }
  };
  
  const userInitials = user?.username
    ? user.username.substring(0, 2).toUpperCase()
    : 'U';
    
  const userRole = getHighestRole(user?.groups);

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent w-80 bg-background text-foreground"
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <ThemeToggle />
          
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium leading-none">{user.email}</p>
                      {userRole && (
                        <Badge variant="secondary" className="text-xs">
                          {userRole}
                        </Badge>
                      )}
                    </div>
                    {user.username && (
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.username}
                      </p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyAccessToken}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Access Token
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
