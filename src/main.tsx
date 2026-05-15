import { StrictMode, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, type RouteObject } from 'react-router-dom';
import './index.css';
import Providers from '@/components/providers';

import DashboardLayout from '@/layouts/dashboard';
import DefaultLayout from '@/layouts/default';
import { AUTHROUTES } from './navigation/auth';
import { DASHROUTES } from './navigation/dashboard';
import type { Route } from './types';

const routes: Route[] = [...AUTHROUTES, ...DASHROUTES];

const toRouteObjects = (route: Route): RouteObject[] => {
  const layout = route.dashboard ? DashboardLayout : DefaultLayout;

  const currentRoute: RouteObject = {
    path: route.path,
    index: route.index,
    element: createElement(layout, null, route.component),
  };

  const childRoutes = (route.children ?? []).flatMap(toRouteObjects);

  return [currentRoute, ...childRoutes];
};

const router = createBrowserRouter(routes.flatMap(toRouteObjects));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
);
