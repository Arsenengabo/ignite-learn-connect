import { useAppNav } from "@/contexts/AppNavContext";
import { cn } from "@/lib/utils";

export const BottomNav = () => {
  const { tabs, activeTab, setActiveTab } = useAppNav();

  return (
    <nav
      aria-label="Main navigation"
      className="ilc-surface fixed bottom-0 left-0 right-0 z-50 border-t lg:hidden"
      style={{
        borderColor: "var(--ilc-hairline)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-1" style={{ height: 72 }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTab;
          return (
            <li key={tab.id} className="flex-1">
              <button
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-full w-full flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-medium transition-colors"
                )}
                style={{ color: isActive ? "var(--ilc-amber)" : "var(--ilc-text-muted)" }}
              >
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.4 : 1.8} />
                <span className="truncate">{tab.label}</span>
                <span
                  className="h-0.5 w-5 rounded-full"
                  style={{ background: isActive ? "var(--ilc-amber)" : "transparent" }}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
