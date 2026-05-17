


const BASE = import.meta.env.VITE_APP_API_URL || 'http://localhost:5263/Api';

export type MethodType = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'  | 'HEAD' | 'OPTIONS';

export async function fetchData(meth: MethodType, url: string, options: RequestInit = undefined) {
    const accessToken = localStorage.getItem('accessToken');
    const isFormData = options?.body instanceof FormData;
    
    return fetch(`${BASE}/${url}`, {
        method: meth,
        headers: {
            ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
            'Authorization': `Bearer ${accessToken}`,
            ...(options?.headers ? options.headers : {}),
        },
        ...(options ? options : {}),
    });
}

