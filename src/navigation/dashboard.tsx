import type { Route } from "@/types";
import { GraduationCap, LayoutDashboardIcon, UserCog2 } from "lucide-react";
import DashboardHomePage from "@/pages/dashboard/home";
import FacultyPage from "@/pages/dashboard/faculty/faculty";
import FacultySectionsPage from "@/pages/dashboard/faculty/faculty-sections";




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
        label: "Faculty",
        path: "/faculty",
        icon: <UserCog2 />,
        component: <FacultyPage />,
        children: [],
        dashboard: true
    },
    {
        label: "Faculty",
        path: "/faculty/sections",
        component: <FacultySectionsPage />,
        children: [],
        dashboard: true,
        subroute: true
    },
    {
        label: "Student",
        path: "/auth/student",
        icon: <GraduationCap />,
        children: [],
        dashboard: true
    }
];

