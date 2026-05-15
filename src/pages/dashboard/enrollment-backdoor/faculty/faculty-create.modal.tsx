import Modal, { type ModalState } from '@/components/modal.component';
import { Button } from '@/components/ui/button';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { fetchData } from '@/lib/fetch';
import { cn } from '@/lib/utils';
import type { AcademicProgramDto, CampusDto, CollegeDto, Course, CycleDto, EnrollmentBackdoorDto, GetPaginatedResponseDto } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const createEnrollmentSchema = z.object({
	userId: z.string().trim().min(1, 'User ID is required'),
	sectionName: z.string().trim().min(1, 'Section name is required'),
	campusId: z.coerce.number().int().positive('Campus is required'),
	collegeId: z.coerce.number().int().positive('College is required'),
	academicProgramId: z.coerce.number().int().positive('Program is required'),
	cycleId: z.coerce.number().int().positive('Cycle is required'),
	courseId: z.coerce.number().int().positive('Course is required'),
	yearLevel: z.coerce.number().int().min(1, 'Year level is required'),
	termNumber: z.coerce.number().int().min(1, 'Term is required'),
	enrollmentRoleId: z.coerce.number().int().positive('Enrollment role is required'),
});

type CreateEnrollmentValues = z.infer<typeof createEnrollmentSchema>;
type CreateEnrollmentInputValues = z.input<typeof createEnrollmentSchema>;

const DEFAULT_FORM_VALUES: CreateEnrollmentInputValues = {
	userId: '',
	sectionName: '',
	campusId: 0,
	collegeId: 0,
	academicProgramId: 0,
	cycleId: 0,
	courseId: 0,
	yearLevel: 1,
	termNumber: 1,
	enrollmentRoleId: 1,
};

type OptionItem = {
	id: number;
	label: string;
};

type CampusOption = OptionItem & {
	shortName: string;
};

type FacultyCreateModalProps = {
	state: ModalState<null>;
	onCreated: (created: EnrollmentBackdoorDto) => void;
};

type PaginatedUser = {
	id: string;
	email?: string;
	userName?: string;
	fullName?: string;
};

const EMPTY_USERS: GetPaginatedResponseDto<PaginatedUser> = {
	data: [],
	paginationMeta: {
		page: 1,
		rows: 10,
		totalPages: 1,
		totalItems: 0,
	},
};

export default function FacultyCreateModal({ state, onCreated }: FacultyCreateModalProps): ReactNode {
	const [campusOptions, setCampusOptions] = useState<CampusOption[]>([]);
	const [collegeOptions, setCollegeOptions] = useState<OptionItem[]>([]);
	const [programOptions, setProgramOptions] = useState<OptionItem[]>([]);
	const [cycleOptions, setCycleOptions] = useState<OptionItem[]>([]);
	const [courseOptions, setCourseOptions] = useState<OptionItem[]>([]);
	const [isLoadingCampuses, setIsLoadingCampuses] = useState(false);
	const [isLoadingColleges, setIsLoadingColleges] = useState(false);
	const [isLoadingPrograms, setIsLoadingPrograms] = useState(false);
	const [isLoadingCycles, setIsLoadingCycles] = useState(false);
	const [isLoadingCourses, setIsLoadingCourses] = useState(false);
	const [usersResponse, setUsersResponse] = useState<GetPaginatedResponseDto<PaginatedUser>>(EMPTY_USERS);
	const [isLoadingUsers, setIsLoadingUsers] = useState(false);
	const [userSearch, setUserSearch] = useState('');
	const [debouncedUserSearch, setDebouncedUserSearch] = useState('');
	const [isUserComboboxOpen, setIsUserComboboxOpen] = useState(false);
	const [isCourseComboboxOpen, setIsCourseComboboxOpen] = useState(false);
	const [courseSearch, setCourseSearch] = useState('');

	const {
		control,
		register,
		handleSubmit,
		reset,
		setValue,
		formState: { errors, isSubmitting },
	} = useForm<CreateEnrollmentInputValues, unknown, CreateEnrollmentValues>({
		resolver: zodResolver(createEnrollmentSchema),
		defaultValues: DEFAULT_FORM_VALUES,
	});

	const watchedCampusId = useWatch({ control, name: 'campusId' });
	const watchedCollegeId = useWatch({ control, name: 'collegeId' });
	const prevCampusIdRef = useRef<number>(0);
	const prevCollegeIdRef = useRef<number>(0);

	const selectedCampusId = useMemo(() => {
		const n = Number(watchedCampusId);
		return Number.isFinite(n) ? n : 0;
	}, [watchedCampusId]);

	const selectedCollegeId = useMemo(() => {
		const n = Number(watchedCollegeId);
		return Number.isFinite(n) ? n : 0;
	}, [watchedCollegeId]);

	const displayedCollegeOptions = useMemo(
		() => (selectedCampusId ? collegeOptions : []),
		[collegeOptions, selectedCampusId],
	);

	const displayedProgramOptions = useMemo(
		() => (selectedCollegeId ? programOptions : []),
		[programOptions, selectedCollegeId],
	);

	const displayedCycleOptions = useMemo(
		() => (selectedCampusId ? cycleOptions : []),
		[cycleOptions, selectedCampusId],
	);

	const filteredCourseOptions = useMemo(() => {
		const search = courseSearch.trim().toLowerCase();
		if (!search) {
			return courseOptions;
		}

		return courseOptions.filter((item) => item.label.toLowerCase().includes(search));
	}, [courseOptions, courseSearch]);

	const normalizeCampusCode = (campusShortName: string) => {
        const normalized = campusShortName.replaceAll(' ', '').replaceAll('-', '').replaceAll('_', '').toLowerCase();
        if (normalized == 'ustpcdo') {
            return 'USTP-CDO';
        }
        return campusShortName;
    };

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedUserSearch(userSearch.trim());
		}, 400);

		return () => clearTimeout(timer);
	}, [userSearch]);

	useEffect(() => {
		if (!state.isOpen) {
			reset(DEFAULT_FORM_VALUES);
			prevCampusIdRef.current = 0;
			prevCollegeIdRef.current = 0;
		}
	}, [reset, state.isOpen]);

	useEffect(() => {
		if (!state.isOpen) return;

		let isCancelled = false;
		const getCampuses = async () => {
			setIsLoadingCampuses(true);
			try {
				const response = await fetchData('GET', 'Campus/all');
				if (!response.ok) throw new Error();
				const payload: CampusDto[] = await response.json();
				if (isCancelled) return;
				setCampusOptions(
					payload.map((item) => ({
						id: item.id,
						label: item.campusName,
						shortName: item.campusShortName,
					})),
				);
			} catch {
				if (!isCancelled) toast.error('Failed to load campuses. Please try again.');
			} finally {
				if (!isCancelled) setIsLoadingCampuses(false);
			}
		};

		getCampuses();
		return () => { isCancelled = true; };
	}, [state.isOpen]);

	useEffect(() => {
		if (!state.isOpen) return;

		let isCancelled = false;
		const getUsers = async () => {
			setIsLoadingUsers(true);
			try {
				const queryParams = new URLSearchParams({
					search: debouncedUserSearch,
					page: '1',
					rows: '10',
				});
				const response = await fetchData('GET', `User/paginate?${queryParams.toString()}`);
				if (!response.ok) {
					throw new Error('Failed to fetch users');
				}

				const payload: GetPaginatedResponseDto<PaginatedUser> = await response.json();
				if (isCancelled) return;
				setUsersResponse(payload);
			} catch {
				if (!isCancelled) {
					setUsersResponse(EMPTY_USERS);
					toast.error('Failed to load users. Please try again.');
				}
			} finally {
				if (!isCancelled) {
					setIsLoadingUsers(false);
				}
			}
		};

		getUsers();

		return () => {
			isCancelled = true;
		};
	}, [debouncedUserSearch, state.isOpen]);

	useEffect(() => {
		if (!state.isOpen) return;

		let isCancelled = false;
		const getCourses = async () => {
			setIsLoadingCourses(true);
			try {
				const response = await fetchData('GET', 'Course/all');
				if (!response.ok) throw new Error();
				const payload: Course[] = await response.json();
				if (isCancelled) return;
				setCourseOptions(
					payload.map((item) => ({
						id: item.id,
						label: item.courseCode
							? `${item.courseCode} - ${item.courseTitle ?? ''}`
							: (item.courseTitle ?? `Course ${item.id}`),
					})),
				);
			} catch {
				if (!isCancelled) toast.error('Failed to load courses. Please try again.');
			} finally {
				if (!isCancelled) setIsLoadingCourses(false);
			}
		};

		getCourses();
		return () => { isCancelled = true; };
	}, [state.isOpen]);

	useEffect(() => {
		if (!state.isOpen || !selectedCampusId) return;

		if (prevCampusIdRef.current !== selectedCampusId) {
			setValue('collegeId', 0);
			setValue('academicProgramId', 0);
			setValue('cycleId', 0);
		}
		prevCampusIdRef.current = selectedCampusId;

		let isCancelled = false;
		const getColleges = async () => {
			setIsLoadingColleges(true);
			try {
				const response = await fetchData('GET', `College/Campus/${selectedCampusId}`);
				if (!response.ok) throw new Error();
				const payload: CollegeDto[] = await response.json();
				if (isCancelled) return;
				setCollegeOptions(payload.map((item) => ({ id: item.id, label: item.collegeName })));
			} catch {
				if (!isCancelled) toast.error('Failed to load colleges. Please try again.');
			} finally {
				if (!isCancelled) setIsLoadingColleges(false);
			}
		};

		getColleges();
		return () => { isCancelled = true; };
	}, [selectedCampusId, setValue, state.isOpen]);

	useEffect(() => {
		if (!state.isOpen || !selectedCampusId) return;

		let isCancelled = false;
		const getCycles = async () => {
			setIsLoadingCycles(true);
			try {
				const response = await fetchData('GET', `Cycle/Campus/${selectedCampusId}`);
				if (!response.ok) throw new Error();
				const payload: CycleDto[] = await response.json();
				if (isCancelled) return;
				setCycleOptions(
					payload.map((item) => ({
						id: item.id,
						label: `${item.cycleDescription} (${item.schoolYear})`,
					})),
				);
			} catch {
				if (!isCancelled) toast.error('Failed to load cycles. Please try again.');
			} finally {
				if (!isCancelled) setIsLoadingCycles(false);
			}
		};

		getCycles();
		return () => { isCancelled = true; };
	}, [selectedCampusId, state.isOpen]);

	useEffect(() => {
		if (!state.isOpen || !selectedCollegeId) return;

		if (prevCollegeIdRef.current !== selectedCollegeId) {
			setValue('academicProgramId', 0);
		}
		prevCollegeIdRef.current = selectedCollegeId;

		let isCancelled = false;
		const getPrograms = async () => {
			setIsLoadingPrograms(true);
			try {
				const response = await fetchData('GET', `AcademicProgram/College/${selectedCollegeId}`);
				if (!response.ok) throw new Error();
				const payload: AcademicProgramDto[] = await response.json();
				if (isCancelled) return;
				setProgramOptions(payload.map((item) => ({ id: item.id, label: item.programName })));
			} catch {
				if (!isCancelled) toast.error('Failed to load programs. Please try again.');
			} finally {
				if (!isCancelled) setIsLoadingPrograms(false);
			}
		};

		getPrograms();
		return () => { isCancelled = true; };
	}, [selectedCollegeId, setValue, state.isOpen]);

	const handleClose = () => {
		reset(DEFAULT_FORM_VALUES);
		setIsCourseComboboxOpen(false);
		setCourseSearch('');
		state.closeFn();
	};

	const onSubmit = async (values: CreateEnrollmentValues) => {
		const campusCode = normalizeCampusCode(
			campusOptions.find((item) => item.id === values.campusId)?.shortName ?? '',
		);

		const payload = {
			userId: values.userId,
			sectionName: values.sectionName,
			academicProgramId: values.academicProgramId,
			cycleId: values.cycleId,
			courseId: values.courseId,
			yearLevel: values.yearLevel,
			termNumber: values.termNumber,
			enrollmentRoleId: values.enrollmentRoleId,
			campusCode,
		};

		try {
			const response = await fetchData('POST', 'EnrollmentBackdoor/create', {
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			if (!response.ok) throw new Error();

			const created: EnrollmentBackdoorDto = await response.json();
			onCreated(created);
			toast.success('Enrollment created successfully.');
			handleClose();
		} catch {
			toast.error('Failed to create enrollment. Please try again.');
		}
	};

	return (
		<Modal controller={state} title="Create Enrollment" size="lg">
			<form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>

				<div className="space-y-1">
					<Label htmlFor="create-user-id">User</Label>
					<Controller
						control={control}
						name="userId"
						render={({ field }) => (
							<Popover open={isUserComboboxOpen} onOpenChange={setIsUserComboboxOpen}>
								<PopoverTrigger asChild>
									<Button
										id="create-user-id"
										variant="outline"
										role="combobox"
										aria-expanded={isUserComboboxOpen}
										className="w-full justify-between font-normal"
										disabled={isSubmitting}
									>
										<span className="truncate text-left">
											{usersResponse.data.find((user) => user.id === field.value)?.fullName
												?? usersResponse.data.find((user) => user.id === field.value)?.userName
												?? usersResponse.data.find((user) => user.id === field.value)?.email
												?? (field.value || (isLoadingUsers ? 'Loading users...' : 'Select user'))}
										</span>
										<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
									<Command shouldFilter={false}>
										<CommandInput
											placeholder="Search by name or email..."
											value={userSearch}
											onValueChange={setUserSearch}
											disabled={isSubmitting || isLoadingUsers}
										/>
										<CommandList>
											<CommandEmpty>
												{isLoadingUsers ? 'Loading users...' : 'No users found.'}
											</CommandEmpty>
											<CommandGroup>
												{usersResponse.data.map((user) => (
													<CommandItem
														key={user.id}
														value={user.id}
														onSelect={() => {
															field.onChange(user.id);
															setIsUserComboboxOpen(false);
														}}
													>
														<Check
															className={cn(
																'mr-2 h-4 w-4',
																field.value === user.id ? 'opacity-100' : 'opacity-0',
															)}
														/>
														<span className="truncate">
															{user.fullName ?? user.userName ?? user.email ?? user.id}
														</span>
													</CommandItem>
												))}
											</CommandGroup>
										</CommandList>
									</Command>
								</PopoverContent>
							</Popover>
						)}
					/>
					{errors.userId && <p className="text-sm text-destructive">{errors.userId.message}</p>}
				</div>

				<div className="space-y-1">
					<Label htmlFor="create-campus">Campus</Label>
					<Controller
						control={control}
						name="campusId"
						render={({ field }) => (
							<Select
								value={field.value ? String(field.value) : ''}
								onValueChange={(value) => field.onChange(Number(value))}
								disabled={isSubmitting || isLoadingCampuses}
							>
								<SelectTrigger id="create-campus" className="w-full">
									<SelectValue placeholder={isLoadingCampuses ? 'Loading campuses...' : 'Select campus'} />
								</SelectTrigger>
								<SelectContent>
									{campusOptions.map((item) => (
										<SelectItem key={item.id} value={String(item.id)}>
											{item.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					/>
					{errors.campusId && <p className="text-sm text-destructive">{errors.campusId.message}</p>}
				</div>

				<div className="space-y-1">
					<Label htmlFor="create-college">College</Label>
					<Controller
						control={control}
						name="collegeId"
						render={({ field }) => (
							<Select
								value={field.value ? String(field.value) : ''}
								onValueChange={(value) => field.onChange(Number(value))}
								disabled={isSubmitting || !selectedCampusId || isLoadingColleges}
							>
								<SelectTrigger id="create-college" className="w-full">
									<SelectValue placeholder={isLoadingColleges ? 'Loading colleges...' : 'Select college'} />
								</SelectTrigger>
								<SelectContent>
									{displayedCollegeOptions.map((item) => (
										<SelectItem key={item.id} value={String(item.id)}>
											{item.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					/>
					{errors.collegeId && <p className="text-sm text-destructive">{errors.collegeId.message}</p>}
				</div>

				<div className="space-y-1">
					<Label htmlFor="create-program">Program</Label>
					<Controller
						control={control}
						name="academicProgramId"
						render={({ field }) => (
							<Select
								value={field.value ? String(field.value) : ''}
								onValueChange={(value) => field.onChange(Number(value))}
								disabled={isSubmitting || !selectedCollegeId || isLoadingPrograms}
							>
								<SelectTrigger id="create-program" className="w-full">
									<SelectValue placeholder={isLoadingPrograms ? 'Loading programs...' : 'Select program'} />
								</SelectTrigger>
								<SelectContent>
									{displayedProgramOptions.map((item) => (
										<SelectItem key={item.id} value={String(item.id)}>
											{item.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					/>
					{errors.academicProgramId && <p className="text-sm text-destructive">{errors.academicProgramId.message}</p>}
				</div>

				<div className="space-y-1">
					<Label htmlFor="create-cycle">Cycle</Label>
					<Controller
						control={control}
						name="cycleId"
						render={({ field }) => (
							<Select
								value={field.value ? String(field.value) : ''}
								onValueChange={(value) => field.onChange(Number(value))}
								disabled={isSubmitting || !selectedCampusId || isLoadingCycles}
							>
								<SelectTrigger id="create-cycle" className="w-full">
									<SelectValue placeholder={isLoadingCycles ? 'Loading cycles...' : 'Select cycle'} />
								</SelectTrigger>
								<SelectContent>
									{displayedCycleOptions.map((item) => (
										<SelectItem key={item.id} value={String(item.id)}>
											{item.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					/>
					{errors.cycleId && <p className="text-sm text-destructive">{errors.cycleId.message}</p>}
				</div>

				<div className="space-y-1">
					<Label htmlFor="create-course">Course</Label>
					<Controller
						control={control}
						name="courseId"
						render={({ field }) => (
							<Popover open={isCourseComboboxOpen} onOpenChange={setIsCourseComboboxOpen}>
								<PopoverTrigger asChild>
									<Button
										id="create-course"
										variant="outline"
										role="combobox"
										aria-expanded={isCourseComboboxOpen}
										className="w-full justify-between font-normal"
										disabled={isSubmitting || isLoadingCourses}
									>
										<span className="truncate text-left">
											{courseOptions.find((item) => item.id === Number(field.value))?.label
												?? (isLoadingCourses ? 'Loading courses...' : 'Select course')}
										</span>
										<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
									<Command shouldFilter={false}>
										<CommandInput
											placeholder="Search course..."
											value={courseSearch}
											onValueChange={setCourseSearch}
											disabled={isSubmitting || isLoadingCourses}
										/>
										<CommandList>
											<CommandEmpty>
												{isLoadingCourses ? 'Loading courses...' : 'No courses found.'}
											</CommandEmpty>
											<CommandGroup>
												{filteredCourseOptions.map((item) => (
													<CommandItem
														key={item.id}
														value={String(item.id)}
														onSelect={() => {
															field.onChange(item.id);
															setIsCourseComboboxOpen(false);
														}}
													>
														<Check
															className={cn(
																'mr-2 h-4 w-4',
																Number(field.value) === item.id ? 'opacity-100' : 'opacity-0',
															)}
														/>
														<span className="truncate">{item.label}</span>
													</CommandItem>
												))}
											</CommandGroup>
										</CommandList>
									</Command>
								</PopoverContent>
							</Popover>
						)}
					/>
					{errors.courseId && <p className="text-sm text-destructive">{errors.courseId.message}</p>}
				</div>

				<div className="space-y-1">
					<Label htmlFor="create-section-name">Section Name</Label>
					<Input id="create-section-name" className="w-full" {...register('sectionName')} disabled={isSubmitting} />
					{errors.sectionName && <p className="text-sm text-destructive">{errors.sectionName.message}</p>}
				</div>

				<div className="space-y-1">
					<Label htmlFor="create-year-level">Year Level</Label>
					<Input id="create-year-level" className="w-full" type="number" min={1} {...register('yearLevel')} disabled={isSubmitting} />
					{errors.yearLevel && <p className="text-sm text-destructive">{errors.yearLevel.message}</p>}
				</div>

				<div className="space-y-1">
					<Label htmlFor="create-term-number">Term Number</Label>
					<Input id="create-term-number" className="w-full" type="number" min={1} {...register('termNumber')} disabled={isSubmitting} />
					{errors.termNumber && <p className="text-sm text-destructive">{errors.termNumber.message}</p>}
				</div>

				<div className="space-y-1">
					<Label htmlFor="create-enrollment-role">Enrollment Role ID</Label>
					<Input id="create-enrollment-role" className="w-full" type="number" min={1} {...register('enrollmentRoleId')} disabled={isSubmitting} />
					{errors.enrollmentRoleId && <p className="text-sm text-destructive">{errors.enrollmentRoleId.message}</p>}
				</div>

				<div className="flex justify-end gap-2">
					<Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
						Cancel
					</Button>
					<Button type="submit" disabled={isSubmitting}>
						{isSubmitting ? 'Creating...' : 'Create Enrollment'}
					</Button>
				</div>
			</form>
		</Modal>
	);
}
