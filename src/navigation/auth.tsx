import { AuthLoginPage } from "@/pages/auth/login";
import type { Route } from "@/types";







export const AUTHROUTES: Route[] = [
    {
        label: "Login",
        path: "/auth/login",
        icon: null,
        component: <AuthLoginPage />,
        dashboard: false
    }
];


