import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Settings, User, MapPin, School, BookOpen } from "lucide-react";
import logo from "@/assets/logo.png";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { AppNavProvider, NavRole, useAppNav } from "@/contexts/AppNavContext";
import { BottomNav } from "@/components/layout/BottomNav";
import { cn } from "@/lib/utils";

const RoleViewToggle = () => {
  const { accountRole, viewRole, setViewRole, canToggleRole } = useAppNav();
  if (!canToggleRole) return null;

  const options: { id: NavRole; label: string }[] = [
    { id: accountRole, label: accountRole === "school_admin" ? "Admin" : "Teacher" },
    { id: "student", label: "Student" },
  ];

  return (
    <div
      className="hidden sm:flex items-center gap-0.5 rounded-full border p-0.5"
      role="group"
      aria-label="Switch dashboard view"
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => setViewRole(option.id)}
          className={cn(
            "rounded-full px-3 text-xs font-medium transition-colors btn-sm",
            viewRole === option.id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};


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
    <div className="min-h-screen bg-background safe-area-inset">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-2 sm:py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            <img src={logo} alt="Codex Logo" className="w-8 h-8 sm:w-10 sm:h-10 object-contain flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg lg:text-xl font-bold truncate">Ignite Learn Connect</h1>
              <p className="text-xs sm:text-sm text-muted-foreground capitalize truncate">
                {userProfile?.role} Dashboard
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full flex-shrink-0">
                <Avatar className="h-9 w-9 sm:h-10 sm:w-10">
                  <AvatarFallback className="bg-primary/10 text-sm sm:text-base">
                    {userProfile?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 sm:w-72" align="end">
              {/* Profile Summary */}
              <div className="px-3 py-3 border-b">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                    <AvatarFallback className="bg-primary/10 text-base sm:text-lg">
                      {userProfile?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm sm:text-base">{userProfile?.full_name || "User"}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    <p className="text-xs text-primary capitalize mt-0.5">{userProfile?.role}</p>
                  </div>
                </div>

                {/* Location & School Info */}
                {(userProfile?.school_name || userProfile?.province) && (
                  <div className="mt-3 pt-3 border-t space-y-1.5 text-xs sm:text-sm">
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
      <main className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        {children}
      </main>
    </div>
  );
};