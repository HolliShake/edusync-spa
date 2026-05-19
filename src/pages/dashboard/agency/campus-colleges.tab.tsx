import { apiGetError } from "@/lib/error";
import { getEdusyncERPAPI } from "@/lib/orval/endpoints";
import type { GetPaginatedResponseDtoOfGetCollegeDto, GetCollegeDto } from "@/lib/orval/model";
import type React from "react";
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
const collegeSchema = z.object({
    collegeName: z.string().min(2, "Name required"),
    collegeShortName: z.string().min(1, "Short name required"),
    campusId: z.union([z.string(), z.number()]),
});

type CollegeForm = z.infer<typeof collegeSchema>;



interface CampusCollegesTabProps {
    campusId: number | string;
}

export default function CampusCollegesTab({ campusId }: CampusCollegesTabProps): React.ReactNode {
    const [collegePaginated, setCollegePaginated] = useState<GetPaginatedResponseDtoOfGetCollegeDto | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const modal = useModal<GetCollegeDto>();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const confirmDeleteModal = useModal<GetCollegeDto>();

    const form = useForm<CollegeForm>({
        resolver: zodResolver(collegeSchema),
        defaultValues: {
            collegeName: "",
            collegeShortName: "",
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
    const fetchColleges = useCallback(async (pageNum: number) => {
        setIsLoading(true);
        try {
            const response = await api.getPaginatedCollege({
                Filter: `campusId[eq]=${campusId}`,
                Page: pageNum,
                Rows: ROWS_PER_PAGE,
            });
            setCollegePaginated(response);
        } catch (error) {
            toast.error(apiGetError(error, 'Failed to fetch colleges for campus'));
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [campusId]);

    // 3. Fixed async effect promise-returning bug
    useEffect(() => {
        Promise.resolve().then(() => fetchColleges(page));
    }, [page, fetchColleges]);

    // 4. Memoized active form interaction handlers
    const handleAdd = useCallback(() => {
        form.reset({ collegeName: "", collegeShortName: "", campusId });
        modal.openFn(undefined);
    }, [campusId, form, modal]);

    const handleEdit = useCallback((college: GetCollegeDto) => {
        form.reset({
            collegeName: college.collegeName ?? "",
            collegeShortName: college.collegeShortName ?? "",
            campusId: college.campusId ?? campusId,
        });
        modal.openFn(college);
    }, [campusId, form, modal]);

    const onSubmit = useCallback(async (values: CollegeForm) => {
        setIsSubmitting(true);
        try {
            if (modal.data) {
                await api.updateCollege(Number(modal.data.id), values);
                toast.success("College updated");
            } else {
                await api.createCollege(values);
                toast.success("College created");
            }
            modal.closeFn();
            fetchColleges(page);
        } catch (error) {
            toast.error(apiGetError(error, 'Failed to save college'));
        } finally {
            setIsSubmitting(false);
        }
    }, [modal, page, fetchColleges]);

    const handleDelete = useCallback((college: GetCollegeDto) => {
        confirmDeleteModal.openFn(college);
    }, [confirmDeleteModal]);

    const confirmDelete = useCallback(async (college: GetCollegeDto) => {
        setIsSubmitting(true);
        try {
            await api.deleteCollege(Number(college.id));
            toast.success("College deleted");
            fetchColleges(page);
            confirmDeleteModal.closeFn();
        } catch (error) {
            toast.error(apiGetError(error, 'Failed to delete college'));
        } finally {
            setIsSubmitting(false);
        }
    }, [page, fetchColleges, confirmDeleteModal]);

    // 5. Wrap columns in useMemo so the DataTable component doesn't re-render needlessly
    const columns = useMemo<TableColumn<GetCollegeDto & Record<string, unknown>>[]>(() => [
        {
            header: "College",
            accessor: "collegeName",
            render: (_, row: GetCollegeDto) => {
                return (
                    <div className="block">
                        <p className="font-medium">{row.collegeName}</p>
                        <span className="small text-xs text-muted-foreground">{row.collegeShortName}</span>
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
                            <DropdownMenuItem className="cursor-pointer flex items-center gap-2" onClick={() => handleEdit(row as unknown as GetCollegeDto)}>
                                <Pencil className="h-4 w-4" />
                                <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer flex items-center gap-2 text-destructive" onClick={() => handleDelete(row as unknown as GetCollegeDto)} disabled={isSubmitting}>
                                <Trash2 className="h-4 w-4" />
                                <span>Delete</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            ),
        },
    ], [handleEdit, handleDelete, isSubmitting]);

    const totalPage = Number(collegePaginated?.paginationMeta?.totalPages ?? 1);

    return (
        <div className="w-full">
            <div className="flex justify-end mb-2">
                <Button onClick={handleAdd} size="sm">
                    <Plus className="w-4 h-4 mr-1" /> Add College
                </Button>
            </div>
            <DataTable
                columns={columns}
                data={((collegePaginated?.data ?? []) as unknown as Record<string, unknown>[])}
                isLoading={isLoading}
                totalPage={totalPage}
                rows={ROWS_PER_PAGE}
                page={page}
                onPageChange={setPage}
                emptyMessage="No colleges found for this campus."
            />

            <Modal controller={modal} title={modal.data ? "Edit College" : "Add College"} size="sm">
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label htmlFor="collegeName" className="block text-sm font-medium mb-1">College Name</label>
                        <Input
                            id="collegeName"
                            {...form.register("collegeName")}
                            disabled={isSubmitting}
                            autoFocus
                        />
                        {form.formState.errors.collegeName && (
                            <div className="text-xs text-red-500 mt-1">{form.formState.errors.collegeName.message}</div>
                        )}
                    </div>
                    <div>
                        <label htmlFor="collegeShortName" className="block text-sm font-medium mb-1">Short Name</label>
                        <Input
                            id="collegeShortName"
                            {...form.register("collegeShortName")}
                            disabled={isSubmitting}
                        />
                        {form.formState.errors.collegeShortName && (
                            <div className="text-xs text-red-500 mt-1">{form.formState.errors.collegeShortName.message}</div>
                        )}
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
                title="Delete College"
                description={data => (
                    <>
                        Are you sure you want to delete <b>{data?.collegeName}</b>?
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
}