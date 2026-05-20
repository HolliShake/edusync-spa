import { zodResolver } from '@hookform/resolvers/zod';
import {
  Building2,
  DoorOpen,
  FlaskConical,
  Hash,
  MapPin,
  Microscope,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import ConfirmModal from '@/components/confirm.component';
import Modal, { useModal } from '@/components/modal.component';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { apiGetError } from '@/lib/error';
import { getEdusyncERPAPI } from '@/lib/orval/endpoints';
import type { GetPaginatedResponseDtoOfGetBuildingDto, GetRoomDto } from '@/lib/orval/model';
import type { GetBuildingDto } from '@/lib/orval/model/getBuildingDto';

const api = getEdusyncERPAPI();
const ROWS_PER_PAGE = 10;

const buildingSchema = z.object({
  buildingName: z.string().min(2, 'Name required'),
  latitude: z.union([z.string(), z.number()]).optional(),
  longitude: z.union([z.string(), z.number()]).optional(),
  campusId: z.union([z.string(), z.number()]),
});

type BuildingForm = z.infer<typeof buildingSchema>;

const roomSchema = z.object({
  roomName: z.string().min(2, 'Room name required'),
  capacity: z.union([z.string(), z.number()]).refine(
    (val) => {
      const num = typeof val === 'string' ? Number(val) : val;
      return !isNaN(num) && num >= 1;
    },
    { message: 'Capacity required and must be >= 1' }
  ),
  isLab: z.boolean().optional(),
  isSpecializedLab: z.boolean().optional(),
  buildingId: z.union([z.string(), z.number()]),
});

type RoomForm = z.infer<typeof roomSchema>;

interface CampusBuildingsTabProps {
  campusId: number | string;
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default function CampusBuildingsTab({ campusId }: CampusBuildingsTabProps) {
  const [buildingPaginated, setBuildingPaginated] =
    useState<GetPaginatedResponseDtoOfGetBuildingDto>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Controlled accordion state — survives re-fetches ──
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);

  const modal = useModal<GetBuildingDto>();
  const confirmDeleteModal = useModal<GetBuildingDto>();
  const roomModal = useModal<{ building: GetBuildingDto; room?: GetRoomDto }>();
  const confirmRoomDeleteModal = useModal<{ building: GetBuildingDto; room: GetRoomDto }>();

  const form = useForm<BuildingForm>({
    resolver: zodResolver(buildingSchema),
    defaultValues: { buildingName: '', latitude: '', longitude: '', campusId },
  });

  const roomForm = useForm<RoomForm>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      roomName: '',
      capacity: '',
      isLab: false,
      isSpecializedLab: false,
      buildingId: '',
    },
  });

  useEffect(() => {
    if (!modal.data) form.setValue('campusId', campusId);
  }, [campusId, modal.data, form]);

  // fresh=true ONLY after room CRUD mutations
  const fetchBuildings = useCallback(
    async (pageNum: number, fresh = false) => {
      setIsLoading(true);
      try {
        const response = await api.getPaginatedBuilding({
          Filter: `campusId[eq]=${campusId}`,
          Page: pageNum,
          Rows: ROWS_PER_PAGE,
          ...(fresh && { Fresh: true }),
        });
        setBuildingPaginated(response);
      } catch (error) {
        toast.error(apiGetError(error, 'Failed to fetch buildings for campus'));
      } finally {
        setIsLoading(false);
      }
    },
    [campusId]
  );

  const didMount = useRef(false);
  useEffect(() => {
    if (didMount.current) {
      setPage(1);
      setOpenAccordions([]); // reset open state on campus switch
    } else {
      didMount.current = true;
    }
  }, [campusId]);

  useEffect(() => {
    Promise.resolve().then(() => fetchBuildings(page));
  }, [page, fetchBuildings]);

  // ── Building handlers — no Fresh ──

  const handleAdd = useCallback(() => {
    form.reset({ buildingName: '', latitude: '', longitude: '', campusId });
    modal.openFn(undefined);
  }, [campusId, form, modal]);

  const handleEdit = useCallback(
    (building: GetBuildingDto) => {
      form.reset({
        buildingName: building.buildingName ?? '',
        latitude: building.latitude ?? '',
        longitude: building.longitude ?? '',
        campusId: building.campusId ?? campusId,
      });
      modal.openFn(building);
    },
    [campusId, form, modal]
  );

  const handleDelete = useCallback(
    (building: GetBuildingDto) => {
      confirmDeleteModal.openFn(building);
    },
    [confirmDeleteModal]
  );

  const onSubmit = useCallback(
    async (values: BuildingForm) => {
      setIsSubmitting(true);
      try {
        if (modal.data) {
          await api.updateBuilding(Number(modal.data.id), values);
          toast.success('Building updated');
        } else {
          await api.createBuilding(values);
          toast.success('Building created');
        }
        modal.closeFn();
        fetchBuildings(page); // no Fresh — building mutation
      } catch (error) {
        toast.error(apiGetError(error, 'Failed to save building'));
      } finally {
        setIsSubmitting(false);
      }
    },
    [modal, page, fetchBuildings]
  );

  const confirmDelete = useCallback(
    async (building: GetBuildingDto) => {
      setIsSubmitting(true);
      try {
        await api.deleteBuilding(Number(building.id));
        toast.success('Building deleted');
        // Remove deleted building from open accordions
        setOpenAccordions((prev) => prev.filter((id) => id !== String(building.id)));
        confirmDeleteModal.closeFn();
        fetchBuildings(page); // no Fresh — building mutation
      } catch (error) {
        toast.error(apiGetError(error, 'Failed to delete building'));
      } finally {
        setIsSubmitting(false);
      }
    },
    [page, fetchBuildings, confirmDeleteModal]
  );

  // ── Room handlers — Fresh: true after every mutation ──

  const handleAddRoom = useCallback(
    (building: GetBuildingDto) => {
      roomForm.reset({
        roomName: '',
        capacity: '',
        isLab: false,
        isSpecializedLab: false,
        buildingId: building.id,
      });
      roomModal.openFn({ building });
    },
    [roomForm, roomModal]
  );

  const handleEditRoom = useCallback(
    (building: GetBuildingDto, room: GetRoomDto) => {
      roomForm.reset({
        roomName: room.roomName ?? '',
        capacity: room.capacity ?? '',
        isLab: !!room.isLab,
        isSpecializedLab: !!room.isSpecializedLab,
        buildingId: building.id,
      });
      roomModal.openFn({ building, room });
    },
    [roomForm, roomModal]
  );

  const handleDeleteRoom = useCallback(
    (building: GetBuildingDto, room: GetRoomDto) => {
      confirmRoomDeleteModal.openFn({ building, room });
    },
    [confirmRoomDeleteModal]
  );

  // Helper — ensures a building stays open after a room mutation re-fetch
  const keepOpen = useCallback((buildingId: string | number) => {
    setOpenAccordions((prev) => {
      const key = String(buildingId);
      return prev.includes(key) ? prev : [...prev, key];
    });
  }, []);

  const totalPage = Number(buildingPaginated?.paginationMeta?.totalPages ?? 1);

  return (
    <div className="w-full space-y-4">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Buildings</p>
          <p className="text-xs text-muted-foreground">
            {buildingPaginated?.paginationMeta?.totalItems ?? 0} total
          </p>
        </div>
        <Button onClick={handleAdd} size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" /> Add Building
        </Button>
      </div>

      {/* ── Loading skeletons ── */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border p-4 space-y-2">
              <Skeleton className="h-4 w-40 rounded" />
              <Skeleton className="h-3 w-56 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!isLoading && (buildingPaginated?.data ?? []).length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-xl border border-dashed border-border bg-muted/20">
          <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-muted">
            <Building2 className="w-6 h-6 text-muted-foreground" />
          </span>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">No buildings yet</p>
            <p className="text-xs text-muted-foreground mt-0.5">Add a building to get started</p>
          </div>
          <Button size="sm" variant="outline" onClick={handleAdd} className="mt-1 gap-1.5">
            <Plus className="w-4 h-4" /> Add Building
          </Button>
        </div>
      )}

      {/* ── Buildings Accordion — controlled ── */}
      {!isLoading && (buildingPaginated?.data ?? []).length > 0 && (
        <Accordion
          type="multiple"
          value={openAccordions}
          onValueChange={setOpenAccordions}
          className="space-y-2"
        >
          {(buildingPaginated?.data ?? []).map((building) => (
            <AccordionItem
              key={building.id}
              value={String(building.id)}
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/40 transition-colors [&>svg]:shrink-0">
                <div className="flex flex-1 items-center justify-between gap-3 pr-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/10 shrink-0">
                      <Building2 className="w-4 h-4 text-emerald-500" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {building.buildingName}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                        <p className="text-xs text-muted-foreground truncate">
                          {building.latitude && building.longitude
                            ? `${building.latitude}, ${building.longitude}`
                            : 'No coordinates set'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="text-xs hidden sm:flex gap-1">
                      <DoorOpen className="w-3 h-3" />
                      {Array.isArray(building.rooms) ? building.rooms.length : 0} rooms
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <div
                          className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted/40 transition-colors cursor-pointer"
                          tabIndex={0}
                          role="button"
                          aria-label="Open menu"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
                          }}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </div>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="cursor-pointer gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(building);
                          }}
                        >
                          <Pencil className="h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(building);
                          }}
                          disabled={isSubmitting}
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="px-4 pb-4">
                <Separator className="mb-4" />

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <DoorOpen className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">Rooms</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => handleAddRoom(building)}
                  >
                    <Plus className="w-3 h-3" /> Add Room
                  </Button>
                </div>

                {Array.isArray(building.rooms) && building.rooms.length > 0 ? (
                  <div className="space-y-2">
                    {building.rooms.map((room) => (
                      <div
                        key={room.id}
                        className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-background border border-border shrink-0">
                            <DoorOpen className="w-4 h-4 text-muted-foreground" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {room.roomName}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Users className="w-3 h-3" />
                                {room.capacity}
                              </span>
                              <span className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                                <Hash className="w-3 h-3" />
                                {String(room.id).padStart(6, '0')}
                              </span>
                              {room.isLab && (
                                <Badge className="h-4 text-[10px] px-1.5 bg-blue-500/10 text-blue-600 border-blue-400/30 hover:bg-blue-500/20">
                                  <FlaskConical className="w-2.5 h-2.5 mr-0.5" />
                                  Lab
                                </Badge>
                              )}
                              {room.isSpecializedLab && (
                                <Badge className="h-4 text-[10px] px-1.5 bg-purple-500/10 text-purple-600 border-purple-400/30 hover:bg-purple-500/20">
                                  <Microscope className="w-2.5 h-2.5 mr-0.5" />
                                  Specialized
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => handleEditRoom(building, room)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteRoom(building, room)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 gap-2 rounded-lg border border-dashed border-border bg-muted/10">
                    <DoorOpen className="w-5 h-5 text-muted-foreground/50" />
                    <p className="text-xs text-muted-foreground">No rooms for this building</p>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* ── Pagination ── */}
      {(buildingPaginated?.data ?? []).length > 0 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Page <span className="font-medium text-foreground">{page}</span> of{' '}
            <span className="font-medium text-foreground">{totalPage}</span>
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPage, p + 1))}
              disabled={page === totalPage || isLoading}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* ── Building Modal ── */}
      <Modal controller={modal} title={modal.data ? 'Edit Building' : 'Add Building'} size="sm">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Building Name" error={form.formState.errors.buildingName?.message}>
            <Input
              {...form.register('buildingName')}
              placeholder="e.g. Main Building"
              disabled={isSubmitting}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude" error={form.formState.errors.latitude?.message}>
              <Input
                {...form.register('latitude')}
                placeholder="0.000000"
                disabled={isSubmitting}
              />
            </Field>
            <Field label="Longitude" error={form.formState.errors.longitude?.message}>
              <Input
                {...form.register('longitude')}
                placeholder="0.000000"
                disabled={isSubmitting}
              />
            </Field>
          </div>
          <input type="hidden" {...form.register('campusId')} />
          <Separator />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={modal.closeFn} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? modal.data
                  ? 'Updating...'
                  : 'Creating...'
                : modal.data
                  ? 'Update'
                  : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Confirm Building Delete ── */}
      <ConfirmModal
        state={confirmDeleteModal}
        title="Delete Building"
        description={(data) => (
          <>
            Are you sure you want to delete <b>{data?.buildingName}</b>? This action cannot be
            undone.
          </>
        )}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isLoading={isSubmitting}
        onConfirm={confirmDelete}
      />

      {/* ── Room Modal ── */}
      <Modal
        controller={roomModal}
        title={roomModal.data?.room ? 'Edit Room' : 'Add Room'}
        size="sm"
      >
        <form
          onSubmit={roomForm.handleSubmit(async (values) => {
            setIsSubmitting(true);
            try {
              const buildingId = roomModal.data?.building.id;
              if (roomModal.data?.room) {
                await api.updateRoom(Number(roomModal.data.room?.id), {
                  ...values,
                  buildingId,
                });
                toast.success('Room updated');
              } else {
                await api.createRoom({ ...values, buildingId });
                toast.success('Room created');
              }
              roomModal.closeFn();
              keepOpen(buildingId); // ensure accordion stays open
              fetchBuildings(page, true); // Fresh: true — room mutation
            } catch (error) {
              toast.error(apiGetError(error, 'Failed to save room'));
            } finally {
              setIsSubmitting(false);
            }
          })}
          className="space-y-4"
        >
          <Field label="Room Name" error={roomForm.formState.errors.roomName?.message}>
            <Input
              {...roomForm.register('roomName')}
              placeholder="e.g. Room 101"
              disabled={isSubmitting}
            />
          </Field>
          <Field label="Capacity" error={roomForm.formState.errors.capacity?.message}>
            <Input
              type="number"
              {...roomForm.register('capacity')}
              placeholder="e.g. 40"
              disabled={isSubmitting}
            />
          </Field>
          <div className="rounded-lg border border-border divide-y divide-border">
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <FlaskConical className="w-4 h-4 text-blue-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">Lab</p>
                  <p className="text-xs text-muted-foreground">Room is a laboratory</p>
                </div>
              </div>
              <Controller
                control={roomForm.control}
                name="isLab"
                render={({ field }) => (
                  <Switch
                    checked={!!field.value}
                    onCheckedChange={field.onChange}
                    disabled={isSubmitting}
                    className="shrink-0"
                  />
                )}
              />
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <Microscope className="w-4 h-4 text-purple-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">Specialized Lab</p>
                  <p className="text-xs text-muted-foreground">Requires special equipment</p>
                </div>
              </div>
              <Controller
                control={roomForm.control}
                name="isSpecializedLab"
                render={({ field }) => (
                  <Switch
                    checked={!!field.value}
                    onCheckedChange={field.onChange}
                    disabled={isSubmitting}
                    className="shrink-0"
                  />
                )}
              />
            </div>
          </div>
          <input type="hidden" {...roomForm.register('buildingId')} />
          <Separator />
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={roomModal.closeFn}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? roomModal.data?.room
                  ? 'Updating...'
                  : 'Creating...'
                : roomModal.data?.room
                  ? 'Update'
                  : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Confirm Room Delete ── */}
      <ConfirmModal
        state={confirmRoomDeleteModal}
        title="Delete Room"
        description={(data) => (
          <>
            Are you sure you want to delete room{' '}
            <b>{data?.room?.roomName ?? `#${String(data?.room?.id).padStart(6, '0')}`}</b>? This
            action cannot be undone.
          </>
        )}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isLoading={isSubmitting}
        onConfirm={async (data) => {
          setIsSubmitting(true);
          try {
            await api.deleteRoom(Number(data.room?.id));
            toast.success('Room deleted');
            confirmRoomDeleteModal.closeFn();
            keepOpen(data.building.id); // ensure accordion stays open
            fetchBuildings(page, true); // Fresh: true — room mutation
          } catch (error) {
            toast.error(apiGetError(error, 'Failed to delete room'));
          } finally {
            setIsSubmitting(false);
          }
        }}
      />
    </div>
  );
}
