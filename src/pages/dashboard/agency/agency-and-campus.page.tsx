import { Building2, Map, Repeat, School } from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { toast } from 'sonner';

import PageLayout from '@/components/page.component';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiGetError } from '@/lib/error';
import { getEdusyncERPAPI } from '@/lib/orval/endpoints';
import type { GetCampusDto } from '@/lib/orval/model';
import { cn } from '@/lib/utils';

import CampusBuildingsTab from './campus-buildings.tab';
import CampusCollegesTab from './campus-colleges.tab';
import CampusCycleTab from './campus-cycle.tab';
import CampusMapViewTab from './campus-mapview.tab';

type PageParams = Record<string, string> & {
  campusCode: string;
  campusId: string;
};

const api = getEdusyncERPAPI();

const TRIGGER_BASE = cn(
  'flex items-center justify-center gap-2 px-4 py-2 flex-1 rounded-md',
  'text-sm font-medium text-muted-foreground transition-all duration-200',
  'hover:text-foreground hover:bg-background/60',
  'data-[state=active]:bg-background',
  'data-[state=active]:text-foreground',
  'data-[state=active]:shadow-sm',
  'data-[state=active]:border',
  'data-[state=active]:border-border'
);

const TABS = [
  { value: 'colleges', icon: School, label: 'Colleges' },
  { value: 'building', icon: Building2, label: 'Building' },
  { value: 'cycle', icon: Repeat, label: 'Cycle' },
  { value: 'mapview', icon: Map, label: 'Map View' },
] as const;

const TAB_ICON_COLOR: Record<string, string> = {
  colleges: 'text-blue-500 bg-blue-500/10',
  building: 'text-emerald-500 bg-emerald-500/10',
  cycle: 'text-purple-500 bg-purple-500/10',
  mapview: 'text-cyan-500 bg-cyan-500/10',
};

const TAB_SUBTITLE: Record<string, string> = {
  colleges: 'Manage colleges under this campus',
  building: 'Manage buildings under this campus',
  cycle: 'Manage academic cycles for this campus',
  mapview: 'Visualize the campus on the map',
};

export default function AgencyAndCampusPage(): React.ReactNode {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const { campusCode, campusId } = useParams<PageParams>();
  const [campus, setCampus] = useState<GetCampusDto | null>(null);
  const [loading, setLoading] = useState(true);

  const defaultTab = useMemo(() => {
    const tab = sp.get('tab');
    if (tab && TABS.some((t) => t.value === tab)) {
      return tab;
    }
    return 'colleges';
  }, [sp]);

  useEffect(() => {
    const getCampusDetails = async () => {
      let isError = false;
      try {
        const data = await api.getCampusById(Number(campusId));
        setCampus(data);
      } catch (error) {
        toast.error(apiGetError(error, 'Failed to fetch campus details'));
        isError = true;
      } finally {
        setLoading(false);
      }
      if (isError) {
        navigate(-1);
      }
    };
    getCampusDetails();
  }, [campusId, navigate]);

  const profileFields = [
    { label: 'Campus name', value: campus?.campusName, mono: false },
    { label: 'Short name', value: campus?.campusShortName, mono: false },
    { label: 'Address', value: campus?.address, mono: false },
    { label: 'Campus code', value: campusCode, mono: true },
  ];

  return (
    <PageLayout
      title={campusCode}
      description="Manage your school campuses and their associated agencies. Here you can view, edit, and organize campus information to ensure smooth operations and effective communication."
      showBackButton={true}
    >
      <div className="space-y-6">
        {/* ── Campus Profile Card ── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <School className="w-6 h-6 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              {loading ? (
                <Skeleton className="h-5 w-40 rounded mb-1" />
              ) : (
                <p className="text-base font-semibold text-foreground leading-tight truncate">
                  {campus?.campusName ?? campusCode}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">Campus · Active</p>
            </div>
            <Badge
              variant="outline"
              className="shrink-0 rounded-full text-xs font-medium text-emerald-600 border-emerald-400/50 bg-emerald-500/10"
            >
              Active
            </Badge>
          </div>

          {/* Fields Grid */}
          {loading ? (
            <div className="grid grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'px-5 py-4 space-y-2',
                    i % 2 === 0 && 'border-r border-border',
                    i < 2 && 'border-b border-border'
                  )}
                >
                  <Skeleton className="h-3 w-16 rounded" />
                  <Skeleton className="h-4 w-28 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2">
              {profileFields.map(({ label, value, mono }, i) => (
                <div
                  key={label}
                  className={cn(
                    'px-5 py-4',
                    i % 2 === 0 && 'border-r border-border',
                    i < 2 && 'border-b border-border'
                  )}
                >
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70 mb-1">
                    {label}
                  </p>
                  <p
                    className={cn(
                      'text-sm font-medium text-foreground truncate',
                      mono && 'font-mono'
                    )}
                  >
                    {value ?? <span className="italic font-normal text-muted-foreground">N/A</span>}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Tabs ── */}
        <div className="block">
          <Tabs defaultValue={defaultTab} className="w-full block">
            <TabsList className="flex! w-full! h-auto bg-muted/50 border border-border p-1 rounded-xl gap-1 mb-4">
              {TABS.map(({ value, icon: Icon, label }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className={TRIGGER_BASE}
                  onClick={() => {
                    navigate('?tab=' + value);
                  }}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {TABS.map(({ value, icon: Icon, label }) => (
              <TabsContent key={value} value={value}>
                <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                    <span
                      className={cn(
                        'inline-flex items-center justify-center w-9 h-9 rounded-lg shrink-0',
                        TAB_ICON_COLOR[value]
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </span>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground">{TAB_SUBTITLE[value]}</p>
                    </div>
                  </div>
                  <div className="px-5 py-8">
                    {value === 'colleges' ? (
                      <CampusCollegesTab campusId={Number(campusId)} />
                    ) : value === 'building' ? (
                      <CampusBuildingsTab campusId={Number(campusId)} />
                    ) : value === 'cycle' ? (
                      <CampusCycleTab campusId={Number(campusId)} />
                    ) : (
                      <CampusMapViewTab lat={campus?.latitude ?? 0} lng={campus?.longitude ?? 0} />
                    )}
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </PageLayout>
  );
}
