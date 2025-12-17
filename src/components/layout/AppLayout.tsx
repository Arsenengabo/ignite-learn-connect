import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Settings, User, MapPin, School, BookOpen } from "lucide-react";
import logo from "@/assets/logo.png";
import { ProfileEditor } from "@/components/profile/ProfileEditor";

interface AppLayoutProps {
  children: ReactNode;
  user: any;
  userProfile: any;
  onProfileUpdate?: () => void;
}

export const AppLayout = ({ children, user, userProfile, onProfileUpdate }: AppLayoutProps) => {
  const { toast } = useToast();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out successfully",
      description: "See you next time!"
    });
  };

  const handleProfileUpdate = () => {
    if (onProfileUpdate) {
      onProfileUpdate();
    }
    // Refresh the page to get updated profile
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src={logo} alt="Codex Logo" className="w-10 h-10 object-contain" />
            <div>
              <h1 className="text-xl font-bold">Ignite Learn Connect</h1>
              <p className="text-sm text-muted-foreground capitalize">
                {userProfile?.role} Dashboard
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10">
                    {userProfile?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72" align="end">
              {/* Profile Summary */}
              <div className="px-3 py-3 border-b">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-lg">
                      {userProfile?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{userProfile?.full_name || "User"}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    <p className="text-xs text-primary capitalize mt-0.5">{userProfile?.role}</p>
                  </div>
                </div>

                {/* Location & School Info */}
                {(userProfile?.school_name || userProfile?.province) && (
                  <div className="mt-3 pt-3 border-t space-y-1.5 text-sm">
                    {userProfile?.school_name && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <School className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{userProfile.school_name}</span>
                      </div>
                    )}
                    {userProfile?.province && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">
                          {userProfile.district && `${userProfile.district}, `}{userProfile.province}
                        </span>
                      </div>
                    )}
                    {userProfile?.education_level && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{userProfile.education_level}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="py-1">
                <ProfileEditor 
                  userProfile={userProfile} 
                  userRole={userProfile?.role}
                  onProfileUpdate={handleProfileUpdate}
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <User className="mr-2 h-4 w-4" />
                      Edit Profile
                    </DropdownMenuItem>
                  }
                />
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
              </div>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
};