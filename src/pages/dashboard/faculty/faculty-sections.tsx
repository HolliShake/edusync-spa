import { fetchData } from '@/lib/fetch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import DataTable, { type TableColumn } from '@/components/table.component';
import PageLayout from '@/components/page.component';
import { toast } from 'sonner';
import type { GetPaginatedResponseDto, EnrollmentBackdoorDto } from '@/types';
import type React from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import Modal, { type ModalState, useModal } from '@/components/modal.component';
import ConfirmModal from '@/components/confirm.component';
import FacultyUpdateModal from '@/pages/dashboard/faculty/faculty-update.modal';
import { z } from 'zod';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const createEnrollmentSchema = z.object({
    userId: z.string().min(1, 'User is required'),
    sectionName: z.string().min(1, 'Section name is required'),
    cycleId: z.number().int().positive('Cycle is required'),
    academicProgramId: z.number().int().positive('Academic program is required'),
    courseId: z.number().int().positive('Course is required'),
    campusCode: z.string().min(1, 'Campus code is required'),
    enrollmentRoleId: z.number().int().positive('Enrollment role is required'),
});

const userSearchSchema = z.object({
    search: z.string(),
});

type UserSearchFormValues = z.infer<typeof userSearchSchema>;

type StudentRow = EnrollmentBackdoorDto & Record<string, unknown>;

function buildStudentColumns(onEdit: (row: StudentRow) => void, onDelete: (row: StudentRow) => void): TableColumn<StudentRow>[] {
    return [
    {
        header: 'Student',
        accessor: 'user.fullName',
        render: (_, row) => <span className="font-medium">{row.user?.fullName ?? 'N/A'}</span>,
    },
    {
        header: 'Email',
        accessor: 'user.email',
        render: (_, row) => row.user?.email ?? 'N/A',
    },
    {
        header: 'Section',
        accessor: 'sectionName',
    },
    {
        header: 'Program',
        accessor: 'academicProgram.shortName',
        render: (_, row) => (
            <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{row.academicProgram?.shortName ?? '—'}</span>
                <span className="text-xs text-muted-foreground">{row.academicProgram?.programName}</span>
            </div>
        ),
    },
    {
        header: 'Course',
        accessor: 'course.courseCode',
        render: (_, row) => (
            <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{row.course?.courseCode ?? '—'}</span>
                <span className="text-xs text-muted-foreground">{row.course?.courseTitle}</span>
                <span className="text-xs text-muted-foreground">{row.course?.courseDescription || 'No description'}</span>
                <span className="text-xs text-muted-foreground">{`Units: ${row.course?.lectureUnits ?? 0}Lec / ${row.course?.laboratoryUnits ?? 0}Lab / ${row.course?.creditUnits ?? 0}Cr`}</span>
                <span className="text-xs text-muted-foreground">{row.course?.withLaboratory ? 'With Laboratory' : 'No Laboratory'}</span>
            </div>
        ),
    },
    {
        header: 'Year',
        accessor: 'yearLevel',
        render: (value) => <Badge variant="outline">{value as string}</Badge>,
    },
    {
        header: 'Term',
        accessor: 'termNumber',
        render: (value) => <Badge variant="outline">{value as string}</Badge>,
    },
    {
        header: 'Role',
        accessor: 'enrollmentRole.enrollmentRoleName',
        render: (_, row) => (
            <Badge variant="secondary">
                {row.enrollmentRole?.enrollmentRoleName ?? row.enrollmentRole?.roleName ?? 'Student/Learner'}
            </Badge>
        ),
    },
    {
        header: 'Actions',
        accessor: 'id',
        render: (_, row) => (
            <div className="flex items-center justify-center">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem className="cursor-pointer flex items-center gap-2" onClick={() => onEdit(row)}>
                            <Pencil className="h-4 w-4" />
                            <span>Edit</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer flex items-center gap-2 text-destructive" onClick={() => onDelete(row)}>
                            <Trash2 className="h-4 w-4" />
                            <span>Delete</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        ),
    },
];
}

const EMPTY_STUDENTS: GetPaginatedResponseDto<EnrollmentBackdoorDto> = {
    data: [],
    paginationMeta: {
        page: 1,
        rows: 10,
        totalPages: 1,
        totalItems: 0,
    },
};

type PaginatedUser = {
    id: string;
    email?: string;
    userName?: string;
    fullName?: string;
    role?: string;
};

const EMPTY_USERS: GetPaginatedResponseDto<PaginatedUser> = {
    data: [],
    paginationMeta: {
        page: 1,
        rows: 50,
        totalPages: 1,
        totalItems: 0,
    },
};



function AddStudentModal({ state, onCreated }: { state: ModalState<EnrollmentBackdoorDto>; onCreated: () => void }): React.ReactNode {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [usersResponse, setUsersResponse] = useState<GetPaginatedResponseDto<PaginatedUser>>(EMPTY_USERS);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [debouncedUserSearch, setDebouncedUserSearch] = useState('');
    const [selectedUserId, setSelectedUserId] = useState('');
    const [userPage, setUserPage] = useState(1);
    const [userRows, setUserRows] = useState(10);

    const { register, control } = useForm<UserSearchFormValues>({
        resolver: zodResolver(userSearchSchema),
        defaultValues: { search: '' },
    });

    const userSearch = useWatch({ control, name: 'search' });

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedUserSearch(userSearch.trim());
            setUserPage(1);
        }, 400);

        return () => clearTimeout(timer);
    }, [userSearch]);

    useEffect(() => {
        if (!state.isOpen) return;

        const getUsers = async () => {
            setIsLoadingUsers(true);
            try {
                const queryParams = new URLSearchParams({
                    search: debouncedUserSearch,
                    page: String(userPage),
                    rows: String(userRows),
                });

                const response = await fetchData('GET', `User/paginate?${queryParams.toString()}`);

                if (!response.ok) {
                    throw new Error('Failed to fetch users');
                }

                const data: GetPaginatedResponseDto<PaginatedUser> = await response.json();
                setUsersResponse(data);
            } catch {
                setUsersResponse(EMPTY_USERS);
                toast.error('Failed to fetch users. Please try again later.');
            } finally {
                setIsLoadingUsers(false);
            }
        };

        getUsers();
    }, [debouncedUserSearch, state.isOpen, userPage, userRows]);

    const createNewStudent = async (userId: string) => {
        if (userId?.length <= 0) return;
        setIsSubmitting(true);
        try {
            let normalizedCampusCode = (state.data?.academicProgram?.college?.campus?.campusShortName ?? '')
                .replaceAll(' ', '')
                .replaceAll('-', '')
                .replaceAll('_', '')
                .toLowerCase();

            if (normalizedCampusCode === 'ustpcdo') {
                normalizedCampusCode = 'USTP-CDO';
            }

            if (normalizedCampusCode.length <= 0) {
                setIsSubmitting(false);
                return toast.error('Invalid campus code for the selected faculty section.');
            }

            const parsed = createEnrollmentSchema.safeParse({
                userId,
                sectionName: state.data?.sectionName ?? '',
                cycleId: state.data?.cycleId ?? 0,
                academicProgramId: state.data?.academicProgramId ?? 0,
                courseId: state.data?.courseId ?? 0,
                campusCode: normalizedCampusCode,
                enrollmentRoleId: 1,
            });

            if (!parsed.success) {
                const messages = parsed.error.issues.map((e) => e.message).join(', ');
                toast.error(`Validation failed: ${messages}`);
                return;
            }

            const payload = parsed.data;

            const response = await fetchData('POST', 'EnrollmentBackdoor/create', {
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error('Failed to create student enrollment');
            }

            setSelectedUserId('');
            toast.success('Student successfully added.');
            onCreated();
            state.closeFn();
        } catch {
            toast.error('Failed to add student. Please try again later.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal controller={state} title="Add Student" size="3xl">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="user-search">Search User</Label>
                    <Input
                        id="user-search"
                        placeholder="Search by name or email..."
                        disabled={isLoadingUsers || isSubmitting}
                        {...register('search')}
                    />
                </div>

                <div className="rounded-md border">
                    <div className="max-h-80 overflow-auto">
                        {isLoadingUsers && (
                            <div className="p-4 text-sm text-muted-foreground">Loading users...</div>
                        )}

                        {!isLoadingUsers && usersResponse.data.length === 0 && (
                            <div className="p-4 text-sm text-muted-foreground">No users found.</div>
                        )}

                        {!isLoadingUsers && usersResponse.data.map((user) => {
                            const isSelected = selectedUserId === user.id;

                            return (
                                <button
                                    key={user.id}
                                    type="button"
                                    onClick={() => setSelectedUserId(user.id)}
                                    className={`w-full border-b p-3 text-left last:border-b-0 ${isSelected ? 'bg-muted' : 'bg-background hover:bg-muted/50'}`}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium">{user.fullName ?? user.userName ?? user.email ?? user.id}</p>
                                            <p className="truncate text-xs text-muted-foreground">{user.email ?? 'No email'}</p>
                                        </div>
                                        <Badge variant={isSelected ? 'default' : 'outline'}>
                                            {isSelected ? 'Selected' : (user.role ?? 'User')}
                                        </Badge>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <p>Total users: {usersResponse.paginationMeta.totalItems}</p>
                    <div className="flex items-center gap-2">
                        <span>Rows</span>
                        <Select value={String(userRows)} onValueChange={(value) => { setUserRows(Number(value)); setUserPage(1); }}>
                            <SelectTrigger className="h-8 w-20">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {[10, 25, 50].map((rowValue) => (
                                    <SelectItem key={rowValue} value={String(rowValue)}>
                                        {rowValue}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setUserPage((previousPage) => Math.max(1, previousPage - 1))}
                        disabled={userPage <= 1 || isLoadingUsers || isSubmitting}
                    >
                        Prev
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        {usersResponse.paginationMeta.page} / {usersResponse.paginationMeta.totalPages}
                    </span>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setUserPage((previousPage) => Math.min(usersResponse.paginationMeta.totalPages, previousPage + 1))}
                        disabled={userPage >= usersResponse.paginationMeta.totalPages || isLoadingUsers || isSubmitting}
                    >
                        Next
                    </Button>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={state.closeFn} disabled={isSubmitting || selectedUserId?.length <= 0}>
                        Cancel
                    </Button>
                    <Button
                        onClick={() => createNewStudent(selectedUserId)}
                        disabled={!selectedUserId || isSubmitting}
                    >
                        {isSubmitting ? 'Submitting...' : 'Enroll Student'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

export default function FacultySectionsPage(): React.ReactNode {
    const navigate = useNavigate();
    const [selectedFaculty] = useState<EnrollmentBackdoorDto | null>(() => {
        const stored = localStorage.getItem('selected-faculty');
        if (!stored) return null;

        try {
            return JSON.parse(stored) as EnrollmentBackdoorDto;
        } catch {
            return null;
        }
    });

    const [studentsResponse, setStudentsResponse] = useState<GetPaginatedResponseDto<EnrollmentBackdoorDto>>(EMPTY_STUDENTS);
    const [isLoadingStudents, setIsLoadingStudents] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [rows, setRows] = useState(10);
    const [refetchKey, setRefetchKey] = useState(0);
    const addStudentModalState = useModal<EnrollmentBackdoorDto>();
    const editStudentModalState = useModal<EnrollmentBackdoorDto>();
    const deleteStudentModalState = useModal<EnrollmentBackdoorDto>();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleUpdated = () => {
        setRefetchKey((previousValue) => previousValue + 1);
    };

    const handleDelete = async (record: EnrollmentBackdoorDto) => {
        setIsDeleting(true);
        try {
            const response = await fetchData('DELETE', `EnrollmentBackdoor/delete/${record.id}`);
            if (!response.ok) throw new Error('Failed to delete enrollment');
            toast.success('Student removed successfully.');
            deleteStudentModalState.closeFn();
            setRefetchKey((previousValue) => previousValue + 1);
        } catch {
            toast.error('Failed to remove student. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };

    useEffect(() => {
        if (!selectedFaculty) {
            navigate(-1);
        }
    }, [navigate, selectedFaculty]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery.trim());
            setPage(1);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        if (!selectedFaculty) return;

        const getFacultyStudents = async () => {
            setIsLoadingStudents(true);
            try {
                const queryParams = new URLSearchParams({
                    page: String(page),
                    rows: String(rows),
                });

                if (debouncedSearchQuery) {
                    queryParams.set('search', debouncedSearchQuery);
                }

                const facultyId = selectedFaculty.userId;
                const sectionName = selectedFaculty.sectionName;
                const cycleId = selectedFaculty.cycleId;
                const programId = selectedFaculty.academicProgramId;
                const courseId = selectedFaculty.courseId;

                if (!facultyId || !sectionName || !cycleId || !programId || !courseId) {
                    throw new Error('Missing required faculty section route parameters');
                }

                const response = await fetchData(
                    'GET',
                    `EnrollmentBackdoor/faculty/${facultyId}/section/${encodeURIComponent(sectionName)}/cycle/${cycleId}/program/${programId}/course/${courseId}/students?${queryParams.toString()}`,
                );

                if (!response.ok) {
                    throw new Error('Failed to fetch faculty section students');
                }

                const data: GetPaginatedResponseDto<EnrollmentBackdoorDto> = await response.json();
                setStudentsResponse(data);
            } catch {
                setStudentsResponse(EMPTY_STUDENTS);
                toast.error('Failed to fetch students. Please try again later.');
            } finally {
                setIsLoadingStudents(false);
            }
        };

        getFacultyStudents();
    }, [debouncedSearchQuery, page, rows, selectedFaculty, refetchKey]);

    const handleRowsChange = (value: string) => {
        setRows(Number(value));
        setPage(1);
    };

    if (!selectedFaculty) {
        return null;
    }

    return (
        <PageLayout
            title="Faculty Section Students"
            description="View enrolled students for the selected faculty section."
            showBackButton
            onBack={() => navigate(-1)}
        >

            <div className="grid gap-3 rounded-md border p-4 sm:grid-cols-2 xl:grid-cols-5">
                <div>
                    <Label className="text-xs text-muted-foreground">Faculty</Label>
                    <p className="text-sm font-medium">{selectedFaculty.user?.fullName ?? 'N/A'}</p>
                </div>
                <div>
                    <Label className="text-xs text-muted-foreground">Section</Label>
                    <p className="text-sm font-medium">{selectedFaculty.sectionName}</p>
                </div>
                <div>
                    <Label className="text-xs text-muted-foreground">Program</Label>
                    <p className="text-sm font-medium">{selectedFaculty.academicProgram?.shortName ?? '—'}</p>
                </div>
                <div>
                    <Label className="text-xs text-muted-foreground">Campus</Label>
                    <p className="text-sm font-medium">{selectedFaculty.academicProgram?.college?.campus?.campusShortName ?? '—'}</p>
                </div>
                <div>
                    <Label className="text-xs text-muted-foreground">Course</Label>
                    <p className="text-sm font-medium">{selectedFaculty.course?.courseCode ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">{selectedFaculty.course?.courseTitle ?? 'No title'}</p>
                    <p className="text-xs text-muted-foreground">
                        {`Units: ${selectedFaculty.course?.lectureUnits ?? 0}Lec / ${selectedFaculty.course?.laboratoryUnits ?? 0}Lab / ${selectedFaculty.course?.creditUnits ?? 0}Cr`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {selectedFaculty.course?.withLaboratory ? 'With Laboratory' : 'No Laboratory'}
                    </p>
                </div>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="w-full max-w-md space-y-2">
                    <Label htmlFor="student-search">Search Student</Label>
                    <Input
                        id="student-search"
                        placeholder="Search by name, email, section, or course..."
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        disabled={isLoadingStudents}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="default"
                        onClick={() => addStudentModalState.openFn(selectedFaculty)}
                    >
                        Enroll Student
                    </Button>
                    <span className="text-sm text-muted-foreground">Rows per page</span>
                    <Select value={String(rows)} onValueChange={handleRowsChange}>
                        <SelectTrigger className="h-8 w-20">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {[10, 25, 50, 100].map((rowValue) => (
                                <SelectItem key={rowValue} value={String(rowValue)}>
                                    {rowValue}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
                <p>
                    Total: <span className="font-semibold text-foreground">{studentsResponse.paginationMeta.totalItems}</span> student(s)
                </p>
            </div>

            <DataTable<StudentRow>
                columns={buildStudentColumns(
                    (row) => editStudentModalState.openFn(row as EnrollmentBackdoorDto),
                    (row) => deleteStudentModalState.openFn(row as EnrollmentBackdoorDto),
                )}
                data={studentsResponse.data as StudentRow[]}
                isLoading={isLoadingStudents}
                totalPage={studentsResponse.paginationMeta.totalPages}
                rows={rows}
                page={page}
                onPageChange={setPage}
                emptyMessage={debouncedSearchQuery ? 'No students match your search.' : 'No students found for this section.'}
            />

            <AddStudentModal state={addStudentModalState} onCreated={() => setRefetchKey((previousValue) => previousValue + 1)} />
            <FacultyUpdateModal state={editStudentModalState} onUpdated={handleUpdated} />
            <ConfirmModal<EnrollmentBackdoorDto>
                state={deleteStudentModalState}
                title="Remove Student"
                description={(data) => {
                    const name = data?.user?.fullName ?? data?.user?.email ?? `ID ${data?.id}`;
                    return (
                        <>
                            Are you sure you want to remove{' '}
                            <span className="font-semibold text-foreground">{name}</span> from this
                            section? This action cannot be undone.
                        </>
                    );
                }}
                confirmLabel="Remove"
                isLoading={isDeleting}
                onConfirm={handleDelete}
            />
        </PageLayout>
    );
}


