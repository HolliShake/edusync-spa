import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';

type HeaderProps = {
  setIsSidebarOpen: (isCollapsed: boolean) => void;
};

export default function Header({ setIsSidebarOpen }: HeaderProps) {
  return (
    <header className="h-14 border-b border-sidebar-border bg-sidebar text-sidebar-foreground flex items-center px-4 gap-4 shrink-0 transition-all duration-300">
      <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)}>
        <Menu className="h-5 w-5" />
      </Button>
      <span className="font-semibold text-lg max-md:hidden">EduSyncEnrollment</span>
      
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  );
}
