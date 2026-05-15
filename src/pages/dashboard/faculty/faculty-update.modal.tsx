import Modal, { type ModalState } from '@/components/modal.component';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { fetchData } from '@/lib/fetch';
import type { AcademicProgramDto, CampusDto, CollegeDto, Course, CycleDto, EnrollmentBackdoorDto } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const updateEnrollmentSchema = z.object({
	sectionName: z.string().trim().min(1, 'Section name is required'),
	campusId: z.coerce.number().int().positive('Campus is required'),
	collegeId: z.coerce.number().int().positive('College is required'),
	academicProgramId: z.coerce.number().int().positive('Program is required'),
	cycleId: z.coerce.number().int().positive('Cycle is required'),
	courseId: z.coerce.number().int().positive('Course is required'),
	yearLevel: z.coerce.number().int().min(0, 'Year level is required'),
	termNumber: z.coerce.number().int().min(1, 'Term is required'),
	enrollmentRoleId: z.coerce.number().int().positive('Enrollment role is required'),
});

type UpdateEnrollmentValues = z.infer<typeof updateEnrollmentSchema>;
type UpdateEnrollmentInputValues = z.input<typeof updateEnrollmentSchema>;

const DEFAULT_FORM_VALUES: UpdateEnrollmentInputValues = {
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

type FacultyUpdateModalProps = {
	state: ModalState<EnrollmentBackdoorDto>;
	onUpdated: (updated: EnrollmentBackdoorDto) => void;
};

export default function FacultyUpdateModal({ state, onUpdated }: FacultyUpdateModalProps): ReactNode {
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

	const {
		control,
		register,
		handleSubmit,
		reset,
		setValue,
		formState: { errors, isSubmitting },
	} = useForm<UpdateEnrollmentInputValues, unknown, UpdateEnrollmentValues>({
		resolver: zodResolver(updateEnrollmentSchema),
		defaultValues: DEFAULT_FORM_VALUES,
	});

	const watchedCampusId = useWatch({ control, name: 'campusId' });
	const watchedCollegeId = useWatch({ control, name: 'collegeId' });
	const prevCampusIdRef = useRef<number>(0);
	const prevCollegeIdRef = useRef<number>(0);

	const selectedCampusId = useMemo(() => {
		const numericValue = Number(watchedCampusId);
		return Number.isFinite(numericValue) ? numericValue : 0;
	}, [watchedCampusId]);

	const selectedCollegeId = useMemo(() => {
		const numericValue = Number(watchedCollegeId);
		return Number.isFinite(numericValue) ? numericValue : 0;
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

	const displayedCourseOptions = useMemo(() => courseOptions, [courseOptions]);

	const normalizeCampusCode = (campusShortName: string) =>
		campusShortName.replaceAll(' ', '').replaceAll('-', '').replaceAll('_', '').toLowerCase();

	useEffect(() => {
		if (!state.isOpen) {
			reset(DEFAULT_FORM_VALUES);
			return;
		}

		if (!state.data) return;

		const initialCampusId = Number(state.data.cycle?.campusId ?? state.data.academicProgram?.college?.campusId ?? 0);
		const initialCollegeId = Number(state.data.academicProgram?.collegeId ?? 0);
		const initialProgramId = Number(state.data.academicProgramId ?? 0);
		const initialCycleId = Number(state.data.cycleId ?? 0);
		const initialCourseId = Number(state.data.courseId ?? 0);

		prevCampusIdRef.current = initialCampusId;
		prevCollegeIdRef.current = initialCollegeId;

		reset({
			sectionName: state.data.sectionName ?? '',
			campusId: initialCampusId,
			collegeId: initialCollegeId,
			academicProgramId: initialProgramId,
			cycleId: initialCycleId,
			courseId: initialCourseId,
			yearLevel: Number(state.data.yearLevel ?? 1),
			termNumber: Number(state.data.termNumber ?? 1),
			enrollmentRoleId: Number(state.data.enrollmentRoleId ?? 1),
		});
	}, [reset, state.data, state.isOpen]);

	useEffect(() => {
		if (!state.isOpen) return;

		let isCancelled = false;
		const getCampuses = async () => {
			setIsLoadingCampuses(true);
			try {
				const response = await fetchData('GET', 'Campus/all');
				if (!response.ok) {
					throw new Error('Failed to fetch campuses');
				}

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
				if (!isCancelled) {
					toast.error('Failed to load campuses. Please try again.');
				}
			} finally {
				if (!isCancelled) {
					setIsLoadingCampuses(false);
				}
			}
		};

		getCampuses();

		return () => {
			isCancelled = true;
		};
	}, [state.isOpen]);

	useEffect(() => {
		if (!state.isOpen || !selectedCampusId) {
			return;
		}

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
				if (!response.ok) {
					throw new Error('Failed to fetch colleges');
				}

				const payload: CollegeDto[] = await response.json();
				if (isCancelled) return;

				setCollegeOptions(
					payload.map((item) => ({
						id: item.id,
						label: item.collegeName,
					})),
				);
			} catch {
				if (!isCancelled) {
					toast.error('Failed to load colleges. Please try again.');
				}
			} finally {
				if (!isCancelled) {
					setIsLoadingColleges(false);
				}
			}
		};

		getColleges();

		return () => {
			isCancelled = true;
		};
	}, [selectedCampusId, setValue, state.isOpen]);

	useEffect(() => {
		if (!state.isOpen || !selectedCampusId) {
			return;
		}

		let isCancelled = false;
		const getCycles = async () => {
			setIsLoadingCycles(true);
			try {
				const response = await fetchData('GET', `Cycle/Campus/${selectedCampusId}`);
				if (!response.ok) {
					throw new Error('Failed to fetch cycles');
				}

				const payload: CycleDto[] = await response.json();
				if (isCancelled) return;

				setCycleOptions(
					payload.map((item) => ({
						id: item.id,
						label: `${item.cycleDescription} (${item.schoolYear})`,
					})),
				);
			} catch {
				if (!isCancelled) {
					toast.error('Failed to load cycles. Please try again.');
				}
			} finally {
				if (!isCancelled) {
					setIsLoadingCycles(false);
				}
			}
		};

		getCycles();

		return () => {
			isCancelled = true;
		};
	}, [selectedCampusId, state.isOpen]);

	useEffect(() => {
		if (!state.isOpen || !selectedCollegeId) {
			return;
		}

		if (prevCollegeIdRef.current !== selectedCollegeId) {
			setValue('academicProgramId', 0);
		}

		prevCollegeIdRef.current = selectedCollegeId;

		let isCancelled = false;
		const getPrograms = async () => {
			setIsLoadingPrograms(true);
			try {
				const response = await fetchData('GET', `AcademicProgram/College/${selectedCollegeId}`);
				if (!response.ok) {
					throw new Error('Failed to fetch academic programs');
				}

				const payload: AcademicProgramDto[] = await response.json();
				if (isCancelled) return;

				setProgramOptions(
					payload.map((item) => ({
						id: item.id,
						label: item.programName,
					})),
				);
			} catch {
				if (!isCancelled) {
					toast.error('Failed to load programs. Please try again.');
				}
			} finally {
				if (!isCancelled) {
					setIsLoadingPrograms(false);
				}
			}
		};

		getPrograms();

		return () => {
			isCancelled = true;
		};
	}, [selectedCollegeId, setValue, state.isOpen]);

	useEffect(() => {
		if (!state.isOpen) {
			return;
		}

		let isCancelled = false;
		const getCourses = async () => {
			setIsLoadingCourses(true);
			try {
				const response = await fetchData('GET', `Course/all`);
				if (!response.ok) {
					throw new Error('Failed to fetch courses');
				}

				const payload: Course[] = await response.json();
				if (isCancelled) return;

				setCourseOptions(
					payload.map((item) => ({
						id: item.id,
						label: item.courseCode ? `${item.courseCode} - ${item.courseTitle ?? ''}` : (item.courseTitle ?? `Course ${item.id}`),
					})),
				);
			} catch {
				if (!isCancelled) {
					toast.error('Failed to load courses. Please try again.');
				}
			} finally {
				if (!isCancelled) {
					setIsLoadingCourses(false);
				}
			}
		};

		getCourses();

		return () => {
			isCancelled = true;
		};
	}, [state.isOpen]);

	const handleClose = () => {
		reset(DEFAULT_FORM_VALUES);
		state.closeFn();
	};

	const onSubmit = async (values: UpdateEnrollmentValues) => {
		const record = state.data;
		if (!record?.id) {
			toast.error('No enrollment selected for update.');
			return;
		}

		const payload: EnrollmentBackdoorDto = {
			...record,
			sectionName: values.sectionName,
			academicProgramId: values.academicProgramId,
			cycleId: values.cycleId,
			courseId: values.courseId,
			yearLevel: values.yearLevel,
			termNumber: values.termNumber,
			enrollmentRoleId: values.enrollmentRoleId,
			campusCode: normalizeCampusCode(campusOptions.find((item) => item.id === values.campusId)?.shortName ?? record.campusCode),
		};

		try {
			const response = await fetchData('PUT', `EnrollmentBackdoor/update/${record.id}`, {
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				throw new Error('Failed to update enrollment');
			}

			let updatedRecord: EnrollmentBackdoorDto = {
				...payload,
				academicProgram: values.academicProgramId === record.academicProgramId ? record.academicProgram : undefined,
				cycle: values.cycleId === record.cycleId ? record.cycle : undefined,
				course: values.courseId === record.courseId ? record.course : undefined,
			};
			try {
				const contentType = response.headers.get('content-type') ?? '';
				if (contentType.includes('application/json')) {
					const responseBody = await response.json();
					if (responseBody && typeof responseBody === 'object') {
					updatedRecord = responseBody as EnrollmentBackdoorDto;
					}
				}
			} catch {
				updatedRecord = payload;
			}

			onUpdated(updatedRecord);
			toast.success('Enrollment updated successfully.');
			handleClose();
		} catch {
			toast.error('Failed to update enrollment. Please try again.');
		}
	};

	return (
		<Modal controller={state} title="Edit Enrollment" size="lg">
			<form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
				<div className="space-y-4">
					<div className="space-y-1">
						<Label htmlFor="edit-campus">Campus</Label>
						<Controller
							control={control}
							name="campusId"
							render={({ field }) => (
								<Select
									value={field.value ? String(field.value) : ''}
									onValueChange={(value) => field.onChange(Number(value))}
									disabled={isSubmitting || isLoadingCampuses}
								>
									<SelectTrigger id="edit-campus" className="w-full">
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
						<Label htmlFor="edit-college">College</Label>
						<Controller
							control={control}
							name="collegeId"
							render={({ field }) => (
								<Select
									value={field.value ? String(field.value) : ''}
									onValueChange={(value) => field.onChange(Number(value))}
									disabled={isSubmitting || !selectedCampusId || isLoadingColleges}
								>
									<SelectTrigger id="edit-college" className="w-full">
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
						<Label htmlFor="edit-program">Program</Label>
						<Controller
							control={control}
							name="academicProgramId"
							render={({ field }) => (
								<Select
									value={field.value ? String(field.value) : ''}
									onValueChange={(value) => field.onChange(Number(value))}
									disabled={isSubmitting || !selectedCollegeId || isLoadingPrograms}
								>
									<SelectTrigger id="edit-program" className="w-full">
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
				</div>

				<div className="space-y-4">
					<div className="space-y-1">
						<Label htmlFor="edit-cycle">Cycle</Label>
						<Controller
							control={control}
							name="cycleId"
							render={({ field }) => (
								<Select
									value={field.value ? String(field.value) : ''}
									onValueChange={(value) => field.onChange(Number(value))}
									disabled={isSubmitting || !selectedCampusId || isLoadingCycles}
								>
									<SelectTrigger id="edit-cycle" className="w-full">
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
						<Label htmlFor="edit-course">Course</Label>
						<Controller
							control={control}
							name="courseId"
							render={({ field }) => (
								<Select
									value={field.value ? String(field.value) : ''}
									onValueChange={(value) => field.onChange(Number(value))}
									disabled={isSubmitting || isLoadingCourses}
								>
									<SelectTrigger id="edit-course" className="w-full">
										<SelectValue placeholder={isLoadingCourses ? 'Loading courses...' : 'Select course'} />
									</SelectTrigger>
									<SelectContent>
										{displayedCourseOptions.map((item) => (
											<SelectItem key={item.id} value={String(item.id)}>
												{item.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						/>
						{errors.courseId && <p className="text-sm text-destructive">{errors.courseId.message}</p>}
					</div>
				</div>

				<div className="space-y-1">
					<Label htmlFor="edit-section-name">Section Name</Label>
					<Input id="edit-section-name" className="w-full" {...register('sectionName')} disabled={isSubmitting} />
					{errors.sectionName && <p className="text-sm text-destructive">{errors.sectionName.message}</p>}
				</div>

				<div className="space-y-4">
					<div className="space-y-1">
						<Label htmlFor="edit-year-level">Year Level</Label>
						<Input id="edit-year-level" className="w-full" type="number" min={0} {...register('yearLevel')} disabled={isSubmitting} />
						{errors.yearLevel && <p className="text-sm text-destructive">{errors.yearLevel.message}</p>}
					</div>

					<div className="space-y-1">
						<Label htmlFor="edit-term-number">Term Number</Label>
						<Input id="edit-term-number" className="w-full" type="number" min={1} {...register('termNumber')} disabled={isSubmitting} />
						{errors.termNumber && <p className="text-sm text-destructive">{errors.termNumber.message}</p>}
					</div>

					<div className="space-y-1">
						<Label htmlFor="edit-enrollment-role">Enrollment Role ID</Label>
						<Input id="edit-enrollment-role" className="w-full" type="number" min={1} {...register('enrollmentRoleId')} disabled={isSubmitting} />
						{errors.enrollmentRoleId && <p className="text-sm text-destructive">{errors.enrollmentRoleId.message}</p>}
					</div>
				</div>

				<div className="flex justify-end gap-2">
					<Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
						Cancel
					</Button>
					<Button type="submit" disabled={isSubmitting}>
						{isSubmitting ? 'Saving...' : 'Save Changes'}
					</Button>
				</div>
			</form>
		</Modal>
	);
}
