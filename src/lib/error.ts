export const apiGetError = (error: unknown, fallback: string): string => {
  if (error && typeof error === 'object') {
    const errorObj = error as Record<string, unknown>;

    // Safely unwrap Axios-style: error.response?.data → error.data → error itself
    const response = errorObj.response as Record<string, unknown> | undefined;
    const data = response?.data ?? errorObj.data ?? errorObj;

    // Case 1: array of error objects [{ message: '...' }, ...]
    if (Array.isArray(data)) {
      for (const err of data) {
        if (err && typeof err === 'object') {
          const msg = (err as Record<string, unknown>).message;
          if (typeof msg === 'string') return msg;
        }
      }
    }

    if (data && typeof data === 'object') {
      const dataObj = data as Record<string, unknown>;

      // Case 2: single error object { message: '...' }
      if (typeof dataObj.message === 'string') return dataObj.message;

      // Case 3: validation errors { errors: { field: string | string[] } }
      if (dataObj.errors && typeof dataObj.errors === 'object') {
        const errors = dataObj.errors as Record<string, unknown>;
        for (const [field, value] of Object.entries(errors)) {
          if (Array.isArray(value) && value.length > 0) return `${field}: ${value[0]}`;
          if (typeof value === 'string') return `${field}: ${value}`;
        }
      }

      // Case 4: plain string fields { error: '...' } | { detail: '...' } | etc.
      for (const key of ['error', 'detail', 'title', 'description'] as const) {
        if (typeof dataObj[key] === 'string') return dataObj[key] as string;
      }
    }

    // Case 5: the error itself resolves to a plain string
    if (typeof data === 'string' && data.length > 0) return data;
  }

  return fallback;
};
