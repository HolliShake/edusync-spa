import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

type HeaderProps = {
  setIsSidebarOpen: (isCollapsed: boolean) => void;
};

export default function Header({ setIsSidebarOpen }: HeaderProps) {
  return (
    <header className="h-14 border-b bg-background flex items-center px-4 gap-4 shrink-0">
      <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)}>
        <Menu className="h-5 w-5" />
      </Button>
      <span className="font-semibold text-lg">EduSync</span>
    </header>
  );
}
