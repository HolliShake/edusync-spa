import Header from '../components/navigation/header';
import AppSideBar from '../components/navigation/sidebar';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps): ReactNode {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });

  const handleSidebarToggle = (isCollapsed: boolean) => {
    localStorage.setItem('sidebarCollapsed', isCollapsed.toString());
    setIsSidebarCollapsed(isCollapsed);
  };

  // Ensure sidebar is responsive to viewport size changes
  useEffect(() => {
    const updateSidebarStateForViewport = (): void => {
      if (typeof window === 'undefined') return;
      const isLarge = window.innerWidth >= 1024; // Tailwind lg breakpoint
      if (!isLarge) {
        setIsSidebarCollapsed(true);
      }
    };

    updateSidebarStateForViewport();
    window.addEventListener('resize', updateSidebarStateForViewport);
    return () => window.removeEventListener('resize', updateSidebarStateForViewport);
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Mobile overlay */}
      {!isSidebarCollapsed && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={() => handleSidebarToggle(true)}
        />
      )}

      {/* Sidebar */}
      <AppSideBar isCollapsed={isSidebarCollapsed} setIsCollapsed={handleSidebarToggle} />

      {/* Main content */}
      <div className="flex-1 flex min-h-0 min-w-0 flex-col">
        {/* Header */}
        <Header setIsSidebarOpen={handleSidebarToggle} />

        {/* Main content area */}
        <main className="flex-1 min-h-0 min-w-0 overflow-hidden bg-background">
          <div className="h-full w-full min-w-0 overflow-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}