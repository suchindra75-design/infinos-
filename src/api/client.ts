import {
  ApiResponse,
  SafeUser,
  SafeDevice,
  DeviceStatusResponse,
  AnalyticsSummary,
  AnalyticsTimeseries,
  Alert,
  DeviceSettings,
  UpdateDeviceSettingsInput,
  CreateDeviceInput,
  ConnectionTestResult,
} from '../types';

const TOKEN_KEY = 'infinos_auth_token';

class ApiClient {
  private get baseUrl(): string {
    const configured = import.meta.env.VITE_API_BASE_URL;
    if (configured && typeof configured === 'string' && configured.trim().length > 0) {
      return configured.replace(/\/+$/, '');
    }
    return '/api/v1';
  }

  public getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  public setToken(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch (e) {
      console.warn('Failed to store auth token in localStorage', e);
    }
  }

  public removeToken(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch (e) {
      console.warn('Failed to remove auth token from localStorage', e);
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const token = this.getToken();

    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        // If unauthorized on protected endpoint, clear stale token
        if (!endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
          this.removeToken();
          window.dispatchEvent(new CustomEvent('infinos:auth:unauthorized'));
        }
      }

      const contentType = response.headers.get('content-type');
      let data: any = null;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { success: response.ok, message: text };
      }

      if (!response.ok) {
        const errorMessage =
          data?.error?.message ||
          data?.message ||
          `Request failed with status ${response.status}: ${response.statusText}`;
        const error = new Error(errorMessage) as any;
        error.status = response.status;
        error.code = data?.error?.code || 'API_ERROR';
        error.details = data?.error?.details || data;
        throw error;
      }

      return data as ApiResponse<T>;
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        const connErr = new Error('Backend service unreachable. Verify the backend API server is running.') as any;
        connErr.code = 'NETWORK_ERROR';
        throw connErr;
      }
      throw err;
    }
  }

  // ==========================================
  // AUTHENTICATION APIs
  // ==========================================
  public readonly auth = {
    login: async (credentials: { email: string; password: string }) => {
      const res = await this.request<{ token: string; user: SafeUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      if (res.data?.token) {
        this.setToken(res.data.token);
      }
      return res.data;
    },

    register: async (data: { name: string; email: string; password: string; role?: string }) => {
      const res = await this.request<{ user: SafeUser }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return res.data;
    },

    logout: async () => {
      try {
        await this.request<{ message: string }>('/auth/logout', {
          method: 'POST',
        });
      } finally {
        this.removeToken();
      }
    },

    getMe: async () => {
      const res = await this.request<{ user: SafeUser }>('/auth/me');
      return res.data.user;
    },
  };

  // ==========================================
  // DEVICE MANAGEMENT APIs
  // ==========================================
  public readonly devices = {
    list: async (includeArchived = false) => {
      const queryString = includeArchived ? '?includeArchived=true' : '';
      const res = await this.request<{ devices: SafeDevice[] }>(`/devices${queryString}`);
      return res.data.devices;
    },

    getById: async (id: string) => {
      const res = await this.request<{ device: SafeDevice }>(`/devices/${id}`);
      return res.data.device;
    },

    create: async (data: CreateDeviceInput) => {
      const res = await this.request<{ device: SafeDevice }>('/devices', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return res.data.device;
    },

    archive: async (id: string) => {
      const res = await this.request<{ device: SafeDevice }>(`/devices/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isArchived: true }),
      });
      return res.data.device;
    },

    unarchive: async (id: string) => {
      const res = await this.request<{ device: SafeDevice }>(`/devices/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isArchived: false }),
      });
      return res.data.device;
    },

    delete: async (id: string) => {
      const res = await this.request<{ message: string }>(`/devices/${id}`, {
        method: 'DELETE',
      });
      return res.data;
    },

    testConnection: async (data: { thingSpeakChannelId: string; thingSpeakReadApiKey?: string }) => {
      const res = await this.request<ConnectionTestResult>('/devices/test-connection', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return res.data;
    },

    getStatus: async (id: string) => {
      const res = await this.request<DeviceStatusResponse>(`/devices/${id}/status`);
      return res.data;
    },

    getLatestReading: async (id: string) => {
      const res = await this.request<{
        deviceId: string;
        deviceCode: string;
        channelId: string;
        reading: any | null;
        hasReading: boolean;
        message?: string;
      }>(`/devices/${id}/readings/latest`);
      return res.data;
    },

    sync: async (id: string) => {
      const res = await this.request<{
        deviceId: string;
        deviceCode: string;
        channelId: string;
        newReadingsCount: number;
        syncedAt: string;
      }>(`/devices/${id}/sync`, {
        method: 'POST',
      });
      return res.data;
    },
  };

  // ==========================================
  // ANALYTICS & TIMESERIES APIs
  // ==========================================
  public readonly analytics = {
    getSummary: async (deviceId: string, query?: { from?: string; to?: string }) => {
      const params = new URLSearchParams();
      if (query?.from) params.set('from', query.from);
      if (query?.to) params.set('to', query.to);
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res = await this.request<AnalyticsSummary>(`/devices/${deviceId}/analytics/summary${queryString}`);
      return res.data;
    },

    getTimeseries: async (
      deviceId: string,
      query?: { from?: string; to?: string; limit?: number }
    ) => {
      const params = new URLSearchParams();
      if (query?.from) params.set('from', query.from);
      if (query?.to) params.set('to', query.to);
      if (query?.limit) params.set('limit', String(query.limit));
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res = await this.request<AnalyticsTimeseries>(`/devices/${deviceId}/analytics/timeseries${queryString}`);
      return res.data;
    },
  };

  // ==========================================
  // ALERT MANAGEMENT APIs
  // ==========================================
  public readonly alerts = {
    list: async (query?: {
      deviceId?: string;
      isResolved?: boolean;
      severity?: string;
      type?: string;
      page?: number;
      limit?: number;
    }) => {
      const params = new URLSearchParams();
      if (query?.deviceId) params.set('deviceId', query.deviceId);
      if (query?.isResolved !== undefined) params.set('isResolved', String(query.isResolved));
      if (query?.severity) params.set('severity', query.severity);
      if (query?.type) params.set('type', query.type);
      if (query?.page) params.set('page', String(query.page));
      if (query?.limit) params.set('limit', String(query.limit));
      const queryString = params.toString() ? `?${params.toString()}` : '';

      const res = await this.request<Alert[]>(`/alerts${queryString}`);
      return {
        alerts: res.data || [],
        pagination: res.pagination,
      };
    },

    listDeviceAlerts: async (
      deviceId: string,
      query?: { isResolved?: boolean; severity?: string; type?: string }
    ) => {
      const params = new URLSearchParams();
      if (query?.isResolved !== undefined) params.set('isResolved', String(query.isResolved));
      if (query?.severity) params.set('severity', query.severity);
      if (query?.type) params.set('type', query.type);
      const queryString = params.toString() ? `?${params.toString()}` : '';

      const res = await this.request<Alert[]>(`/devices/${deviceId}/alerts${queryString}`);
      return {
        alerts: res.data || [],
        pagination: res.pagination,
      };
    },

    resolve: async (alertId: string) => {
      const res = await this.request<Alert>(`/alerts/${alertId}/resolve`, {
        method: 'PATCH',
      });
      return res.data;
    },
  };

  // ==========================================
  // DEVICE SETTINGS APIs
  // ==========================================
  public readonly settings = {
    get: async (deviceId: string) => {
      const res = await this.request<DeviceSettings>(`/devices/${deviceId}/settings`);
      return res.data;
    },

    update: async (deviceId: string, data: UpdateDeviceSettingsInput) => {
      const res = await this.request<DeviceSettings>(`/devices/${deviceId}/settings`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      return res.data;
    },
  };

  // ==========================================
  // DATA EXPORT APIs (CSV & PDF)
  // ==========================================
  public readonly exports = {
    downloadCsv: async (
      deviceId: string,
      deviceCode: string,
      options?: { from?: string; to?: string; limit?: number }
    ): Promise<void> => {
      const params = new URLSearchParams();
      if (options?.from) params.set('from', options.from);
      if (options?.to) params.set('to', options.to);
      if (options?.limit) params.set('limit', String(options.limit));
      const queryString = params.toString() ? `?${params.toString()}` : '';

      const url = `${this.baseUrl}/devices/${deviceId}/export/csv${queryString}`;
      const token = this.getToken();

      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        let errMessage = 'Failed to export CSV';
        try {
          const json = await response.json();
          errMessage = json.error?.message || json.message || errMessage;
        } catch {
          // ignore
        }
        throw new Error(errMessage);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `infinos-bag-${deviceCode}-telemetry.csv`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    },

    downloadPdf: async (
      deviceId: string,
      deviceCode: string,
      options?: { from?: string; to?: string; limit?: number }
    ): Promise<void> => {
      const params = new URLSearchParams();
      if (options?.from) params.set('from', options.from);
      if (options?.to) params.set('to', options.to);
      if (options?.limit) params.set('limit', String(options.limit));
      const queryString = params.toString() ? `?${params.toString()}` : '';

      const url = `${this.baseUrl}/devices/${deviceId}/export/pdf${queryString}`;
      const token = this.getToken();

      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        let errMessage = 'Failed to export PDF';
        try {
          const json = await response.json();
          errMessage = json.error?.message || json.message || errMessage;
        } catch {
          // ignore
        }
        throw new Error(errMessage);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `infinos-bag-${deviceCode}-report.pdf`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    },
  };
}

export const api = new ApiClient();
