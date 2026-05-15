import type { Route } from "@/types";
import { GraduationCap, LayoutDashboardIcon, UserCog2 } from "lucide-react";
import DashboardHomePage from "@/pages/dashboard/home";
import FacultyPage from "@/pages/dashboard/enrollment-backdoor/faculty/faculty";
import FacultySectionsPage from "@/pages/dashboard/enrollment-backdoor/faculty/faculty-sections";
import StudentPage from "@/pages/dashboard/enrollment-backdoor/student/student";
import AgencyPage from "@/pages/dashboard/agency/agency";




export const DASHROUTES: Route[] = [
    {
        label: "Dashboard",
        path: "/dashboard",
        icon: <LayoutDashboardIcon />,
        index: true,
        component: <DashboardHomePage />,
        dashboard: true
    },
    {
        label: "Agency",
        path: "/agency",
        icon: <UserCog2 />,
        component: <AgencyPage />,
        dashboard: true
    },
    {
        label: "Enrollment Backdoor",
        path: "/enrollment-backdoor",
        icon: <UserCog2 />,
        component: <FacultyPage />,
        children: [
            {
                label: "Faculty",
                path: "/enrollment-backdoor/faculty",
                icon: <UserCog2 />,
                component: <FacultyPage />,
                children: [],
                dashboard: true
            },
            {
                label: "Faculty",
                path: "/enrollment-backdoor/faculty/sections",
                component: <FacultySectionsPage />,
                children: [],
                dashboard: true,
                subroute: true
            },
            {
                label: "Student",
                path: "/enrollment-backdoor/student",
                icon: <GraduationCap />,
                component: <StudentPage />,
                children: [],
                dashboard: true
            }
        ],
        dashboard: true
    }
];

