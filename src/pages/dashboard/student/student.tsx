import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import DataTable, { type TableColumn } from '@/components/table.component';
import PageLayout from '@/components/page.component';
import type { EnrollmentBackdoorDto, GetPaginatedResponseDto } from '@/types';
import { fetchData } from '@/lib/fetch';
import { useModal } from '@/components/modal.component';
import FacultyCreateModal from '@/pages/dashboard/faculty/faculty-create.modal';
import StudentUpdateModal from './student-update.modal';
import StudentTransferModal from './student-transfer.modal';

type StudentRow = EnrollmentBackdoorDto & Record<string, unknown>;

const buildStudentColumns = (
	handleTransfer: (record: EnrollmentBackdoorDto) => void,
	handleEdit: (record: EnrollmentBackdoorDto) => void,
): TableColumn<StudentRow>[] => [
	{
		header: 'Campus',
		accessor: 'academicProgram.college.campus.campusShortName',
		render: (_, row) => (
			<div className="flex flex-col gap-0.5">
				<span className="text-sm font-medium">{row.academicProgram?.college?.campus?.campusShortName ?? '—'}</span>
				<span className="text-xs text-muted-foreground">{row.academicProgram?.college?.campus?.campusName}</span>
			</div>
		),
	},
	{
		header: 'College',
		accessor: 'academicProgram.college.collegeShortName',
		render: (_, row) => (
			<div className="flex flex-col gap-0.5">
				<span className="text-sm font-medium">{row.academicProgram?.college?.collegeShortName ?? '—'}</span>
				<span className="text-xs text-muted-foreground">{row.academicProgram?.college?.collegeName}</span>
			</div>
		),
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
		header: 'Cycle',
		accessor: 'cycle.cycleDescription',
		render: (_, row) => row.cycle?.cycleDescription ?? '—',
	},
	{
		header: 'School Year',
		accessor: 'cycle.schoolYear',
		render: (_, row) => row.cycle?.schoolYear ?? '—',
	},
	{
		header: 'User',
		accessor: 'user.fullName',
		render: (_, row) => row.user?.fullName ?? 'N/A',
	},
	{
		header: 'Section',
		accessor: 'sectionName',
		render: (value) => <span className="font-medium">{value as string}</span>,
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
						<DropdownMenuItem className="cursor-pointer flex items-center gap-2" onClick={() => handleTransfer(row as EnrollmentBackdoorDto)}>
							<Eye className="h-4 w-4" />
							<span>Transfer</span>
						</DropdownMenuItem>
						<DropdownMenuItem className="cursor-pointer flex items-center gap-2" onClick={() => handleEdit(row as EnrollmentBackdoorDto)}>
							<Pencil className="h-4 w-4" />
							<span>Edit</span>
						</DropdownMenuItem>
						<DropdownMenuItem className="cursor-pointer flex items-center gap-2 text-destructive">
							<Trash2 className="h-4 w-4" />
							<span>Delete</span>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		),
	},
];

export default function StudentPage() {
	const createModalState = useModal<null>();
	const editModalState = useModal<EnrollmentBackdoorDto>();
	const transferModalState = useModal<EnrollmentBackdoorDto>();
	const [selectedCampus, setSelectedCampus] = useState('');
	const [campusCodes, setCampusCodes] = useState<string[]>([]);
	const [studentData, setStudentData] = useState<GetPaginatedResponseDto<EnrollmentBackdoorDto>>({
		data: [],
		paginationMeta: { page: 1, rows: 10, totalPages: 1, totalItems: 0 },
	});
	const [isLoadingCampusCodes, setIsLoadingCampusCodes] = useState(false);
	const [isLoadingStudents, setIsLoadingStudents] = useState(false);
	const [page, setPage] = useState(1);
	const [rows, setRows] = useState(10);
	const [searchQuery, setSearchQuery] = useState('');
	const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
	const [refetchKey, setRefetchKey] = useState(0);

	const handleCreated = () => {
		setRefetchKey((previousValue) => previousValue + 1);
	};

	const handleTransfer = (record: EnrollmentBackdoorDto) => {
		if (!record) return;
		transferModalState.openFn(record);
	};

	const handleEdit = (record: EnrollmentBackdoorDto) => {
		if (!record) return;
		editModalState.openFn(record);
	};

	const handleUpdated = () => {
		setRefetchKey((previousValue) => previousValue + 1);
	};

	const handleTransferred = () => {
		setRefetchKey((previousValue) => previousValue + 1);
	};

	useEffect(() => {
		const getCampusCodes = async () => {
			setIsLoadingCampusCodes(true);
			try {
				const response = await fetchData('GET', 'EnrollmentBackdoor/campus-codes');
				if (!response.ok) {
					throw new Error('Failed to fetch campus codes');
				}
				const data: string[] = await response.json();
				setCampusCodes(data);
				if (data.length > 0) {
					setSelectedCampus(data[0]);
				}
			} catch {
				toast.error('Failed to fetch campus codes. Please try again later.');
			} finally {
				setIsLoadingCampusCodes(false);
			}
		};

		getCampusCodes();
	}, []);

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearchQuery(searchQuery);
			setPage(1);
		}, 500);

		return () => clearTimeout(timer);
	}, [searchQuery]);

	useEffect(() => {
		if (!selectedCampus) return;

		const getStudentData = async () => {
			setIsLoadingStudents(true);
			try {
				const queryParams = new URLSearchParams({
					campusCode: selectedCampus,
					page: String(page),
					rows: String(rows),
					...(debouncedSearchQuery && { search: debouncedSearchQuery }),
				});

				const response = await fetchData(
					'GET',
					`EnrollmentBackdoor/students?${queryParams.toString()}`,
					{
						method: 'GET',
						headers: { 'Content-Type': 'application/json' },
					},
				);

				if (!response.ok) {
					throw new Error('Failed to fetch student data');
				}

				const data: GetPaginatedResponseDto<EnrollmentBackdoorDto> = await response.json();
				setStudentData(data);
			} catch {
				toast.error('Failed to fetch student data. Please try again later.');
			} finally {
				setIsLoadingStudents(false);
			}
		};

		getStudentData();
	}, [selectedCampus, page, rows, debouncedSearchQuery, refetchKey]);

	const studentColumns = buildStudentColumns(handleTransfer, handleEdit);

	const handleCampusChange = (campusCode: string) => {
		if (!campusCode) {
			setStudentData({ data: [], paginationMeta: { page: 1, rows: 10, totalPages: 1, totalItems: 0 } });
		}
		setPage(1);
		setSearchQuery('');
		setSelectedCampus(campusCode);
	};

	return (
		<>
			<FacultyCreateModal state={createModalState} onCreated={handleCreated} />
			<StudentUpdateModal state={editModalState} onUpdated={handleUpdated} />
			<StudentTransferModal state={transferModalState} onTransferred={handleTransferred} />
			<PageLayout
				title="Student Dashboard"
				description="Select a campus code to load student enrollment records."
				showBackButton={false}
				actions={
					<Button size="sm" onClick={() => createModalState.openFn(null)}>
						<Plus className="h-4 w-4 mr-1" />
						Create
					</Button>
				}
			>
				<div className="flex gap-4 flex-wrap shrink-0">
					<div className="space-y-2">
						<Label htmlFor="campus-code">Campus Code</Label>
						<Select value={selectedCampus} onValueChange={handleCampusChange} disabled={isLoadingCampusCodes}>
							<SelectTrigger id="campus-code">
								<SelectValue placeholder={isLoadingCampusCodes ? 'Loading campus codes...' : 'Select campus code'} />
							</SelectTrigger>
							<SelectContent>
								{campusCodes.map((campusCode) => (
									<SelectItem key={campusCode} value={campusCode}>
										{campusCode}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="flex-1 min-w-64 space-y-2">
						<Label htmlFor="search">Search</Label>
						<Input
							id="search"
							placeholder="Search by section, program, or course name..."
							value={searchQuery}
							onChange={(event) => setSearchQuery(event.target.value)}
							disabled={!selectedCampus || isLoadingStudents}
						/>
					</div>
				</div>

				<div className="flex flex-col min-w-0">
					<div className="flex items-center justify-between pb-2 mb-2">
						<p className="text-sm text-muted-foreground">
							{selectedCampus ? (
								<>
									Total: <span className="font-semibold text-foreground">{studentData.paginationMeta.totalItems}</span> record(s) — Page{' '}
									<span className="font-semibold text-foreground">{studentData.paginationMeta.page}</span> of{' '}
									<span className="font-semibold text-foreground">{studentData.paginationMeta.totalPages}</span>
								</>
							) : (
								'No campus selected.'
							)}
						</p>
						<div className="flex items-center gap-2">
							<span className="text-sm text-muted-foreground">Rows per page</span>
							<Select
								value={String(rows)}
								onValueChange={(value) => {
									setRows(Number(value));
									setPage(1);
								}}
							>
								<SelectTrigger className="w-20 h-8 text-sm">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{[10, 25, 50, 100].map((rowCount) => (
										<SelectItem key={rowCount} value={String(rowCount)}>
											{rowCount}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<DataTable<StudentRow>
						columns={studentColumns}
						data={studentData.data as StudentRow[]}
						isLoading={isLoadingStudents}
						totalPage={studentData.paginationMeta.totalPages}
						rows={rows}
						page={page}
						onPageChange={setPage}
						emptyMessage={selectedCampus ? (searchQuery ? 'No records match your search.' : 'No records found.') : 'Select a campus to load data.'}
					/>
				</div>
			</PageLayout>
		</>
	);
}
