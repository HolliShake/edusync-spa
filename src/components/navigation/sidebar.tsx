import { cn } from '@/lib/utils';
import { ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DASHROUTES } from '@/navigation/dashboard';
import type { Route } from '@/types';
import { NavLink, useLocation } from 'react-router-dom';
import { isValidElement, type ReactElement, type ReactNode, cloneElement, useMemo, useState } from 'react';

type AppSideBarProps = {
  isCollapsed: boolean;
  setIsCollapsed: (isCollapsed: boolean) => void;
};

export default function AppSideBar({ isCollapsed, setIsCollapsed }: AppSideBarProps) {
  const [expandedRoutes, setExpandedRoutes] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();

  const routes = useMemo(() => {
    const filterRoutes = (items: Route[]): Route[] =>
      items
        .filter((route) => route.dashboard && route.subroute !== true)
        .map((route) => ({
          ...route,
          children: route.children ? filterRoutes(route.children) : [],
        }));

    return filterRoutes(DASHROUTES);
  }, []);

  const toggleRoute = (path: string) => {
    setExpandedRoutes((current) => ({
      ...current,
      [path]: !current[path],
    }));
  };

  const filteredRoutes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return routes;
    }

    const filterRouteItems = (items: Route[]): Route[] => {
      return items.reduce<Route[]>((acc, route) => {
        const children = route.children ? filterRouteItems(route.children) : [];
        const matches = route.label.toLowerCase().includes(query);

        if (matches || children.length > 0) {
          acc.push({
            ...route,
            children,
          });
        }

        return acc;
      }, []);
    };

    return filterRouteItems(routes);
  }, [routes, searchQuery]);

  const isRouteActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const renderIcon = (icon: ReactNode) => {
    if (!icon) {
      return <span className="block size-2 rounded-full bg-current opacity-70" />;
    }

    if (isValidElement(icon)) {
      const element = icon as ReactElement<{ className?: string }>;

      return cloneElement(element, {
        className: cn('h-4 w-4 shrink-0 transition-colors', element.props.className),
      });
    }

    return icon;
  };

  const renderRouteItems = (items: Route[], depth = 0): React.ReactNode => {
    return items.map((route) => {
      const hasChildren = (route.children?.length ?? 0) > 0;
      const isExpanded = searchQuery ? true : expandedRoutes[route.path] ?? true;
      const isActive = isRouteActive(route.path);

      return (
        <div
          key={`${route.path}-${route.label}-${depth}`}
          className="flex flex-col gap-1"
        >
          <div
            className={cn(
              'flex items-center',
              isCollapsed && 'w-full justify-center'
            )}
          >
            {hasChildren ? (
              <button
                type="button"
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium outline-none transition-all duration-200',
                  'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                  'focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                  isExpanded && 'text-sidebar-foreground',
                  isActive && 'bg-sidebar-accent text-sidebar-foreground',
                  isCollapsed && 'size-10 justify-center px-0 py-0'
                )}
                onClick={() => toggleRoute(route.path)}
                aria-expanded={isExpanded}
                aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${route.label}`}
              >
                <span className="flex size-5 shrink-0 items-center justify-center">
                  {renderIcon(route.icon)}
                </span>
                {!isCollapsed && <span className="flex-1 truncate">{route.label}</span>}
                {!isCollapsed && (
                  <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 transition-transform duration-200 opacity-50', !isExpanded && '-rotate-90')} />
                )}
              </button>
            ) : (
              <NavLink
                to={route.path}
                className={({ isActive }) =>
                  cn(
                    'relative group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium outline-none transition-all duration-200',
                    'hover:bg-sidebar-accent hover:text-sidebar-foreground',
                    'focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                    isActive 
                      ? 'bg-sidebar-accent text-sidebar-foreground shadow-sm' 
                      : 'text-sidebar-foreground/70',
                    isCollapsed && 'size-10 justify-center px-0 py-0'
                  )
                }
              >
                <span className="flex size-5 shrink-0 items-center justify-center">
                  {renderIcon(route.icon)}
                </span>
                {!isCollapsed && <span className="flex-1 truncate">{route.label}</span>}
              </NavLink>
            )}
          </div>

          {hasChildren && !isCollapsed && isExpanded && (
            <div className="ml-5 flex flex-col gap-1 border-l border-sidebar-border pl-2.5">
              {renderRouteItems(route.children!, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <aside
      className={cn(
        'relative z-30 flex h-full shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300',
        isCollapsed ? 'w-0 overflow-hidden lg:w-16' : 'w-64'
      )}
    >
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-sidebar-border px-4 py-2">
        {!isCollapsed && (
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg border border-sidebar-border bg-sidebar-accent text-sidebar-foreground shadow-sm">
              <ChevronRight className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">API Navigation</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn('shrink-0 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent', !isCollapsed && 'ml-auto h-8 w-8')}
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
      {!isCollapsed && (
        <div className="border-b border-sidebar-border px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-(--sidebar-search-foreground)" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search"
              className="h-8 border-(--sidebar-search-border) bg-(--sidebar-search-background) pl-8 text-sm text-sidebar-foreground placeholder:text-(--sidebar-search-foreground)"
            />
          </div>
        </div>
      )}
      <nav className="flex-1 overflow-y-auto p-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-sidebar-border/60 hover:[&::-webkit-scrollbar-thumb]:bg-sidebar-border outline-none">
        <div className="flex flex-col gap-1">
          {filteredRoutes.length > 0 ? (
            renderRouteItems(filteredRoutes)
          ) : (
            !isCollapsed && (
              <div className="rounded-lg border border-dashed border-sidebar-border px-3 py-4 text-center text-xs text-sidebar-foreground/60">
                No routes found.
              </div>
            )
          )}
        </div>
      </nav>
    </aside>
  );
}
