import { useEffect, useRef, useState } from "react";
import {
  Briefcase,
  Building2,
  ChevronRight,
  Contact,
  LayoutDashboard,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  adminNavGroupForTab,
  visibleAdminNav,
  type AdminAccess,
  type AdminNavGroupId,
  type AdminTab,
} from "@/lib/permissions";
import { cn } from "@/lib/utils";

const GROUP_ICONS: Record<AdminNavGroupId, LucideIcon> = {
  expenses: Wallet,
  leads: Contact,
  users: Users,
  organization: Building2,
  careers: Briefcase,
};

const itemClass =
  "flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function openSetFor(tab: AdminTab): Set<AdminNavGroupId> {
  const group = adminNavGroupForTab(tab);
  return group ? new Set([group.id]) : new Set();
}

export function AdminSidebarNav({
  access,
  tab,
  onSelect,
  className,
}: {
  access: AdminAccess;
  tab: AdminTab;
  onSelect: (tab: AdminTab) => void;
  className?: string;
}) {
  const entries = visibleAdminNav(access);
  const activeItemRef = useRef<HTMLButtonElement>(null);
  const [openGroups, setOpenGroups] = useState<ReadonlySet<AdminNavGroupId>>(() => openSetFor(tab));

  useEffect(() => {
    const group = adminNavGroupForTab(tab);
    if (!group) return;
    setOpenGroups((current) => {
      if (current.has(group.id)) return current;
      const next = new Set(current);
      next.add(group.id);
      return next;
    });
  }, [tab]);

  useEffect(() => {
    const node = activeItemRef.current;
    if (!node || typeof node.scrollIntoView !== "function") return;
    node.scrollIntoView({ block: "nearest" });
  }, [tab, openGroups]);

  function setGroupOpen(id: AdminNavGroupId, open: boolean) {
    setOpenGroups((current) => {
      const next = new Set(current);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <nav
      aria-label="Admin"
      className={cn(
        "flex flex-col gap-0.5 overflow-y-auto overscroll-contain px-3 pb-3",
        className,
      )}
    >
      {entries.map((entry) => {
        if (entry.kind === "link") {
          const active = tab === entry.item.id;
          const Icon = entry.item.id === "overview" ? LayoutDashboard : undefined;
          return (
            <button
              key={entry.item.id}
              ref={active ? activeItemRef : undefined}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => onSelect(entry.item.id)}
              className={cn(
                itemClass,
                active
                  ? "bg-secondary font-semibold text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden /> : null}
              <span className="truncate">{entry.item.label}</span>
            </button>
          );
        }

        const Icon = GROUP_ICONS[entry.id];
        const open = openGroups.has(entry.id);
        const containsActive = entry.items.some((item) => item.id === tab);
        return (
          <Collapsible
            key={entry.id}
            open={open}
            onOpenChange={(next) => setGroupOpen(entry.id, next)}
          >
            <CollapsibleTrigger
              className={cn(
                itemClass,
                containsActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 truncate" title={entry.label}>{entry.label}</span>
              <ChevronRight
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                  open && "rotate-90",
                )}
                aria-hidden
              />
            </CollapsibleTrigger>
            <CollapsibleContent id={`admin-nav-${entry.id}`} className="admin-nav-submenu">
              <div
                role="group"
                aria-label={entry.label}
                className="ml-5 space-y-0.5 border-l border-border py-1 pl-2"
              >
                {entry.items.map((item) => {
                  const active = tab === item.id;
                  return (
                    <button
                      key={item.id}
                      ref={active ? activeItemRef : undefined}
                      type="button"
                      aria-current={active ? "page" : undefined}
                      onClick={() => onSelect(item.id)}
                      className={cn(
                        "flex w-full min-w-0 items-center rounded-md border-l-2 px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active
                          ? "border-primary bg-secondary font-semibold text-primary"
                          : "border-transparent font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <span className="truncate" title={item.label}>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </nav>
  );
}
