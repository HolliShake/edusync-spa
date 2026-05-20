import { Cpu, MemoryStick, Monitor } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import PageLayout from '@/components/page.component';
import { apiGetError } from '@/lib/error';
import { getEdusyncERPAPI } from '@/lib/orval/endpoints';
import type { GetMachineInfoDto } from '@/lib/orval/model';

const api = getEdusyncERPAPI();

export default function DashboardPage() {
  const [machine, setMachine] = useState<GetMachineInfoDto>({
    cpuCores: 0,
    cpuUsage: 0,
    hostOS: 'UNKNOWN',
    ramAvailable: 0,
    ramUsed: 0,
  });

  useEffect(() => {
    const getMachineInfoData = async () => {
      try {
        const data = await api.getMachineInfo();
        setMachine(data);
      } catch (error) {
        toast.error(apiGetError(error, 'Failed to fetch machine info'));
      }
    };
    getMachineInfoData();
  }, []);
  return (
    <PageLayout
      title="Dashboard"
      description="Welcome to your dashboard! Here you can find an overview of key metrics and recent activity."
      showBackButton={false}
    >
      <div className="space-y-6">
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">Overview</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Dashboard Home</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            This is the landing page inside the dashboard layout. Below is your server's machine
            info.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {/* Machine Info Cards */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col items-center">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-2">
              <Monitor className="w-7 h-7 text-blue-600" />
            </span>
            <p className="text-sm text-muted-foreground">Host OS</p>
            <p className="mt-2 text-xl font-semibold tracking-tight">{machine.hostOS}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col items-center">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-2">
              <Cpu className="w-7 h-7 text-green-600" />
            </span>
            <p className="text-sm text-muted-foreground">CPU Cores</p>
            <p className="mt-2 text-xl font-semibold tracking-tight">{machine.cpuCores}</p>
            <p className="text-xs text-muted-foreground mt-1">Usage: {machine.cpuUsage}%</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col items-center">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 mb-2">
              <MemoryStick className="w-7 h-7 text-purple-600" />
            </span>
            <p className="text-sm text-muted-foreground">RAM Used</p>
            <p className="mt-2 text-xl font-semibold tracking-tight">{machine.ramUsed} MB</p>
            <p className="text-xs text-muted-foreground mt-1">
              Available: {machine.ramAvailable} MB
            </p>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
