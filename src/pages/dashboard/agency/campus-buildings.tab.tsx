import { apiGetError } from "@/lib/error";
import { getEdusyncERPAPI } from "@/lib/orval/endpoints";
import type { GetBuildingDto } from "@/lib/orval/model/getBuildingDto";
import type { BuildingDto } from "@/lib/orval/model/buildingDto";
import React from "react";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Modal, { useModal } from "@/components/modal.component";
import ConfirmModal from "@/components/confirm.component";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Plus, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import DataTable from "@/components/table.component";
import type { TableColumn } from "@/components/table.component";

const api = getEdusyncERPAPI();
const ROWS_PER_PAGE = 10;

// 1. Hoisted Zod schema and types outside the component to prevent re-creation on every render
const buildingSchema = z.object({
    buildingName: z.string().min(2, "Name required"),
    latitude: z.union([z.string(), z.number()]).optional(),
    longitude: z.union([z.string(), z.number()]).optional(),
    campusId: z.union([z.string(), z.number()]),
});

type BuildingForm = z.infer<typeof buildingSchema>;





interface CampusBuildingsTabProps {
    campusId: number | string;
}


const CampusBuildingsTab: React.FC<CampusBuildingsTabProps> = ({ campusId }) => {
    const [buildingPaginated, setBuildingPaginated] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const modal = useModal<GetBuildingDto>();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const confirmDeleteModal = useModal<GetBuildingDto>();

    const form = useForm<BuildingForm>({
        resolver: zodResolver(buildingSchema),
        defaultValues: {
            buildingName: "",
            latitude: "",
            longitude: "",
            campusId: campusId,
        },
    });

    // Sync form state when parent campusId updates
    useEffect(() => {
        if (!modal.data) {
            form.setValue("campusId", campusId);
        }
    }, [campusId, modal.data, form]);

    // 2. Wrapped network requests in useCallback to satisfy dependency arrays
    const fetchBuildings = useCallback(async (pageNum: number) => {
        setIsLoading(true);
        try {
            const response = await api.getPaginatedBuilding({
                Filter: `campusId[eq]=${campusId}`,
                Page: pageNum,
                Rows: ROWS_PER_PAGE,
            });
            setBuildingPaginated(response);
        } catch (error) {
            toast.error(apiGetError(error, 'Failed to fetch buildings for campus'));
        } finally {
            setIsLoading(false);
        }
    }, [campusId]);

    // Reset pagination page when switching campuses
    // Only reset page to 1 on campusId change after initial mount
    const didMount = useRef(false);
    useEffect(() => {
        if (didMount.current) {
            setPage(1);
        } else {
            didMount.current = true;
        }
    }, [campusId]);

    // 3. Fixed async effect promise-returning bug
    useEffect(() => {
        Promise.resolve().then(() => fetchBuildings(page));
    }, [page, fetchBuildings]);

    // 4. Memoized active form interaction handlers
    const handleAdd = useCallback(() => {
        form.reset({ buildingName: "", latitude: "", longitude: "", campusId });
        modal.openFn(undefined);
    }, [campusId, form, modal]);

    const handleEdit = useCallback((building: GetBuildingDto) => {
        form.reset({
            buildingName: building.buildingName ?? "",
            latitude: building.latitude ?? "",
            longitude: building.longitude ?? "",
            campusId: building.campusId ?? campusId,
        });
        modal.openFn(building);
    }, [campusId, form, modal]);

    const onSubmit = useCallback(async (values: BuildingForm) => {
        setIsSubmitting(true);
        try {
            if (modal.data) {
                await api.updateBuilding(Number(modal.data.id), values);
                toast.success("Building updated");
            } else {
                await api.createBuilding(values);
                toast.success("Building created");
            }
            modal.closeFn();
            fetchBuildings(page);
        } catch (error) {
            toast.error(apiGetError(error, 'Failed to save building'));
        } finally {
            setIsSubmitting(false);
        }
    }, [modal, page, fetchBuildings]);

    const handleDelete = useCallback((building: GetBuildingDto) => {
        confirmDeleteModal.openFn(building);
    }, [confirmDeleteModal]);

    const confirmDelete = useCallback(async (building: GetBuildingDto) => {
        setIsSubmitting(true);
        try {
            await api.deleteBuilding(Number(building.id));
            toast.success("Building deleted");
            fetchBuildings(page);
            confirmDeleteModal.closeFn();
        } catch (error) {
            toast.error(apiGetError(error, 'Failed to delete building'));
        } finally {
            setIsSubmitting(false);
        }
    }, [page, fetchBuildings, confirmDeleteModal]);

    // 5. Wrap columns in useMemo so the DataTable component doesn't re-render needlessly
    const columns = useMemo<TableColumn<GetBuildingDto & Record<string, unknown>>[]>(() => [
        {
            header: "Building",
            accessor: "buildingName",
            render: (_, row: GetBuildingDto) => {
                return (
                    <div className="block">
                        <p className="font-medium">{row.buildingName}</p>
                        <span className="small text-xs text-muted-foreground">Lat: {row.latitude ?? '—'}, Lng: {row.longitude ?? '—'}</span>
                    </div>
                );
            },
        },
        {
            header: <div className="text-center w-full">Actions</div>,
            accessor: "id",
            render: (_id, row) => (
                <div className="flex items-center justify-center">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem className="cursor-pointer flex items-center gap-2" onClick={() => handleEdit(row as unknown as GetBuildingDto)}>
                                <Pencil className="h-4 w-4" />
                                <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer flex items-center gap-2 text-destructive" onClick={() => handleDelete(row as unknown as GetBuildingDto)} disabled={isSubmitting}>
                                <Trash2 className="h-4 w-4" />
                                <span>Delete</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            ),
        },
    ], [handleEdit, handleDelete, isSubmitting]);

    const totalPage = Number(buildingPaginated?.paginationMeta?.totalPages ?? 1);

    return (
        <div className="w-full">
            <div className="flex justify-end mb-2">
                <Button onClick={handleAdd} size="sm">
                    <Plus className="w-4 h-4 mr-1" /> Add Building
                </Button>
            </div>
            <DataTable
                columns={columns}
                data={((buildingPaginated?.data ?? []) as unknown as Record<string, unknown>[])}
                isLoading={isLoading}
                totalPage={totalPage}
                rows={ROWS_PER_PAGE}
                page={page}
                onPageChange={setPage}
                emptyMessage="No buildings found for this campus."
            />

            <Modal controller={modal} title={modal.data ? "Edit Building" : "Add Building"} size="sm">
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label htmlFor="buildingName" className="block text-sm font-medium mb-1">Building Name</label>
                        <Input
                            id="buildingName"
                            {...form.register("buildingName")}
                            disabled={isSubmitting}
                            autoFocus
                        />
                        {form.formState.errors.buildingName && (
                            <div className="text-xs text-red-500 mt-1">{form.formState.errors.buildingName.message}</div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <label htmlFor="latitude" className="block text-sm font-medium mb-1">Latitude</label>
                            <Input
                                id="latitude"
                                {...form.register("latitude")}
                                disabled={isSubmitting}
                            />
                            {form.formState.errors.latitude && (
                                <div className="text-xs text-red-500 mt-1">{form.formState.errors.latitude.message}</div>
                            )}
                        </div>
                        <div className="flex-1">
                            <label htmlFor="longitude" className="block text-sm font-medium mb-1">Longitude</label>
                            <Input
                                id="longitude"
                                {...form.register("longitude")}
                                disabled={isSubmitting}
                            />
                            {form.formState.errors.longitude && (
                                <div className="text-xs text-red-500 mt-1">{form.formState.errors.longitude.message}</div>
                            )}
                        </div>
                    </div>
                    <input type="hidden" {...form.register("campusId")}/>
                    <div className="flex gap-2 justify-end pt-2">
                        <Button type="button" variant="outline" onClick={modal.closeFn} disabled={isSubmitting}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (modal.data ? "Updating..." : "Creating...") : (modal.data ? "Update" : "Create")}
                        </Button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                state={confirmDeleteModal}
                title="Delete Building"
                description={data => (
                    <>
                        Are you sure you want to delete <b>{data?.buildingName}</b>?
                        <br />This action cannot be undone.
                    </>
                )}
                confirmLabel="Delete"
                cancelLabel="Cancel"
                isLoading={isSubmitting}
                onConfirm={confirmDelete}
            />
        </div>
    );
};

export default CampusBuildingsTab;