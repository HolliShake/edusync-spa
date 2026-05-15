


const BASE = 'http://localhost:5263/Api';

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

