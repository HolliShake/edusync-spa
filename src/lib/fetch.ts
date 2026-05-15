


const BASE = import.meta.env.VITE_APP_API_URL || 'http://localhost:5263/Api';
const FILES_BASE = import.meta.env.VITE_APP_API_FILES || 'http://localhost:5263/Files';

export type MethodType = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'  | 'HEAD' | 'OPTIONS';

export async function fetchData(meth: MethodType, url: string, options: RequestInit = undefined) {
    const accessToken = localStorage.getItem('accessToken');
    return fetch(`${BASE}/${url}`, {
        method: meth,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            ...(options?.headers ? options.headers : {}),
        },
        ...(options ? options : {}),
    });
}

