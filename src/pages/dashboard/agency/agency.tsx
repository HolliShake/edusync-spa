import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { MoreVertical, Pencil, Trash2, X, Plus } from 'lucide-react';

import PageLayout from '@/components/page.component';
import Modal, { useModal } from '@/components/modal.component';
import ConfirmModal from '@/components/confirm.component';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
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
import type { GetPaginatedResponseDto } from '@/types';
import { fetchData } from '@/lib/fetch';

type CampusFile = {
	id: number;
	scope: string;
	fileType: string;
	fileName: string;
	originalFileName: string;
	referenceId: string;
	uploadDate: string;
	scopePath: string;
};

type Campus = {
	id: number | string;
	campusName?: string;
	campusShortName?: string | null;
	address?: string | null;
	latitude?: number;
	longitude?: number;
	agencyId?: number;
	agency?: unknown;
	files?: CampusFile[];
};

type AgencyFile = {
	id: number;
	scope: string;
	fileType: string;
	fileName: string;
	originalFileName: string;
	referenceId: string;
	uploadDate: string;
	scopePath: string;
};

type AgencyRow = {
	id: number | string;
	agencyName?: string;
	shortName?: string;
	agencyAddress?: string;
	code?: string;
	files?: AgencyFile[];
	campuses?: Campus[];
	[key: string]: unknown;
};

const FILES_BASE = import.meta.env.VITE_APP_API_FILES;

const getAgencyLogoUrl = (files: AgencyFile[] | undefined): string | null => {
	if (!Array.isArray(files)) return null;
	const logoFile = files.find((file) => file.scope === 'Agency:Logo');
	if (!logoFile?.scopePath) return null;
	return `${FILES_BASE}/${logoFile.scopePath}`;
};

const getCampusImageUrl = (files: CampusFile[] | undefined): string | null => {
	if (!Array.isArray(files)) return null;
	const imageFile = files.find((file) => file.scope === 'Campus:Images');
	if (!imageFile?.scopePath) return null;
	return `${FILES_BASE}/${imageFile.scopePath}`;
};

const getAgencyInitials = (agencyName: string | undefined): string => {
	if (!agencyName) return '?';
	return agencyName
		.split(' ')
		.slice(0, 2)
		.map((word) => word[0])
		.join('')
		.toUpperCase();
};

const EMPTY_AGENCY_RESPONSE: GetPaginatedResponseDto<AgencyRow> = {
	data: [],
	paginationMeta: {
		page: 1,
		rows: 10,
		totalPages: 1,
		totalItems: 0,
	},
};

const AGENCY_PAGINATED_ENDPOINT = 'Agency/paginated';



const toNumber = (value: unknown, fallbackValue: number): number => {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}

	if (typeof value === 'string') {
		const parsedValue = Number(value);
		return Number.isFinite(parsedValue) ? parsedValue : fallbackValue;
	}

	return fallbackValue;
};

const normalizeAgencyResponse = (
	rawValue: unknown,
	fallbackPage: number,
	fallbackRows: number,
): GetPaginatedResponseDto<AgencyRow> => {
	if (!rawValue || typeof rawValue !== 'object') {
		return EMPTY_AGENCY_RESPONSE;
	}

	const rawObject = rawValue as Record<string, unknown>;
	const rawData = rawObject.data ?? rawObject.items ?? rawObject.results;
	const list = Array.isArray(rawData) ? (rawData as AgencyRow[]) : [];

	const rawMeta =
		(rawObject.paginationMeta as Record<string, unknown> | undefined) ??
		(rawObject.meta as Record<string, unknown> | undefined) ??
		{};

	const totalItems = toNumber(
		rawMeta.totalItems ?? rawMeta.totalCount ?? rawObject.totalItems ?? rawObject.totalCount,
		list.length,
	);

	const page = toNumber(rawMeta.page ?? rawObject.page, fallbackPage);
	const rows = toNumber(rawMeta.rows ?? rawMeta.pageSize ?? rawObject.rows, fallbackRows);
	const totalPages = Math.max(
		1,
		toNumber(rawMeta.totalPages ?? rawObject.totalPages, Math.ceil(totalItems / Math.max(rows, 1))),
	);

	return {
		data: list,
		paginationMeta: {
			page,
			rows,
			totalPages,
			totalItems,
		},
	};
};

export default function AgencyPage(): React.ReactNode {
	const [agencyResponse, setAgencyResponse] =
		useState<GetPaginatedResponseDto<AgencyRow>>(EMPTY_AGENCY_RESPONSE);
	const [isLoading, setIsLoading] = useState(false);
	const [page, setPage] = useState(1);
	const [rows, setRows] = useState(10);
	const [searchQuery, setSearchQuery] = useState('');
	const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
	const [refetchKey, setRefetchKey] = useState(0);
	const [isUpdating, setIsUpdating] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [editedAgencyName, setEditedAgencyName] = useState('');
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [fileInputKey, setFileInputKey] = useState(0);
	const [currentAgency, setCurrentAgency] = useState<AgencyRow | null>(null);
	const [campusFormData, setCampusFormData] = useState({ campusName: '', address: '' });
	const [campusFileInputKey, setCampusFileInputKey] = useState(0);
	const [selectedCampusFile, setSelectedCampusFile] = useState<File | null>(null);
	const [agencyFormData, setAgencyFormData] = useState({ agencyName: '', shortName: '', code: '', agencyAddress: '' });
	const [agencyFileInputKey, setAgencyFileInputKey] = useState(0);
	const [selectedAgencyFile, setSelectedAgencyFile] = useState<File | null>(null);
	const editAgencyModalState = useModal<AgencyRow>();
	const deleteAgencyModalState = useModal<AgencyRow>();
	const createAgencyModalState = useModal<void>();
	const createCampusModalState = useModal<AgencyRow>();
	const editCampusModalState = useModal<Campus>();
	const deleteCampusModalState = useModal<Campus>();

	const handleEditAgency = async () => {
		if (!editAgencyModalState.data) return;

		const nextAgencyName = editedAgencyName.trim();
		if (nextAgencyName.length <= 0) {
			toast.error('Agency name is required.');
			return;
		}

		setIsUpdating(true);
		try {
			const formData = new FormData();
			formData.append('AgencyName', nextAgencyName);
			formData.append('ShortName', String(editAgencyModalState.data.shortName ?? ''));
			formData.append('Code', String(editAgencyModalState.data.code ?? ''));
			formData.append('AgencyAddress', String(editAgencyModalState.data.agencyAddress ?? ''));
			formData.append('IsDefault', 'false');

			if (selectedFile) {
				formData.append('Files[0]', selectedFile);
			}

			const response = await fetchData('PUT', `Agency/update/${editAgencyModalState.data.id}`, {
				body: formData,
			});

			if (!response.ok) {
				throw new Error('Failed to update agency');
			}

			toast.success('Agency updated successfully.');
			editAgencyModalState.closeFn();
			setSelectedFile(null);
			setFileInputKey((prev) => prev + 1);
			setRefetchKey((previousValue) => previousValue + 1);
		} catch {
			toast.error('Failed to update agency. Please try again later.');
		} finally {
			setIsUpdating(false);
		}
	};

	const handleDeleteAgency = async (record: AgencyRow) => {
		setIsDeleting(true);
		try {
			const response = await fetchData('DELETE', `Agency/delete/${record.id}`);
			if (!response.ok) {
				throw new Error('Failed to delete agency');
			}

			toast.success('Agency deleted successfully.');
			deleteAgencyModalState.closeFn();
			setRefetchKey((previousValue) => previousValue + 1);
		} catch {
			toast.error('Failed to delete agency. Please try again later.');
		} finally {
			setIsDeleting(false);
		}
	};

	const handleCreateAgency = async () => {
		const agencyName = agencyFormData.agencyName.trim();
		if (agencyName.length <= 0) {
			toast.error('Agency name is required.');
			return;
		}

		setIsUpdating(true);
		try {
			const formData = new FormData();
			formData.append('AgencyName', agencyName);
			formData.append('ShortName', agencyFormData.shortName);
			formData.append('Code', agencyFormData.code);
			formData.append('AgencyAddress', agencyFormData.agencyAddress);
			formData.append('IsDefault', 'false');

			if (selectedAgencyFile) {
				formData.append('Files[0]', selectedAgencyFile);
			}

			const response = await fetchData('POST', 'Agency/create', {
				body: formData,
			});

			if (!response.ok) {
				throw new Error('Failed to create agency');
			}

			toast.success('Agency created successfully.');
			createAgencyModalState.closeFn();
			setAgencyFormData({ agencyName: '', shortName: '', code: '', agencyAddress: '' });
			setSelectedAgencyFile(null);
			setAgencyFileInputKey((prev) => prev + 1);
			setRefetchKey((previousValue) => previousValue + 1);
		} catch {
			toast.error('Failed to create agency. Please try again later.');
		} finally {
			setIsUpdating(false);
		}
	};

	const handleCreateCampus = async () => {
		if (!currentAgency) return;

		const campusName = campusFormData.campusName.trim();
		if (campusName.length <= 0) {
			toast.error('Campus name is required.');
			return;
		}

		setIsUpdating(true);
		try {
			const formData = new FormData();
			formData.append('CampusName', campusName);
			formData.append('Address', campusFormData.address);
			formData.append('AgencyId', String(currentAgency.id));

			if (selectedCampusFile) {
				formData.append('Files[0]', selectedCampusFile);
			}

			const response = await fetchData('POST', 'Campus/create', {
				body: formData,
			});

			if (!response.ok) {
				throw new Error('Failed to create campus');
			}

			toast.success('Campus created successfully.');
			createCampusModalState.closeFn();
			setCampusFormData({ campusName: '', address: '' });
			setSelectedCampusFile(null);
			setCampusFileInputKey((prev) => prev + 1);
			setRefetchKey((previousValue) => previousValue + 1);
		} catch {
			toast.error('Failed to create campus. Please try again later.');
		} finally {
			setIsUpdating(false);
		}
	};

	const handleEditCampus = async () => {
		if (!editCampusModalState.data) return;

		const campusName = campusFormData.campusName.trim();
		if (campusName.length <= 0) {
			toast.error('Campus name is required.');
			return;
		}

		setIsUpdating(true);
		try {
			const formData = new FormData();
			formData.append('CampusName', campusName);
			formData.append('Address', campusFormData.address);

			if (selectedCampusFile) {
				formData.append('Files[0]', selectedCampusFile);
			}

			const response = await fetchData('PUT', `Campus/update/${editCampusModalState.data.id}`, {
				body: formData,
			});

			if (!response.ok) {
				throw new Error('Failed to update campus');
			}

			toast.success('Campus updated successfully.');
			editCampusModalState.closeFn();
			setCampusFormData({ campusName: '', address: '' });
			setSelectedCampusFile(null);
			setCampusFileInputKey((prev) => prev + 1);
			setRefetchKey((previousValue) => previousValue + 1);
		} catch {
			toast.error('Failed to update campus. Please try again later.');
		} finally {
			setIsUpdating(false);
		}
	};

	const handleDeleteCampus = async (campus: Campus) => {
		setIsDeleting(true);
		try {
			const response = await fetchData('DELETE', `Campus/delete/${campus.id}`);
			if (!response.ok) {
				throw new Error('Failed to delete campus');
			}

			toast.success('Campus deleted successfully.');
			deleteCampusModalState.closeFn();
			setRefetchKey((previousValue) => previousValue + 1);
		} catch {
			toast.error('Failed to delete campus. Please try again later.');
		} finally {
			setIsDeleting(false);
		}
	};

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearchQuery(searchQuery.trim());
			setPage(1);
		}, 500);

		return () => clearTimeout(timer);
	}, [searchQuery]);

	useEffect(() => {
		const controller = new AbortController();

		const getAgencies = async () => {
			setIsLoading(true);
			try {
				const queryParams = new URLSearchParams({
					page: String(page),
					rows: String(rows),
				});

				if (debouncedSearchQuery.length > 0) {
					queryParams.set('search', debouncedSearchQuery);
				}

				const response = await fetchData('GET', `${AGENCY_PAGINATED_ENDPOINT}?${queryParams.toString()}`, {
					method: 'GET',
					signal: controller.signal,
				});

				if (!response.ok) {
					throw new Error('Failed to fetch agencies');
				}

				const responseBody: unknown = await response.json();
				const normalizedResponse = normalizeAgencyResponse(responseBody, page, rows);
				setAgencyResponse(normalizedResponse);
			} catch (error) {
				if (error instanceof Error && error.name === 'AbortError') {
					return;
				}

				setAgencyResponse(EMPTY_AGENCY_RESPONSE);
				toast.error('Failed to fetch agencies. Please try again later.');
			} finally {
				setIsLoading(false);
			}
		};

		getAgencies();

		return () => {
			controller.abort();
		};
	}, [page, rows, debouncedSearchQuery, refetchKey]);

	const pageDescription = useMemo(() => {
		return 'Browse agencies and their campuses from the remote CQI paginated API endpoint.';
	}, []);

	return (
		<PageLayout
			title="Agency"
			description={pageDescription}
			showBackButton={false}
		>
		<div className="flex gap-4 flex-wrap shrink-0">
			<div className="flex-1 min-w-64 space-y-2">
				<Label htmlFor="agency-search">Search</Label>
				<Input
					id="agency-search"
					placeholder="Search agencies..."
					value={searchQuery}
					onChange={(event) => setSearchQuery(event.target.value)}
					disabled={isLoading}
				/>
			</div>
			<div className="flex items-end">
				<Button
					type="button"
					className="h-9"
					onClick={() => {
						setAgencyFormData({ agencyName: '', shortName: '', code: '', agencyAddress: '' });
						setSelectedAgencyFile(null);
						setAgencyFileInputKey((prev) => prev + 1);
						createAgencyModalState.openFn();
					}}
				>
					<Plus className="h-4 w-4 mr-2" />
					Create Agency
				</Button>
			</div>
		</div>			<div className="flex flex-col min-w-0">
				<div className="flex items-center justify-between pb-2 mb-2">
					<p className="text-sm text-muted-foreground">
						Total: <span className="font-semibold text-foreground">{agencyResponse.paginationMeta.totalItems}</span> record(s) — Page{' '}
						<span className="font-semibold text-foreground">{agencyResponse.paginationMeta.page}</span> of{' '}
						<span className="font-semibold text-foreground">{agencyResponse.paginationMeta.totalPages}</span>
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

				{isLoading ? (
					<div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
						Loading agencies...
					</div>
				) : agencyResponse.data.length === 0 ? (
					<div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
						{searchQuery ? 'No records match your search.' : 'No agency records found.'}
					</div>
				) : (
					<Accordion type="multiple" className="w-full space-y-2">
						{agencyResponse.data.map((agency, index) => {
							const agencyName = agency.agencyName ?? `Agency ${agency.id}`;
							const logoUrl = getAgencyLogoUrl(agency.files);
							const initials = getAgencyInitials(agencyName);

							return (
								<AccordionItem key={`${agency.id}-${index}`} value={`agency-${agency.id}`} className="border rounded-lg">
									<AccordionTrigger className="px-4 py-3 hover:bg-accent">
										<div className="flex items-center gap-3 flex-1 text-left">
											<Avatar className="h-8 w-8 shrink-0">
												{logoUrl && <AvatarImage src={logoUrl} alt={agencyName} />}
												<AvatarFallback className="text-xs font-semibold">{initials}</AvatarFallback>
											</Avatar>
											<div className="flex-1">
												<p className="font-medium">{agencyName}</p>
												{agency.code && <p className="text-xs text-muted-foreground">{agency.code}</p>}
											</div>
										</div>
									</AccordionTrigger>

									<AccordionContent className="px-4 py-3 bg-muted/50">
										<div className="space-y-2">
										<div className="flex items-center justify-between mb-4">
											<div className="text-sm text-muted-foreground">
												{Array.isArray(agency.campuses) ? `${agency.campuses.length} campus/campuses` : 'No campuses'}
											</div>
											<div className="flex items-center gap-2">
												<Button
													type="button"
													size="sm"
													className="h-8"
													onClick={() => {
														setCurrentAgency(agency);
														setCampusFormData({ campusName: '', address: '' });
														setSelectedCampusFile(null);
														setCampusFileInputKey((prev) => prev + 1);
														createCampusModalState.openFn(agency);
													}}
												>
													<Plus className="h-4 w-4 mr-1" />
													Add Campus
												</Button>
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button variant="ghost" size="icon" className="h-8 w-8">
															<MoreVertical className="h-4 w-4" />
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end">
														<DropdownMenuItem
															className="cursor-pointer flex items-center gap-2"
															onClick={() => {
																setEditedAgencyName(String(agency.agencyName ?? ''));
																editAgencyModalState.openFn(agency);
															}}
														>
															<Pencil className="h-4 w-4" />
															<span>Edit Agency</span>
														</DropdownMenuItem>
														<DropdownMenuItem
															className="cursor-pointer flex items-center gap-2 text-destructive"
															onClick={() => deleteAgencyModalState.openFn(agency)}
														>
															<Trash2 className="h-4 w-4" />
															<span>Delete Agency</span>
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
											</div>
										</div>											{Array.isArray(agency.campuses) && agency.campuses.length > 0 ? (
												<div className="grid gap-2 mt-4">
													{agency.campuses.map((campus: Campus) => {
														const campusName = (campus.campusName as string) ?? `Campus ${campus.id}`;
														const campusImageUrl = getCampusImageUrl(campus.files);
														const campusInitials = getAgencyInitials(campusName);

														return (
															<div key={campus.id} className="flex items-center justify-between gap-3 p-3 bg-background rounded-md border">
																<div className="flex items-center gap-3 flex-1 min-w-0">
																	<Avatar className="h-8 w-8 shrink-0">
																		{campusImageUrl && <AvatarImage src={campusImageUrl} alt={campusName} />}
																		<AvatarFallback className="text-xs font-semibold">{campusInitials}</AvatarFallback>
																	</Avatar>
																	<div className="flex-1 min-w-0">
																		<p className="font-medium text-sm">{campusName}</p>
																		{campus.address && <p className="text-xs text-muted-foreground truncate">{campus.address}</p>}
																	</div>
																</div>
																<div className="flex items-center gap-1">
																	<Button
																		type="button"
																		variant="ghost"
																		size="icon"
																		className="h-8 w-8"
																		onClick={() => {
																			setCampusFormData({ campusName: String(campus.campusName ?? ''), address: String(campus.address ?? '') });
																			editCampusModalState.openFn(campus);
																		}}
																	>
																		<Pencil className="h-4 w-4" />
																	</Button>
																	<Button
																		type="button"
																		variant="ghost"
																		size="icon"
																		className="h-8 w-8 text-destructive"
																		onClick={() => deleteCampusModalState.openFn(campus)}
																	>
																		<Trash2 className="h-4 w-4" />
																	</Button>
																</div>
															</div>
														);
													})}
												</div>
											) : (
												<div className="text-sm text-muted-foreground py-2">No campuses found.</div>
											)}
										</div>
									</AccordionContent>
								</AccordionItem>
							);
						})}
					</Accordion>
				)}
			</div>

			<Modal controller={editAgencyModalState} title="Edit Agency" size="sm" closable={!isUpdating}>
				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="agency-name">Agency Name</Label>
						<Input
							id="agency-name"
							value={editedAgencyName}
							onChange={(event) => setEditedAgencyName(event.target.value)}
							disabled={isUpdating}
							placeholder="Enter agency name"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="agency-file">Agency Logo</Label>
						<div className="flex items-center gap-2">
							<Input
								id="agency-file"
								key={fileInputKey}
								type="file"
								accept="image/*"
								onChange={(event) => {
									const file = event.target.files?.[0];
									if (file) {
										setSelectedFile(file);
									}
								}}
								disabled={isUpdating}
								className="cursor-pointer"
							/>
							{selectedFile && (
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="h-9 w-9 shrink-0"
									onClick={() => {
										setSelectedFile(null);
										setFileInputKey((prev) => prev + 1);
									}}
									disabled={isUpdating}
								>
									<X className="h-4 w-4" />
								</Button>
							)}
						</div>
						{selectedFile && (
							<p className="text-xs text-muted-foreground">
								Selected: {selectedFile.name}
							</p>
						)}
					</div>

					<div className="flex justify-end gap-2">
						<Button type="button" variant="outline" onClick={editAgencyModalState.closeFn} disabled={isUpdating}>
							Cancel
						</Button>
						<Button type="button" onClick={handleEditAgency} disabled={isUpdating || editedAgencyName.trim().length <= 0}>
							{isUpdating ? 'Saving...' : 'Save'}
						</Button>
					</div>
				</div>
			</Modal>

			<ConfirmModal<AgencyRow>
				state={deleteAgencyModalState}
				title="Delete Agency"
				description={(data) => (
					<>
						Are you sure you want to delete{' '}
						<span className="font-semibold text-foreground">{String(data?.agencyName ?? `ID ${data?.id}`)}</span>?
					</>
				)}
				confirmLabel="Delete"
				isLoading={isDeleting}
				onConfirm={handleDeleteAgency}
			/>

			<Modal controller={createCampusModalState} title="Create Campus" size="sm" closable={!isUpdating}>
				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="campus-name">Campus Name</Label>
						<Input
							id="campus-name"
							value={campusFormData.campusName}
							onChange={(event) => setCampusFormData({ ...campusFormData, campusName: event.target.value })}
							disabled={isUpdating}
							placeholder="Enter campus name"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="campus-address">Address</Label>
						<Textarea
							id="campus-address"
							value={campusFormData.address}
							onChange={(event) => setCampusFormData({ ...campusFormData, address: event.target.value })}
							disabled={isUpdating}
							placeholder="Enter campus address"
							className="resize-none h-20"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="campus-file">Campus Image</Label>
						<div className="flex items-center gap-2">
							<Input
								id="campus-file"
								key={campusFileInputKey}
								type="file"
								accept="image/*"
								onChange={(event) => {
									const file = event.target.files?.[0];
									if (file) {
										setSelectedCampusFile(file);
									}
								}}
								disabled={isUpdating}
								className="cursor-pointer"
							/>
							{selectedCampusFile && (
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="h-9 w-9 shrink-0"
									onClick={() => {
										setSelectedCampusFile(null);
										setCampusFileInputKey((prev) => prev + 1);
									}}
									disabled={isUpdating}
								>
									<X className="h-4 w-4" />
								</Button>
							)}
						</div>
						{selectedCampusFile && (
							<p className="text-xs text-muted-foreground">
								Selected: {selectedCampusFile.name}
							</p>
						)}
					</div>

					<div className="flex justify-end gap-2">
						<Button type="button" variant="outline" onClick={createCampusModalState.closeFn} disabled={isUpdating}>
							Cancel
						</Button>
						<Button type="button" onClick={handleCreateCampus} disabled={isUpdating || campusFormData.campusName.trim().length <= 0}>
							{isUpdating ? 'Creating...' : 'Create'}
						</Button>
					</div>
				</div>
			</Modal>

			<Modal controller={editCampusModalState} title="Edit Campus" size="sm" closable={!isUpdating}>
				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="edit-campus-name">Campus Name</Label>
						<Input
							id="edit-campus-name"
							value={campusFormData.campusName}
							onChange={(event) => setCampusFormData({ ...campusFormData, campusName: event.target.value })}
							disabled={isUpdating}
							placeholder="Enter campus name"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="edit-campus-address">Address</Label>
						<Textarea
							id="edit-campus-address"
							value={campusFormData.address}
							onChange={(event) => setCampusFormData({ ...campusFormData, address: event.target.value })}
							disabled={isUpdating}
							placeholder="Enter campus address"
							className="resize-none h-20"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="edit-campus-file">Campus Image</Label>
						<div className="flex items-center gap-2">
							<Input
								id="edit-campus-file"
								key={campusFileInputKey}
								type="file"
								accept="image/*"
								onChange={(event) => {
									const file = event.target.files?.[0];
									if (file) {
										setSelectedCampusFile(file);
									}
								}}
								disabled={isUpdating}
								className="cursor-pointer"
							/>
							{selectedCampusFile && (
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="h-9 w-9 shrink-0"
									onClick={() => {
										setSelectedCampusFile(null);
										setCampusFileInputKey((prev) => prev + 1);
									}}
									disabled={isUpdating}
								>
									<X className="h-4 w-4" />
								</Button>
							)}
						</div>
						{selectedCampusFile && (
							<p className="text-xs text-muted-foreground">
								Selected: {selectedCampusFile.name}
							</p>
						)}
					</div>

					<div className="flex justify-end gap-2">
						<Button type="button" variant="outline" onClick={editCampusModalState.closeFn} disabled={isUpdating}>
							Cancel
						</Button>
						<Button type="button" onClick={handleEditCampus} disabled={isUpdating || campusFormData.campusName.trim().length <= 0}>
							{isUpdating ? 'Saving...' : 'Save'}
						</Button>
					</div>
				</div>
			</Modal>

			<ConfirmModal<Campus>
				state={deleteCampusModalState}
				title="Delete Campus"
				description={(data) => (
					<>
						Are you sure you want to delete{' '}
						<span className="font-semibold text-foreground">{String(data?.campusName ?? `ID ${data?.id}`)}</span>?
					</>
				)}
			confirmLabel="Delete"
			isLoading={isDeleting}
			onConfirm={handleDeleteCampus}
		/>

		<Modal controller={createAgencyModalState} title="Create Agency" size="sm" closable={!isUpdating}>
			<div className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="new-agency-name">Agency Name</Label>
					<Input
						id="new-agency-name"
						value={agencyFormData.agencyName}
						onChange={(event) => setAgencyFormData({ ...agencyFormData, agencyName: event.target.value })}
						disabled={isUpdating}
						placeholder="Enter agency name"
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="new-agency-shortname">Short Name</Label>
					<Input
						id="new-agency-shortname"
						value={agencyFormData.shortName}
						onChange={(event) => setAgencyFormData({ ...agencyFormData, shortName: event.target.value })}
						disabled={isUpdating}
						placeholder="Enter short name"
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="new-agency-code">Code</Label>
					<Input
						id="new-agency-code"
						value={agencyFormData.code}
						onChange={(event) => setAgencyFormData({ ...agencyFormData, code: event.target.value })}
						disabled={isUpdating}
						placeholder="Enter agency code"
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="new-agency-address">Address</Label>
					<Textarea
						id="new-agency-address"
						value={agencyFormData.agencyAddress}
						onChange={(event) => setAgencyFormData({ ...agencyFormData, agencyAddress: event.target.value })}
						disabled={isUpdating}
						placeholder="Enter agency address"
						className="resize-none h-20"
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="new-agency-file">Agency Logo</Label>
					<div className="flex items-center gap-2">
						<Input
							id="new-agency-file"
							key={agencyFileInputKey}
							type="file"
							accept="image/*"
							onChange={(event) => {
								const file = event.target.files?.[0];
								if (file) {
									setSelectedAgencyFile(file);
								}
							}}
							disabled={isUpdating}
							className="cursor-pointer"
						/>
						{selectedAgencyFile && (
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="h-9 w-9 shrink-0"
								onClick={() => {
									setSelectedAgencyFile(null);
									setAgencyFileInputKey((prev) => prev + 1);
								}}
								disabled={isUpdating}
							>
								<X className="h-4 w-4" />
							</Button>
						)}
					</div>
					{selectedAgencyFile && (
						<p className="text-xs text-muted-foreground">
							Selected: {selectedAgencyFile.name}
						</p>
					)}
				</div>

				<div className="flex justify-end gap-2">
					<Button type="button" variant="outline" onClick={createAgencyModalState.closeFn} disabled={isUpdating}>
						Cancel
					</Button>
					<Button type="button" onClick={handleCreateAgency} disabled={isUpdating || agencyFormData.agencyName.trim().length <= 0}>
						{isUpdating ? 'Creating...' : 'Create'}
					</Button>
				</div>
			</div>
		</Modal>
	</PageLayout>
	);
}