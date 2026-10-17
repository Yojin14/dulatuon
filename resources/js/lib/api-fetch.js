/**
 * Simple function to fetch data from external API using SSO token
 * @param {string} apiUrl - The full API URL to fetch from
 * @param {string} token - The SSO token for authentication
 * @param {Object} [options] - Optional fetch options (method, body, etc.)
 * @returns {Promise<Object>} Promise that resolves with the parsed JSON response
 */
export async function apiFetch(apiUrl, token, options = {}) {
    const {
        method = 'GET',
        body = null,
        headers = {},
        ...restOptions
    } = options;

    // Default headers
    const defaultHeaders = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
    };

    // Merge custom headers with defaults
    const requestHeaders = {
        ...defaultHeaders,
        ...headers,
    };

    // Prepare fetch options
    const fetchOptions = {
        method,
        headers: requestHeaders,
        credentials: 'omit',
        ...restOptions,
    };

    // Add body if provided
    if (body) {
        fetchOptions.body =
            typeof body === 'string' ? body : JSON.stringify(body);
    }

    try {
        const response = await fetch(apiUrl, fetchOptions);

        // Read response body
        let responseData;
        try {
            const text = await response.text();
            responseData = text ? JSON.parse(text) : {};
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            throw new Error('Invalid JSON response from server');
        }

        // Handle authentication errors
        if (response.status === 401 || response.status === 403) {
            const errorMsg =
                responseData?.message ||
                responseData?.error ||
                'Authentication failed. Your session has expired. Please log in again.';
            throw new Error(errorMsg);
        }

        // Handle HTTP errors
        if (!response.ok) {
            const errorMsg =
                responseData?.message ||
                responseData?.error ||
                `Failed to fetch data (${response.status})`;
            throw new Error(errorMsg);
        }

        // Return the response data
        return responseData;
    } catch (err) {
        // Re-throw if it's already an Error with a message
        if (err instanceof Error) {
            throw err;
        }
        // Otherwise wrap in Error
        throw new Error(err.message || 'Failed to fetch data from server');
    }
}
