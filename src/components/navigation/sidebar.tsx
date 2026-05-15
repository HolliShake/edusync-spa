import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DASHROUTES } from '@/navigation/dashboard';
import type { Route } from '@/types';
import { NavLink } from 'react-router-dom';

type AppSideBarProps = {
  isCollapsed: boolean;
  setIsCollapsed: (isCollapsed: boolean) => void;
};

export default function AppSideBar({ isCollapsed, setIsCollapsed }: AppSideBarProps) {
  const routes: Route[] = [...DASHROUTES.filter(r => r.dashboard && (!r.subroute === true || r.subroute === undefined))];

  const renderRouteItems = (items: Route[], depth = 0): React.ReactNode => {
    return items.map((route) => {
      const hasChildren = (route.children?.length ?? 0) > 0;

      return (
        <div key={`${route.path}-${route.label}-${depth}`} className="space-y-1">
          <NavLink
            to={route.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                isActive && 'bg-sidebar-accent text-sidebar-accent-foreground',
                depth > 0 && 'ml-4'
              )
            }
          >
            <span className="shrink-0">{route.icon}</span>
            {!isCollapsed && <span className="truncate">{route.label}</span>}
          </NavLink>

          {hasChildren && !isCollapsed && <div>{renderRouteItems(route.children!, depth + 1)}</div>}
        </div>
      );
    });
  };

  return (
    <aside
      className={cn(
        'relative flex flex-col h-full border-r bg-sidebar text-sidebar-foreground transition-all duration-300 shrink-0 z-30',
        isCollapsed ? 'w-0 overflow-hidden lg:w-14' : 'w-64'
      )}
    >
      <div className="flex items-center justify-between h-14 px-3 border-b shrink-0">
        {!isCollapsed && <span className="font-semibold text-sm">Navigation</span>}
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">{renderRouteItems(routes)}</div>
      </nav>
    </aside>
  );
}
