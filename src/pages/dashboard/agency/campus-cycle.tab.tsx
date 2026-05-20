import { zodResolver } from '@hookform/resolvers/zod';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import ConfirmModal from '@/components/confirm.component';
import Modal, { useModal } from '@/components/modal.component';
import DataTable, { type TableColumn } from '@/components/table.component';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { apiGetError } from '@/lib/error';
import {
  getEdusyncERPAPI,
  type GetPaginatedCampusCyclesGroupedByYearResult,
} from '@/lib/orval/endpoints';
import type { CycleDto } from '@/lib/orval/model/cycleDto';

interface CampusCycleTabProps {
  campusId: number | string;
}

const cycleSchema = z.object({
  cycleDescription: z.string().min(2, 'Description required'),
  cycleNumber: z.union([z.string(), z.number()]).refine(
    (val) => {
      if (typeof val === 'string') return val.trim() !== '';
      if (typeof val === 'number') return !isNaN(val);
      return false;
    },
    { message: 'Number required' }
  ),
  startDate: z.string().min(1, 'Start date required'),
  endDate: z.string().min(1, 'End date required'),
  campusId: z.union([z.string(), z.number()]),
});
type CycleForm = z.infer<typeof cycleSchema>;

const api = getEdusyncERPAPI();

export default function CampusCycleTab({ campusId }: CampusCycleTabProps): React.ReactNode {
  const [cycle, setCycle] = useState<GetPaginatedCampusCyclesGroupedByYearResult>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal state for add/edit
  const modal = useModal<{ year: string; cycle?: CycleDto }>();
  const confirmDeleteModal = useModal<{ year: string; cycle: any }>();

  const form = useForm<CycleForm>({
    resolver: zodResolver(cycleSchema),
    defaultValues: {
      cycleDescription: '',
      cycleNumber: '',
      startDate: '',
      endDate: '',
      campusId: campusId,
    },
  });

  const fetchCampusCycles = useCallback(
    async (pageNum = 1) => {
      setLoading(true);
      try {
        const response = await api.getPaginatedCampusCyclesGroupedByYear(campusId as number, {
          Page: pageNum,
          Rows: 10,
        });
        setCycle(response);
      } catch (error) {
        toast.error(apiGetError(error, 'Failed to fetch campus cycles'));
      } finally {
        setLoading(false);
      }
    },
    [campusId]
  );

  useEffect(() => {
    fetchCampusCycles(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campusId, page]);

  // CRUD handlers
  const handleAdd = useCallback(
    (year: string) => {
      form.reset({
        cycleDescription: '',
        cycleNumber: '',
        startDate: '',
        endDate: '',
        campusId: campusId,
      });
      modal.openFn({ year });
    },
    [form, campusId, modal]
  );

  const handleEdit = useCallback(
    (year: string, cycle: CycleDto) => {
      form.reset({
        cycleDescription: cycle.cycleDescription ?? '',
        cycleNumber: cycle.cycleNumber ?? '',
        startDate: cycle.startDate ?? '',
        endDate: cycle.endDate ?? '',
        campusId: cycle.campusId ?? campusId,
      });
      modal.openFn({ year, cycle });
    },
    [form, campusId, modal]
  );

  const handleDelete = useCallback(
    (year: string, cycle: any) => {
      confirmDeleteModal.openFn({ year, cycle });
    },
    [confirmDeleteModal]
  );

  // Submit add/edit
  const onSubmit = useCallback(
    async (values: CycleForm) => {
      setIsSubmitting(true);
      try {
        if (modal.data?.cycle) {
          await api.updateCycle(Number((modal.data.cycle as any).id), values);
          toast.success('Cycle updated');
        } else {
          await api.createCycle(values);
          toast.success('Cycle created');
        }
        modal.closeFn();
        fetchCampusCycles(page);
      } catch (error) {
        toast.error(apiGetError(error, 'Failed to save cycle'));
      } finally {
        setIsSubmitting(false);
      }
    },
    [modal, fetchCampusCycles, page]
  );

  // Confirm delete
  const confirmDelete = useCallback(
    async (data: { year: string; cycle: any }) => {
      setIsSubmitting(true);
      try {
        await api.deleteCycle(Number((data.cycle as any).id));
        toast.success('Cycle deleted');
        confirmDeleteModal.closeFn();
        fetchCampusCycles(page);
      } catch (error) {
        toast.error(apiGetError(error, 'Failed to delete cycle'));
      } finally {
        setIsSubmitting(false);
      }
    },
    [confirmDeleteModal, fetchCampusCycles, page]
  );

  // Table columns
  const columns: TableColumn<any>[] = [
    {
      header: 'Description',
      accessor: 'cycleDescription',
    },
    {
      header: 'Number',
      accessor: 'cycleNumber',
    },
    {
      header: 'Start Date',
      accessor: 'startDate',
      render: (value) => (value ? new Date(value as string).toLocaleDateString() : '-'),
    },
    {
      header: 'End Date',
      accessor: 'endDate',
      render: (value) => (value ? new Date(value as string).toLocaleDateString() : '-'),
    },
    {
      header: 'Campus',
      accessor: 'campus.campusName',
      render: (value) => (value ? String(value) : '-'),
    },
    {
      header: '',
      accessor: 'id',
      render: (_id, row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() => handleEdit(row.year, row)}
            >
              <Pencil className="w-4 h-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer gap-2 text-destructive focus:text-destructive"
              onClick={() => handleDelete(row.year, row)}
            >
              <Trash2 className="w-4 h-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {loading && <div>Loading...</div>}
      {!loading && (!cycle?.data || cycle.data.length === 0) && (
        <div className="text-muted-foreground text-center py-8">No cycles found.</div>
      )}
      {!loading &&
        cycle?.data?.map((yearGroup) => (
          <div key={yearGroup.year} className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground border-b pb-1">
                {yearGroup.year}
              </h2>
              <Button size="sm" onClick={() => handleAdd(yearGroup.year)}>
                Add Cycle
              </Button>
            </div>
            <DataTable
              columns={columns}
              data={yearGroup.cycles.map((c) => ({ ...c, year: yearGroup.year }))}
              isLoading={loading}
              totalPage={Number(cycle?.paginationMeta?.totalPages ?? 1)}
              rows={10}
              page={page}
              onPageChange={setPage}
              emptyMessage="No cycles for this year."
            />
          </div>
        ))}

      {/* Modal for add/edit */}
      <Modal controller={modal} title={modal.data?.cycle ? 'Edit Cycle' : 'Add Cycle'} size="sm">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium">Description</label>
            <Input {...form.register('cycleDescription')} autoFocus disabled={isSubmitting} />
            {form.formState.errors.cycleDescription && (
              <p className="text-xs text-destructive">
                {form.formState.errors.cycleDescription.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium">Number</label>
            <Input {...form.register('cycleNumber')} disabled={isSubmitting} />
            {form.formState.errors.cycleNumber && (
              <p className="text-xs text-destructive">
                {form.formState.errors.cycleNumber.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium">Start Date</label>
            <Input type="date" {...form.register('startDate')} disabled={isSubmitting} />
            {form.formState.errors.startDate && (
              <p className="text-xs text-destructive">{form.formState.errors.startDate.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium">End Date</label>
            <Input type="date" {...form.register('endDate')} disabled={isSubmitting} />
            {form.formState.errors.endDate && (
              <p className="text-xs text-destructive">{form.formState.errors.endDate.message}</p>
            )}
          </div>
          <input type="hidden" {...form.register('campusId')} />
          <Separator />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={modal.closeFn} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? modal.data?.cycle
                  ? 'Updating...'
                  : 'Creating...'
                : modal.data?.cycle
                  ? 'Update'
                  : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm delete modal */}
      <ConfirmModal
        state={confirmDeleteModal}
        title="Delete Cycle"
        description={(data) => (
          <>
            Are you sure you want to delete cycle{' '}
            <b>{data?.cycle?.cycleDescription ?? `#${String((data?.cycle as any)?.id)}`}</b>? This
            action cannot be undone.
          </>
        )}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isLoading={isSubmitting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
