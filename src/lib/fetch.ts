import { getEdusyncERPAPI } from '@/lib/orval/endpoints';

const api = getEdusyncERPAPI();

const BASE = import.meta.env.VITE_APP_API_URL || 'http://localhost:8080/Api';
const BACKDOOR_BASE = import.meta.env.VITE_APP_API_BACKDOOR_URL || 'https://cqi.ustp.edu.ph/dev/Api';

export type MethodType = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'  | 'HEAD' | 'OPTIONS';

const toJsonResponse = (data: unknown, status = 200) => {
    return new Response(JSON.stringify(data ?? null), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
};

const toNoContentResponse = () => new Response(null, { status: 204 });

const formDataToRecord = (formData: FormData) => {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Array.from(formData as unknown as Iterable<[
        string,
        FormDataEntryValue,
    ]>)) {
        if (key.toLowerCase().startsWith('files')) {
            const currentFiles = Array.isArray(result.files) ? (result.files as File[]) : [];
            result.files = [...currentFiles, value as File];
            continue;
        }

        const normalizedKey =
            key === 'AgencyName'
                ? 'agencyName'
                : key === 'ShortName'
                    ? 'shortName'
                    : key === 'Code'
                        ? 'code'
                        : key === 'AgencyAddress'
                            ? 'agencyAddress'
                            : key === 'CampusName'
                                ? 'campusName'
                                : key === 'Address'
                                    ? 'address'
                                    : key === 'AgencyId'
                                        ? 'agencyId'
                                        : key;

        result[normalizedKey] = value;
    }

    if (typeof result.isDefault === 'string') {
        result.isDefault = result.isDefault === 'true';
    }

    if (typeof result.agencyId === 'string') {
        result.agencyId = Number(result.agencyId);
    }

    return result;
};

const routeOrvalRequest = async (meth: MethodType, url: string, options: RequestInit = {}) => {
    const parsedUrl = new URL(url, 'http://localhost');
    const path = parsedUrl.pathname.replace(/^\//, '');
    const searchParams = new URLSearchParams(parsedUrl.search);
    const body = options.body;


    if (meth === 'GET' && path === 'Agency/paginate') {
        return toJsonResponse(await api.getPaginatedAgency({
            Page: Number(searchParams.get('page') ?? 1),
            Rows: Number(searchParams.get('rows') ?? 10),
            ...(searchParams.get('search') ? { Search: searchParams.get('search') ?? undefined } : {}),
        }));
    }

    if (meth === 'POST' && path === 'Agency/create' && body instanceof FormData) {
        return toJsonResponse(await api.createAgency(formDataToRecord(body) as never));
    }

    if (meth === 'PUT' && path.startsWith('Agency/update/') && body instanceof FormData) {
        return toJsonResponse(await api.updateAgency(Number(path.split('/').at(-1)), formDataToRecord(body) as never));
    }

    if (meth === 'DELETE' && path.startsWith('Agency/delete/')) {
        await api.deleteAgency(Number(path.split('/').at(-1)));
        return toNoContentResponse();
    }

    if (meth === 'POST' && path === 'Campus/create' && body instanceof FormData) {
        return toJsonResponse(await api.createCampus(formDataToRecord(body) as never));
    }

    if (meth === 'PUT' && path.startsWith('Campus/update/') && body instanceof FormData) {
        return toJsonResponse(await api.updateCampus(Number(path.split('/').at(-1)), formDataToRecord(body) as never));
    }

    if (meth === 'DELETE' && path.startsWith('Campus/delete/')) {
        await api.deleteCampus(Number(path.split('/').at(-1)));
        return toNoContentResponse();
    }

    return undefined;
};

async function buildAndFetch(base: string, meth: MethodType, url: string, options: RequestInit = {}) {
    const accessToken = localStorage.getItem('accessToken');
    const headers = new Headers(options.headers);
    const hasBody = options.body !== undefined && options.body !== null;
    const isFormData = options.body instanceof FormData;

    if (hasBody && !isFormData && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    if (accessToken && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${accessToken}`);
    }

    const routedResponse = await routeOrvalRequest(meth, url, options);
    if (routedResponse) {
        return routedResponse;
    }

    return fetch(`${base}/${url}`, {
        ...options,
        method: meth,
        headers,
    });
}

export function fetchData(meth: MethodType, url: string, options: RequestInit = {}) {
    return buildAndFetch(BASE, meth, url, options);
}

export function fetchBackdoor(meth: MethodType, url: string, options: RequestInit = {}) {
    return buildAndFetch(BACKDOOR_BASE, meth, url, options);
}

