import { useRouter, type RouteRecordRaw } from "vue-router";

export const useNestedRoutes = () => {
    const router = useRouter();
    const allRoutes = router.getRoutes();

    // Function to build a nested list of routes
    const buildNestedRoutes = (routes: RouteRecordRaw[]): RouteRecordRaw[] => {
        const nestedRoutes: RouteRecordRaw[] = [];
        const routeMap = new Map<
            string,
            RouteRecordRaw & { children?: RouteRecordRaw[] }
        >();

        // First pass: Initialize map and filter out routes not meant for navigation
        routes.forEach((route) => {
            if (!route.meta?.hideFromNav) {
                routeMap.set(route.path, { ...route, children: [] });
            }
        });

        // Second pass: Build hierarchy
        routeMap.forEach((route) => {
            const pathSegments = route.path.split("/").filter(Boolean);
            if (pathSegments.length > 1) {
                const parentPath = "/" + pathSegments.slice(0, -1).join("/");
                const parentRoute = routeMap.get(parentPath);
                if (parentRoute) {
                    parentRoute.children?.push(route);
                } else {
                    // If parent not found in map (e.g., parent is dynamic or not in nav), treat as top-level
                    nestedRoutes.push(route);
                }
            } else {
                // Top-level routes
                nestedRoutes.push(route);
            }
        });

        // Filter out routes that have become children and are not top-level
        const finalNestedRoutes = nestedRoutes.filter((route) => {
            const pathSegments = route.path.split("/").filter(Boolean);
            return (
                pathSegments.length <= 1 ||
                !routeMap.has("/" + pathSegments.slice(0, -1).join("/"))
            );
        });

        // Sort routes for consistent order
        const sortRoutes = (
            routesArray: (RouteRecordRaw & { children?: RouteRecordRaw[] })[],
        ) => {
            routesArray.sort((a, b) => {
                const nameA = ((a.name as string) || "").toLowerCase();
                const nameB = ((b.name as string) || "").toLowerCase();
                return nameA.localeCompare(nameB);
            });
            routesArray.forEach((route) => {
                if (route.children) {
                    sortRoutes(route.children);
                }
            });
        };

        sortRoutes(finalNestedRoutes);

        return finalNestedRoutes;
    };

    const nestedRoutes = buildNestedRoutes(allRoutes);

    return { nestedRoutes };
};
