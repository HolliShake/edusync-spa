import { LogOut, Menu } from 'lucide-react';
import { useNavigate } from 'react-router';

import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';

type HeaderProps = {
  setIsSidebarOpen: (isCollapsed: boolean) => void;
};

export default function Header({ setIsSidebarOpen }: HeaderProps) {
  const navigate = useNavigate();
  const handleLogout = async () => {
    const logout = await fetch('https://cqi.ustp.edu.ph/dev/Api/Auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    console.log(logout);

    if (!logout.ok) {
      alert('Logout failed. Please try again.');
      return;
    }

    navigate('/auth/login');
  };

  return (
    <header className="h-14 border-b border-sidebar-border bg-sidebar text-sidebar-foreground flex items-center px-4 gap-4 shrink-0 transition-all duration-300">
      <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)}>
        <Menu className="h-5 w-5" />
      </Button>
      <span className="font-semibold text-lg max-md:hidden">EduSyncEnrollment</span>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <Button variant="ghost" size="icon" onClick={handleLogout}>
          <LogOut />
        </Button>
      </div>
    </header>
  );
}
