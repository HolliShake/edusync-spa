import Modal, { type ModalState } from '@/components/modal.component';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { fetchData } from '@/lib/fetch';
import type { EnrollmentBackdoorDto, GetPaginatedResponseDto } from '@/types';
import { useEffect, useState, useRef, type ReactNode } from 'react';
import { toast } from 'sonner';

type StudentTransferModalProps = {
	state: ModalState<EnrollmentBackdoorDto>;
	onTransferred: (updated: EnrollmentBackdoorDto) => void;
};

export default function StudentTransferModal({ state, onTransferred }: StudentTransferModalProps): ReactNode {
	const [campusCodes, setCampusCodes] = useState<string[]>([]);
	const [selectedCampus, setSelectedCampus] = useState('');
	const [facultyData, setFacultyData] = useState<GetPaginatedResponseDto<EnrollmentBackdoorDto>>({
		data: [],
		paginationMeta: { page: 1, rows: 10, totalPages: 1, totalItems: 0 },
	});
	const [isLoadingCampusCodes, setIsLoadingCampusCodes] = useState(false);
	const [isLoadingFaculty, setIsLoadingFaculty] = useState(false);
	const [isTransferring, setIsTransferring] = useState(false);
	const [page, setPage] = useState(1);
	const [rows, setRows] = useState(10);
	const [searchQuery, setSearchQuery] = useState('');
	const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
	const prevCampusRef = useRef<string>('');

	useEffect(() => {
		if (!state.isOpen || !state.data) {
			prevCampusRef.current = '';
			return;
		}

		// Set initial campus from student data if available (only on first open)
		const initialCampus = state.data?.academicProgram?.college?.campus?.campusShortName ?? '';
		if (prevCampusRef.current !== initialCampus) {
			setSelectedCampus(initialCampus);
			prevCampusRef.current = initialCampus;
			setPage(1);
			setSearchQuery('');
			setDebouncedSearchQuery('');
		}
	}, [state.isOpen, state.data]);

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
			} catch {
				toast.error('Failed to fetch campus codes. Please try again later.');
			} finally {
				setIsLoadingCampusCodes(false);
			}
		};

		if (state.isOpen) {
			getCampusCodes();
		}
	}, [state.isOpen]);

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearchQuery(searchQuery);
			setPage(1);
		}, 500);

		return () => clearTimeout(timer);
	}, [searchQuery]);

	useEffect(() => {
		if (!selectedCampus || !state.isOpen) return;

		const getFacultyData = async () => {
			setIsLoadingFaculty(true);
			try {
				const queryParams = new URLSearchParams({
					campusCode: selectedCampus,
					page: String(page),
					rows: String(rows),
					...(debouncedSearchQuery && { search: debouncedSearchQuery }),
				});

				const response = await fetchData(
					'GET',
					`EnrollmentBackdoor/faculty?${queryParams.toString()}`,
					{
						method: 'GET',
						headers: { 'Content-Type': 'application/json' },
					},
				);

				if (!response.ok) {
					throw new Error('Failed to fetch faculty data');
				}

				const data: GetPaginatedResponseDto<EnrollmentBackdoorDto> = await response.json();
				setFacultyData(data);
			} catch {
				toast.error('Failed to fetch faculty data. Please try again later.');
			} finally {
				setIsLoadingFaculty(false);
			}
		};

		getFacultyData();
	}, [selectedCampus, page, rows, debouncedSearchQuery, state.isOpen]);

	const handleSelectFaculty = async (facultyRecord: EnrollmentBackdoorDto) => {
		if (!state.data) {
			toast.error('No student record selected.');
			return;
		}

		setIsTransferring(true);
		try {
			// Prepare updated student record with faculty's data
			const updatedRecord: EnrollmentBackdoorDto = {
				...state.data,
				cycleId: facultyRecord.cycleId,
				courseId: facultyRecord.courseId,
				academicProgramId: facultyRecord.academicProgramId,
				sectionName: facultyRecord.sectionName,
				// Preserve other fields
				yearLevel: state.data.yearLevel,
				termNumber: state.data.termNumber,
				enrollmentRoleId: state.data.enrollmentRoleId,
				campusCode: state.data.campusCode,
			};

			// Submit update to API
			const response = await fetchData('PUT', `EnrollmentBackdoor/update/${state.data.id}`, {
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(updatedRecord),
			});

			if (!response.ok) {
				throw new Error('Failed to transfer student');
			}

			let transferredRecord: EnrollmentBackdoorDto = updatedRecord;
			try {
				const contentType = response.headers.get('content-type') ?? '';
				if (contentType.includes('application/json')) {
					const responseBody = await response.json();
					if (responseBody && typeof responseBody === 'object') {
						transferredRecord = responseBody as EnrollmentBackdoorDto;
					}
				}
			} catch {
				transferredRecord = updatedRecord;
			}

			onTransferred(transferredRecord);
			toast.success('Student transferred successfully.');
			handleClose();
		} catch {
			toast.error('Failed to transfer student. Please try again.');
		} finally {
			setIsTransferring(false);
		}
	};

	const handleCampusChange = (campusCode: string) => {
		setPage(1);
		setSearchQuery('');
		setSelectedCampus(campusCode);
		setFacultyData({
			data: [],
			paginationMeta: { page: 1, rows: 10, totalPages: 1, totalItems: 0 },
		});
	};

	const handleClose = () => {
		state.closeFn();
	};

	return (
		<Modal controller={state} title="Transfer Student to Faculty" size="xl">
			<div className="space-y-4">
				<div className="space-y-2">
					<p className="text-sm text-muted-foreground">
						Transfer <span className="font-semibold">{state.data?.user?.fullName ?? 'Student'}</span> to a faculty enrollment. The selected faculty will set <span className="font-semibold">Cycle, Course, Program, and Section</span>.
					</p>
				</div>

					<Card className="bg-muted/20">
						<CardHeader className="pb-0">
					<div className="flex items-start justify-between gap-3">
						<div>
								<CardTitle className="text-sm">Current Enrollment</CardTitle>
								<CardDescription>
								Review this before selecting a faculty target.
								</CardDescription>
						</div>
						<div className="flex items-center gap-2">
							<Badge variant="secondary">Year {state.data?.yearLevel ?? '—'}</Badge>
							<Badge variant="secondary">Term {state.data?.termNumber ?? '—'}</Badge>
						</div>
					</div>
						</CardHeader>
						<CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
						<div>
							<p className="text-xs text-muted-foreground">Campus</p>
							<p className="font-medium">
								{state.data?.academicProgram?.college?.campus?.campusShortName ?? state.data?.campusCode ?? '—'} · {state.data?.academicProgram?.college?.campus?.campusName ?? '—'}
							</p>
						</div>
						<div>
							<p className="text-xs text-muted-foreground">College / Program</p>
							<p className="font-medium">
								{state.data?.academicProgram?.college?.collegeShortName ?? '—'} · {state.data?.academicProgram?.shortName ?? '—'}
							</p>
							<p className="text-xs text-muted-foreground">{state.data?.academicProgram?.programName ?? '—'}</p>
						</div>
						<div>
							<p className="text-xs text-muted-foreground">Cycle</p>
							<p className="font-medium">
								{state.data?.cycle?.cycleDescription ?? '—'} ({state.data?.cycle?.schoolYear ?? '—'})
							</p>
						</div>
						<div>
							<p className="text-xs text-muted-foreground">Course</p>
							<p className="font-medium">
								{state.data?.course?.courseCode ?? '—'} · {state.data?.course?.courseTitle ?? '—'}
							</p>
						</div>
						<div className="md:col-span-2">
							<p className="text-xs text-muted-foreground">Section</p>
							<p className="font-medium">{state.data?.sectionName ?? '—'}</p>
						</div>
					</CardContent>
				</Card>
				<div className="flex gap-4 flex-wrap shrink-0">
					<div className="space-y-2 flex-1 min-w-64">
						<Label htmlFor="transfer-campus">Campus</Label>
						<Select value={selectedCampus} onValueChange={handleCampusChange} disabled={isLoadingCampusCodes || isTransferring}>
							<SelectTrigger id="transfer-campus" className="w-full">
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
						<Label htmlFor="transfer-search">Search</Label>
						<Input
							id="transfer-search"
							placeholder="Search by section, program, or course name..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							disabled={!selectedCampus || isLoadingFaculty || isTransferring}
						/>
					</div>
				</div>

				<div className="flex flex-col min-w-0">
					<div className="flex items-center justify-between pb-2 mb-2">
						<p className="text-sm text-muted-foreground">
							{selectedCampus
								? <>Total: <span className="font-semibold text-foreground">{facultyData.paginationMeta.totalItems}</span> record(s) — Page <span className="font-semibold text-foreground">{facultyData.paginationMeta.page}</span> of <span className="font-semibold text-foreground">{facultyData.paginationMeta.totalPages}</span></>
								: 'No campus selected.'}
						</p>
						<div className="flex items-center gap-2">
							<span className="text-sm text-muted-foreground">Rows per page</span>
							<select
								value={String(rows)}
								onChange={(e) => {
									setRows(Number(e.target.value));
									setPage(1);
								}}
								disabled={isTransferring}
								className="flex h-8 w-20 rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
							>
								{[10, 25, 50, 100].map((r) => (
									<option key={r} value={String(r)}>
										{r}
									</option>
								))}
							</select>
						</div>
					</div>

					<ScrollArea className="max-h-96 pr-1">
						<div className="space-y-3">
						{isLoadingFaculty ? (
							<Card size="sm">
								<CardContent className="py-3 text-sm text-muted-foreground">Loading faculty records...</CardContent>
							</Card>
						) : !selectedCampus ? (
							<Card size="sm">
								<CardContent className="py-3 text-sm text-muted-foreground">Select a campus to load data.</CardContent>
							</Card>
						) : facultyData.data.length === 0 ? (
							<Card size="sm">
								<CardContent className="py-3 text-sm text-muted-foreground">
								{searchQuery ? 'No records match your search.' : 'No records found.'}
								</CardContent>
							</Card>
						) : (
							facultyData.data.map((record) => (
								<Card key={record.id} className="gap-0">
									<CardContent className="p-4 space-y-3">
									<div className="flex items-start justify-between gap-3">
										<div>
											<p className="text-sm font-semibold">{record.user?.fullName ?? 'N/A'}</p>
											<p className="text-xs text-muted-foreground">{record.user?.email ?? `User ID: ${record.userId}`}</p>
										</div>
										<div className="flex items-center gap-2">
											<Badge variant="outline">Year {record.yearLevel ?? '—'}</Badge>
											<Badge variant="outline">Term {record.termNumber ?? '—'}</Badge>
										</div>
									</div>

									<div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
										<div>
											<p className="text-xs text-muted-foreground">Campus</p>
											<p className="font-medium">{record.academicProgram?.college?.campus?.campusShortName ?? '—'} · {record.academicProgram?.college?.campus?.campusName ?? '—'}</p>
										</div>
										<div>
											<p className="text-xs text-muted-foreground">College / Program</p>
											<p className="font-medium">{record.academicProgram?.college?.collegeShortName ?? '—'} · {record.academicProgram?.shortName ?? '—'}</p>
											<p className="text-xs text-muted-foreground">{record.academicProgram?.programName ?? '—'}</p>
										</div>
										<div>
											<p className="text-xs text-muted-foreground">Cycle</p>
											<p className="font-medium">{record.cycle?.cycleDescription ?? '—'} ({record.cycle?.schoolYear ?? '—'})</p>
										</div>
										<div>
											<p className="text-xs text-muted-foreground">Course</p>
											<p className="font-medium">{record.course?.courseCode ?? '—'} · {record.course?.courseTitle ?? '—'}</p>
										</div>
										<div className="md:col-span-2">
											<p className="text-xs text-muted-foreground">Section</p>
											<p className="font-medium">{record.sectionName ?? '—'}</p>
										</div>
									</div>

									<div className="flex justify-end">
										<Button
											size="sm"
											variant="outline"
											onClick={() => handleSelectFaculty(record)}
											disabled={isTransferring}
										>
											Select for Transfer
										</Button>
									</div>
									</CardContent>
								</Card>
							))
						)}
						</div>
					</ScrollArea>

					<div className="flex items-center justify-end gap-2 mt-3">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
							disabled={isTransferring || page <= 1 || isLoadingFaculty}
						>
							Previous
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => setPage((prev) => Math.min(prev + 1, facultyData.paginationMeta.totalPages || 1))}
							disabled={isTransferring || page >= (facultyData.paginationMeta.totalPages || 1) || isLoadingFaculty}
						>
							Next
						</Button>
					</div>
				</div>

				<div className="flex justify-end gap-2">
					<Button
						type="button"
						variant="outline"
						onClick={handleClose}
						disabled={isTransferring}
					>
						Cancel
					</Button>
				</div>
			</div>
		</Modal>
	);
}
