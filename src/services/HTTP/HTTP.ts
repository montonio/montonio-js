/**
 * HTTP Service for making API requests
 * Handles GET, POST, and PATCH requests with JSON data
 * Implemented as a singleton
 */
export class HTTPService {
    private static instance: HTTPService;
    private readonly timeout = 10000;

    private constructor() {}

    public static getInstance(): HTTPService {
        if (!HTTPService.instance) {
            HTTPService.instance = new HTTPService();
        }
        return HTTPService.instance;
    }

    public async get<T>(url: string): Promise<T> {
        return this.request<T, never>(url, 'GET');
    }

    public async post<T, D = unknown>(url: string, data: D): Promise<T> {
        return this.request<T, D>(url, 'POST', data);
    }

    public async patch<T, D = unknown>(url: string, data: D): Promise<T> {
        return this.request<T, D>(url, 'PATCH', data);
    }

    /**
     * Core request method that handles all HTTP requests
     * @param url The URL to make the request to
     * @param method The HTTP method to use
     * @param data Optional data to send in the request body
     * @returns Promise that resolves with the JSON response
     */
    private async request<T, D = unknown>(url: string, method: string, data?: D): Promise<T> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const headers: HeadersInit = {
                Accept: 'application/json',
                'X-Montonio-Js-Version': __MONTONIO_JS_VERSION__,
            };
            if (data) {
                headers['Content-Type'] = 'application/json';
            }

            const options: RequestInit = {
                method,
                headers,
                credentials: 'include',
                mode: 'cors',
                signal: controller.signal,
            };

            if (data) {
                options.body = JSON.stringify(data);
            }

            const response = await fetch(url, options);

            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            return result as T;
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                throw new Error(`Request timeout after ${this.timeout}ms`);
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    }
}

export default HTTPService;
