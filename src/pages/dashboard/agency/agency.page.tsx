import { MoreVertical, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import ConfirmModal from '@/components/confirm.component';
import Modal, { useModal } from '@/components/modal.component';
import PageLayout from '@/components/page.component';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { apiGetError } from '@/lib/error';
import { getEdusyncERPAPI } from '@/lib/orval/endpoints';
import type {
  GetAgencyDto,
  GetCampusDto,
  GetPaginatedResponseDtoOfGetAgencyDto,
} from '@/lib/orval/model';

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

const FILES_BASE = (
  (import.meta.env.VITE_APP_API_URL as string) ?? 'http://localhost:8080/Api'
).replace(/\/Api$/, '/files');

const getAgencyLogoUrl = (files: AgencyFile[] | undefined): string | null => {
  if (!Array.isArray(files)) return null;
  const logoFile = files.find((file) => file.scope === 'Agency:Logo');
  if (!logoFile?.scopePath) return null;
  return `${FILES_BASE}/${logoFile.scopePath}`;
};

const getCampusImageUrl = (files: CampusFile[] | undefined): string | null => {
  if (!Array.isArray(files)) return null;
  const imageFile = files.find((file) => file.scope === 'GetCampusDto:Images');
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

const EMPTY_AGENCY_RESPONSE: GetPaginatedResponseDtoOfGetAgencyDto = {
  data: [],
  paginationMeta: {
    page: 1,
    rows: 10,
    totalPages: 1,
    totalItems: 0,
  },
};

const api = getEdusyncERPAPI();

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
  fallbackRows: number
): GetPaginatedResponseDtoOfGetAgencyDto => {
  if (!rawValue || typeof rawValue !== 'object') {
    return EMPTY_AGENCY_RESPONSE;
  }

  const rawObject = rawValue as Record<string, unknown>;
  const rawData = rawObject.data ?? rawObject.items ?? rawObject.results;
  const list = Array.isArray(rawData) ? (rawData as GetAgencyDto[]) : [];

  const rawMeta =
    (rawObject.paginationMeta as Record<string, unknown> | undefined) ??
    (rawObject.meta as Record<string, unknown> | undefined) ??
    {};

  const totalItems = toNumber(
    rawMeta.totalItems ?? rawMeta.totalCount ?? rawObject.totalItems ?? rawObject.totalCount,
    list.length
  );

  const page = toNumber(rawMeta.page ?? rawObject.page, fallbackPage);
  const rows = toNumber(rawMeta.rows ?? rawMeta.pageSize ?? rawObject.rows, fallbackRows);
  const totalPages = Math.max(
    1,
    toNumber(rawMeta.totalPages ?? rawObject.totalPages, Math.ceil(totalItems / Math.max(rows, 1)))
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
  const navigate = useNavigate();
  const [agencyResponse, setAgencyResponse] =
    useState<GetPaginatedResponseDtoOfGetAgencyDto>(EMPTY_AGENCY_RESPONSE);
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
  const [currentAgency, setCurrentAgency] = useState<GetAgencyDto | null>(null);
  const [campusFormData, setCampusFormData] = useState({
    campusName: '',
    campusShortName: '',
    address: '',
    latitude: '',
    longitude: '',
  });
  const [agencyFormData, setAgencyFormData] = useState({
    agencyName: '',
    shortName: '',
    code: '',
    agencyAddress: '',
  });
  const [agencyFileInputKey, setAgencyFileInputKey] = useState(0);
  const [selectedAgencyFile, setSelectedAgencyFile] = useState<File | null>(null);
  const editAgencyModalState = useModal<GetAgencyDto>();
  const deleteAgencyModalState = useModal<GetAgencyDto>();
  const createAgencyModalState = useModal<void>();
  const createCampusModalState = useModal<GetAgencyDto>();
  const editCampusModalState = useModal<GetCampusDto>();
  const deleteCampusModalState = useModal<GetCampusDto>();

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
      formData.append('AgencyAddress', String(editAgencyModalState.data.address ?? ''));
      formData.append('IsDefault', 'false');

      if (selectedFile) {
        formData.append('Files[0]', selectedFile);
      }

      await api.updateAgency(Number(editAgencyModalState.data.id), formData as never);

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

  const handleDeleteAgency = async (record: GetAgencyDto) => {
    setIsDeleting(true);
    try {
      await api.deleteAgency(Number(record.id));
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

      await api.createAgency(formData as never);

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

  const handleCampusClick = (agency: GetAgencyDto, campus: GetCampusDto) => {
    navigate(
      `/agency/${encodeURIComponent(agency.shortName)}/${encodeURIComponent(campus.campusShortName)}/${encodeURIComponent(campus.id)}`
    );
  };

  const handleCreateCampus = async () => {
    if (!currentAgency) return;

    const campusName = campusFormData.campusName.trim();
    const campusShortName = campusFormData.campusShortName.trim();
    const address = campusFormData.address.trim();
    const latitude = Number(campusFormData.latitude);
    const longitude = Number(campusFormData.longitude);

    if (!campusName || !campusShortName || !address || isNaN(latitude) || isNaN(longitude)) {
      toast.error('All campus fields are required.');
      return;
    }

    setIsUpdating(true);
    try {
      const payload = {
        campusName,
        campusShortName,
        address,
        latitude,
        longitude,
        agencyId: Number(currentAgency.id),
      };
      await api.createCampus(payload);

      toast.success('GetCampusDto created successfully.');
      createCampusModalState.closeFn();
      setCampusFormData({
        campusName: '',
        campusShortName: '',
        address: '',
        latitude: '',
        longitude: '',
      });
      // Reset to first page and refetch so the agency with the new campus is visible
      setPage(1);
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
    const campusShortName = campusFormData.campusShortName.trim();
    const address = campusFormData.address.trim();
    const latitude = Number(campusFormData.latitude);
    const longitude = Number(campusFormData.longitude);

    if (!campusName || !campusShortName || !address || isNaN(latitude) || isNaN(longitude)) {
      toast.error('All campus fields are required.');
      return;
    }

    setIsUpdating(true);
    try {
      const payload = {
        campusName,
        campusShortName,
        address,
        latitude,
        longitude,
        agencyId: Number(editCampusModalState.data.agencyId ?? currentAgency?.id ?? 0),
      };
      await api.updateCampus(Number(editCampusModalState.data.id), payload);

      toast.success('GetCampusDto updated successfully.');
      editCampusModalState.closeFn();
      setCampusFormData({
        campusName: '',
        campusShortName: '',
        address: '',
        latitude: '',
        longitude: '',
      });
      setRefetchKey((previousValue) => previousValue + 1);
    } catch {
      toast.error('Failed to update campus. Please try again later.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteCampus = async (campus: GetCampusDto) => {
    setIsDeleting(true);
    try {
      await api.deleteCampus(Number(campus.id));
      toast.success('GetCampusDto deleted successfully.');
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
        const params: Record<string, string | number | boolean> = {
          Page: page,
          Rows: rows,
          Fresh: refetchKey != 0, // Use refetchKey to trigger cache bypass in the API client
        };
        if (debouncedSearchQuery.length > 0) {
          params.Filter = `agencyName[contains]=${debouncedSearchQuery}`;
        }
        const response = await api.getPaginatedAgency(params);
        const normalizedResponse = normalizeAgencyResponse(response, page, rows);
        setAgencyResponse(normalizedResponse);
      } catch (error) {
        setAgencyResponse(EMPTY_AGENCY_RESPONSE);
        toast.error(apiGetError(error, 'Failed to fetch agencies. Please try again later.'));
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
    <PageLayout title="Agency" description={pageDescription} showBackButton={false}>
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
      </div>

      <div className="flex flex-col min-w-0 overflow-y-auto">
        <div className="flex items-center justify-between pb-2 mb-2">
          <p className="text-sm text-muted-foreground">
            Total:{' '}
            <span className="font-semibold text-foreground">
              {agencyResponse.paginationMeta.totalItems}
            </span>{' '}
            record(s) — Page{' '}
            <span className="font-semibold text-foreground">
              {agencyResponse.paginationMeta.page}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-foreground">
              {agencyResponse.paginationMeta.totalPages}
            </span>
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
          <Accordion type="multiple" className="w-full space-y-2 pb-4">
            {agencyResponse.data.map((agency) => {
              const agencyName = agency.agencyName ?? `Agency ${agency.id}`;
              const logoUrl = getAgencyLogoUrl([]);
              const initials = getAgencyInitials(agencyName);

              return (
                <AccordionItem
                  key={agency.id}
                  value={`agency-${agency.id}`}
                  className="border rounded-lg"
                >
                  <AccordionTrigger className="px-4 py-3 hover:bg-accent hover:no-underline rounded-t-lg">
                    <div className="flex items-center gap-3 flex-1 text-left">
                      <Avatar className="h-8 w-8 shrink-0">
                        {logoUrl && <AvatarImage src={logoUrl} alt={agencyName} />}
                        <AvatarFallback className="text-xs font-semibold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{agencyName}</p>
                        {agency.code && (
                          <p className="text-xs text-muted-foreground">{agency.code}</p>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="px-4 py-3 bg-muted/50">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-sm text-muted-foreground">
                          {Array.isArray(agency.campuses)
                            ? `${agency.campuses.length} campus/campuses`
                            : 'No campuses'}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            className="h-8"
                            onClick={() => {
                              setCurrentAgency(agency);
                              setCampusFormData({
                                campusName: '',
                                campusShortName: '',
                                address: '',
                                latitude: '',
                                longitude: '',
                              });
                              createCampusModalState.openFn(agency);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Campus
                          </Button>

                          {/* FIX 1: DropdownMenuContent now contains proper DropdownMenuItems */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditedAgencyName(String(agency.agencyName ?? ''));
                                  editAgencyModalState.openFn(agency);
                                }}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => deleteAgencyModalState.openFn(agency)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* FIX 2: GetCampusDto list now has proper .map() with local variable declarations */}
                      {Array.isArray(agency.campuses) && agency.campuses.length > 0 ? (
                        <div className="space-y-2">
                          {agency.campuses.map((campus) => {
                            const campusName = campus.campusName ?? `GetCampusDto ${campus.id}`;
                            const campusImageUrl = getCampusImageUrl([]);
                            const campusInitials = campusName
                              .split(' ')
                              .slice(0, 2)
                              .map((word) => word[0])
                              .join('')
                              .toUpperCase();

                            return (
                              <div
                                key={campus.id}
                                className="flex items-center justify-between gap-3 p-3 bg-background rounded-md border"
                              >
                                <div
                                  className="flex items-center gap-3 flex-1 min-w-0 hover:cursor-pointer"
                                  onClick={() => handleCampusClick(agency, campus)}
                                >
                                  <Avatar className="h-8 w-8 shrink-0">
                                    {campusImageUrl && (
                                      <AvatarImage src={campusImageUrl} alt={campusName} />
                                    )}
                                    <AvatarFallback className="text-xs font-semibold">
                                      {campusInitials}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium text-sm mb-0!">{campusName}</p>
                                    {campus.address && (
                                      <p className="text-xs text-muted-foreground truncate">
                                        {campus.address}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => {
                                      setCampusFormData({
                                        campusName: String(campus.campusName ?? ''),
                                        campusShortName: String(campus.campusShortName ?? ''),
                                        address: String(campus.address ?? ''),
                                        latitude: String(campus.latitude ?? ''),
                                        longitude: String(campus.longitude ?? ''),
                                      });
                                      setCurrentAgency(agency);
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
              <p className="text-xs text-muted-foreground">Selected: {selectedFile.name}</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={editAgencyModalState.closeFn}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleEditAgency}
              disabled={isUpdating || editedAgencyName.trim().length <= 0}
            >
              {isUpdating ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal<GetAgencyDto>
        state={deleteAgencyModalState}
        title="Delete Agency"
        description={(data) => (
          <>
            Are you sure you want to delete{' '}
            <span className="font-semibold text-foreground">
              {String(data?.agencyName ?? `ID ${data?.id}`)}
            </span>
            ?
          </>
        )}
        confirmLabel="Delete"
        isLoading={isDeleting}
        onConfirm={handleDeleteAgency}
      />

      <Modal
        controller={createCampusModalState}
        title="Create GetCampusDto"
        size="sm"
        closable={!isUpdating}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="campus-name">GetCampusDto Name</Label>
            <Input
              id="campus-name"
              value={campusFormData.campusName}
              onChange={(event) =>
                setCampusFormData({ ...campusFormData, campusName: event.target.value })
              }
              disabled={isUpdating}
              placeholder="Enter campus name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="campus-shortname">GetCampusDto Short Name</Label>
            <Input
              id="campus-shortname"
              value={campusFormData.campusShortName}
              onChange={(event) =>
                setCampusFormData({ ...campusFormData, campusShortName: event.target.value })
              }
              disabled={isUpdating}
              placeholder="Enter campus short name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="campus-address">Address</Label>
            <Textarea
              id="campus-address"
              value={campusFormData.address}
              onChange={(event) =>
                setCampusFormData({ ...campusFormData, address: event.target.value })
              }
              disabled={isUpdating}
              placeholder="Enter campus address"
              className="resize-none h-20"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="campus-latitude">Latitude</Label>
            <Input
              id="campus-latitude"
              type="number"
              value={campusFormData.latitude}
              onChange={(event) =>
                setCampusFormData({ ...campusFormData, latitude: event.target.value })
              }
              disabled={isUpdating}
              placeholder="Enter latitude"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="campus-longitude">Longitude</Label>
            <Input
              id="campus-longitude"
              type="number"
              value={campusFormData.longitude}
              onChange={(event) =>
                setCampusFormData({ ...campusFormData, longitude: event.target.value })
              }
              disabled={isUpdating}
              placeholder="Enter longitude"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={createCampusModalState.closeFn}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateCampus}
              disabled={
                isUpdating ||
                !campusFormData.campusName.trim() ||
                !campusFormData.campusShortName.trim() ||
                !campusFormData.address.trim() ||
                !campusFormData.latitude ||
                !campusFormData.longitude
              }
            >
              {isUpdating ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        controller={editCampusModalState}
        title="Edit GetCampusDto"
        size="sm"
        closable={!isUpdating}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-campus-name">GetCampusDto Name</Label>
            <Input
              id="edit-campus-name"
              value={campusFormData.campusName}
              onChange={(event) =>
                setCampusFormData({ ...campusFormData, campusName: event.target.value })
              }
              disabled={isUpdating}
              placeholder="Enter campus name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-campus-shortname">GetCampusDto Short Name</Label>
            <Input
              id="edit-campus-shortname"
              value={campusFormData.campusShortName}
              onChange={(event) =>
                setCampusFormData({ ...campusFormData, campusShortName: event.target.value })
              }
              disabled={isUpdating}
              placeholder="Enter campus short name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-campus-address">Address</Label>
            <Textarea
              id="edit-campus-address"
              value={campusFormData.address}
              onChange={(event) =>
                setCampusFormData({ ...campusFormData, address: event.target.value })
              }
              disabled={isUpdating}
              placeholder="Enter campus address"
              className="resize-none h-20"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-campus-latitude">Latitude</Label>
            <Input
              id="edit-campus-latitude"
              type="number"
              value={campusFormData.latitude}
              onChange={(event) =>
                setCampusFormData({ ...campusFormData, latitude: event.target.value })
              }
              disabled={isUpdating}
              placeholder="Enter latitude"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-campus-longitude">Longitude</Label>
            <Input
              id="edit-campus-longitude"
              type="number"
              value={campusFormData.longitude}
              onChange={(event) =>
                setCampusFormData({ ...campusFormData, longitude: event.target.value })
              }
              disabled={isUpdating}
              placeholder="Enter longitude"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={editCampusModalState.closeFn}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleEditCampus}
              disabled={
                isUpdating ||
                !campusFormData.campusName.trim() ||
                !campusFormData.campusShortName.trim() ||
                !campusFormData.address.trim() ||
                !campusFormData.latitude ||
                !campusFormData.longitude
              }
            >
              {isUpdating ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal<GetCampusDto>
        state={deleteCampusModalState}
        title="Delete GetCampusDto"
        description={(data) => (
          <>
            Are you sure you want to delete{' '}
            <span className="font-semibold text-foreground">
              {String(data?.campusName ?? `ID ${data?.id}`)}
            </span>
            ?
          </>
        )}
        confirmLabel="Delete"
        isLoading={isDeleting}
        onConfirm={handleDeleteCampus}
      />

      <Modal
        controller={createAgencyModalState}
        title="Create Agency"
        size="sm"
        closable={!isUpdating}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-agency-name">Agency Name</Label>
            <Input
              id="new-agency-name"
              value={agencyFormData.agencyName}
              onChange={(event) =>
                setAgencyFormData({ ...agencyFormData, agencyName: event.target.value })
              }
              disabled={isUpdating}
              placeholder="Enter agency name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-agency-shortname">Short Name</Label>
            <Input
              id="new-agency-shortname"
              value={agencyFormData.shortName}
              onChange={(event) =>
                setAgencyFormData({ ...agencyFormData, shortName: event.target.value })
              }
              disabled={isUpdating}
              placeholder="Enter short name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-agency-code">Code</Label>
            <Input
              id="new-agency-code"
              value={agencyFormData.code}
              onChange={(event) =>
                setAgencyFormData({ ...agencyFormData, code: event.target.value })
              }
              disabled={isUpdating}
              placeholder="Enter agency code"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-agency-address">Address</Label>
            <Textarea
              id="new-agency-address"
              value={agencyFormData.agencyAddress}
              onChange={(event) =>
                setAgencyFormData({ ...agencyFormData, agencyAddress: event.target.value })
              }
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
              <p className="text-xs text-muted-foreground">Selected: {selectedAgencyFile.name}</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={createAgencyModalState.closeFn}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateAgency}
              disabled={isUpdating || agencyFormData.agencyName.trim().length <= 0}
            >
              {isUpdating ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </PageLayout>
  );
}
