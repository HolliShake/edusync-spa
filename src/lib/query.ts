



export function buildQuery(transform: Record<string, string>, from: object): string {
    const queryParams = Object.entries(transform)
        .filter(([key]) => from[key] !== undefined && from[key] !== null)
        .map(([key, paramName]) => `${encodeURIComponent(paramName)}=${encodeURIComponent(String(from[key]))}`)
        .join('&');
    return queryParams ? `?${queryParams}` : '';
}