



export interface AccessGroupActionDetail {
  accessGroupAction: {
    accessGroup: {
      accessGroupName: string;
    };
    action: string;
  };
}

export interface GetUserDto {
  userAccessGroupDetails?: AccessGroupActionDetail[];
  [key: string]: unknown;
}

export interface AuthDataDto extends GetUserDto {
  isGoogle: boolean;
  accessToken: string;
  refreshToken: string;
  profileImage?: string | null;
  accessListString: string;
  accessListStringRaw: string;
  accessTokenSize: string;
}

export type DateTimeString = string;

export interface Campus {
  id: number;
  campusName?: string;
  campusShortName?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  agencyId?: number;
  agency?: Agency | null;
  files?: unknown[];
}

export interface College {
  id: number;
  collegeName?: string;
  collegeShortName?: string;
  campusId?: number;
  campus?: Campus;
}

export interface ProgramType {
  id: number;
  programTypeName?: string;
}

export interface MajorStudy {
  id: number;
  majorStudyName?: string;
}

export interface Curriculum {
  id: number;
  curriculumName?: string;
}

export interface Agency {
  id: number;
  agencyName?: string;
}

export interface Course {
  id: number;
  courseCode?: string;
  courseTitle?: string;
  courseDescription?: string;
  withLaboratory?: boolean;
  isSpecialize?: boolean;
  lectureUnits?: number;
  laboratoryUnits?: number;
  creditUnits?: number;
  isImportedFromOldSystem?: boolean;
  parentId?: number | null;
  sfTrackSpecializationId?: number | null;
  courseRequisites?: unknown[];
}

export interface User {
  id: string;
  fullName?: string;
  email?: string;
}

export interface EnrollmentRole {
  id: number;
  roleName?: string;
  enrollmentRoleName?: string;
}

export interface AcademicProgram {
  id: number;
  programName: string;
  shortName: string;
  yearFirstImplemented: Date;
  collegeId: number;
  college: College;
  programTypeId?: number | null;
  programType?: ProgramType | null;
  majorStudyId?: number | null;
  majorStudy?: MajorStudy | null;
  curriculums: Curriculum[];
}

export interface Cycle {
  id: number;
  cycleDescription: string;
  cycleNumber: number;
  schoolYear: string;
  startDate: Date;
  endDate: Date;
  isCurrentCycle: boolean;
  campusId: number;
  campus: Campus;
}

export interface EnrollmentBackdoor {
  id: number;
  sectionName: string;
  yearLevel: number;
  termNumber: number;
  campusCode: string;
  cycleId: number;
  cycle: Cycle;
  academicProgramId: number;
  academicProgram: AcademicProgram;
  courseId: number;
  course: Course;
  userId: string;
  user: User;
  enrollmentRoleId: number;
  enrollmentRole: EnrollmentRole;
}

export interface AcademicProgramDto {
  id: number;
  programName: string;
  shortName: string;
  yearFirstImplemented: DateTimeString;
  collegeId: number;
  college?: College;
  programTypeId?: number | null;
  programType?: ProgramType | null;
  majorStudyId?: number | null;
  majorStudy?: MajorStudy | null;
  curriculums?: Curriculum[];
}

export interface CycleDto {
  id: number;
  cycleDescription: string;
  cycleNumber: number;
  schoolYear: string;
  startDate: DateTimeString;
  endDate: DateTimeString;
  isCurrentCycle: boolean;
  campusId: number;
  campus?: Campus;
}

export interface CampusDto {
  id: number;
  campusName: string;
  campusShortName: string;
  address: string;
  latitude: number;
  longitude: number;
  agencyId: number;
  agency?: Agency;
  cycles?: CycleDto[];
}

export interface CollegeDto {
  id: number;
  collegeName: string;
  collegeShortName: string;
  campusId: number;
  campus?: CampusDto;
}



export interface EnrollmentBackdoorDto {
  id: number;
  sectionName: string;
  yearLevel: number;
  termNumber: number;
  campusCode: string;
  cycleId: number;
  cycle?: CycleDto;
  academicProgramId: number;
  academicProgram?: AcademicProgramDto;
  courseId: number;
  course?: Course;
  userId: string;
  user?: User;
  enrollmentRoleId: number;
  enrollmentRole?: EnrollmentRole;
}

export interface Route {
    label: string;
    path: string;
    icon?: React.ReactNode;
    index?: boolean;
    component?: React.ReactElement;
    children?: Route[];
    dashboard: boolean;
    subroute?: boolean;
}


export interface PaginationMeta {
  page: number;
  rows: number;
  totalPages: number;
  totalItems: number;
}


export interface GetPaginatedResponseDto<T> {
    data: T[];
    paginationMeta: PaginationMeta;
}