import { Button } from "@/components/ui/button";
import { useAppNav } from "@/contexts/AppNavContext";
import { cn } from "@/lib/utils";

export const DesktopNav = () => {
  const { tabs, activeTab, setActiveTab } = useAppNav();

  return (
    <nav
      aria-label="Main navigation"
      className="ilc-surface hidden border-b md:block"
      style={{ borderColor: "var(--ilc-hairline)" }}
    >
      <div className="container mx-auto flex items-center gap-1 overflow-x-auto px-4 py-2 lg:px-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTab;

          return (
            <Button
              key={tab.id}
              type="button"
              variant="ghost"
              onClick={() => setActiveTab(tab.id)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative shrink-0 lg:min-w-[104px] gap-2 rounded-lg px-4 text-sm transition-colors",
                isActive ? "font-semibold" : "font-medium"
              )}
              style={{
                background: isActive ? "var(--ilc-teal-glow)" : "transparent",
                color: isActive ? "var(--ilc-teal)" : "var(--ilc-text-muted)",
              }}
            >
              <Icon className="h-4 w-4" strokeWidth={isActive ? 2.4 : 1.8} />
              {tab.label}
              <span
                aria-hidden="true"
                className="absolute inset-x-4 -bottom-2 h-0.5 rounded-full"
                style={{ background: isActive ? "var(--ilc-teal)" : "transparent" }}
              />
            </Button>
          );
        })}
      </div>
    </nav>
  );
};