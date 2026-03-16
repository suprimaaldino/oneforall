const API_BASE = '/api';

/**
 * Fetch helper with error handling.
 */
async function apiFetch(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`[API] ${endpoint}:`, error);
    throw error;
  }
}

/** Get dashboard stats */
export const getStats = () => apiFetch('/stats');

/** Get recent conversations */
export const getConversations = (limit = 50) => apiFetch(`/conversations?limit=${limit}`);

/** Get messages for a specific contact */
export const getConversation = (jid, limit = 50) =>
  apiFetch(`/conversations/${encodeURIComponent(jid)}?limit=${limit}`);

/** Get all settings */
export const getSettings = () => apiFetch('/settings');

/** Update a setting */
export const updateSetting = (key, value) =>
  apiFetch('/settings', {
    method: 'PUT',
    body: JSON.stringify({ key, value }),
  });
