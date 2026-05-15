import { cn } from '@/lib/utils';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DASHROUTES } from '@/navigation/dashboard';
import type { Route } from '@/types';
import { NavLink } from 'react-router-dom';
import { isValidElement, type ReactElement, type ReactNode, cloneElement, useMemo, useState } from 'react';

type AppSideBarProps = {
  isCollapsed: boolean;
  setIsCollapsed: (isCollapsed: boolean) => void;
};

export default function AppSideBar({ isCollapsed, setIsCollapsed }: AppSideBarProps) {
  const [expandedRoutes, setExpandedRoutes] = useState<Record<string, boolean>>({});

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

  const renderIcon = (icon: ReactNode, isActive = false) => {
    if (!icon) {
      return <span className="block size-2 rounded-full bg-current/70" />;
    }

    if (isValidElement(icon)) {
      const element = icon as ReactElement<{ className?: string }>;

      return cloneElement(element, {
        className: cn('h-4 w-4 shrink-0', element.props.className, isActive && 'text-sidebar-accent-foreground'),
      });
    }

    return icon;
  };

  const renderRouteItems = (items: Route[], depth = 0): React.ReactNode => {
    return items.map((route) => {
      const hasChildren = (route.children?.length ?? 0) > 0;
      const isExpanded = expandedRoutes[route.path] ?? true;

      return (
        <div
          key={`${route.path}-${route.label}-${depth}`}
          className={cn(
            'space-y-1 rounded-2xl transition-colors',
            depth === 0 && 'bg-sidebar-accent/10 p-1.5',
            depth > 0 && 'pl-2'
          )}
        >
          <div
            className={cn(
              'flex items-center gap-1',
              depth > 0 && 'ml-1',
              isCollapsed && 'w-full justify-center gap-0'
            )}
          >
            {hasChildren ? (
              <button
                type="button"
                className={cn(
                  'flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all',
                  'border border-transparent hover:border-sidebar-border hover:bg-sidebar-accent',
                  'focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none',
                  isExpanded && 'border-sidebar-primary/30 bg-sidebar-primary/15 text-sidebar-foreground',
                  isCollapsed && 'size-10 flex-none justify-center gap-0 px-0 py-0'
                )}
                onClick={() => toggleRoute(route.path)}
                aria-expanded={isExpanded}
                aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${route.label}`}
              >
                <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl', isExpanded && 'bg-sidebar-primary/20')}>
                  {renderIcon(route.icon, isExpanded)}
                </span>
                {!isCollapsed && <span className="truncate">{route.label}</span>}
                {!isCollapsed && (
                  <ChevronDown className={cn('ml-auto h-4 w-4 transition-transform duration-200', !isExpanded && '-rotate-90')} />
                )}
              </button>
            ) : (
              <NavLink
                to={route.path}
                className={({ isActive }) =>
                  cn(
                    'flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                    'border border-transparent hover:border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    'focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none',
                    isActive && 'border-sidebar-primary/30 bg-sidebar-primary/15 text-sidebar-foreground',
                    isCollapsed && 'size-10 flex-none justify-center gap-0 px-0 py-0'
                  )
                }
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-accent/60">
                  {renderIcon(route.icon)}
                </span>
                {!isCollapsed && <span className="truncate">{route.label}</span>}
              </NavLink>
            )}
          </div>

          {hasChildren && !isCollapsed && isExpanded && (
            <div className="ml-2 space-y-1 border-l border-sidebar-border/70 pl-2">
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
        'relative z-30 flex h-full shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground backdrop-blur-xl transition-all duration-300',
        isCollapsed ? 'w-0 overflow-hidden lg:w-16' : 'w-72'
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-3 shrink-0">
        {!isCollapsed && (
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-sidebar-primary/15 text-sidebar-foreground">
              <ChevronRight className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">Navigation</p>
              <p className="truncate text-xs text-sidebar-foreground/70">Quick access to dashboard sections</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto rounded-xl hover:bg-sidebar-accent"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
      <nav className="flex-1 overflow-y-auto p-3">
        <div className="space-y-1">{renderRouteItems(routes)}</div>
      </nav>
    </aside>
  );
}
