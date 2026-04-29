// AgriReports API Client
// Typed HTTP client for interacting with AgriReports v1 API endpoints

import {
  ApiResponse,
  ApiError,
  PaginatedResponse,
  CreateReportRequest,
  UpdateReportRequest,
  SubmitReportRequest,
  ReviewReportRequest,
  ListReportsQuery,
} from '../types/agrireports-api';
import { Report } from '../types/agrireports';

// Base API URL
const API_BASE = '/api/v1';

/**
 * Get JWT token from session storage
 */
function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('agrireports_token');
}

/**
 * Set JWT token in session storage
 */
export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('agrireports_token', token);
}

/**
 * Remove JWT token from session storage
 */
export function clearToken(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('agrireports_token');
}

/**
 * Build authorization headers
 */
function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

/**
 * Generic fetch wrapper with error handling
 */
async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      const error: ApiError = {
        error: data.error || 'UNKNOWN_ERROR',
        message: data.message || 'An unexpected error occurred',
        details: data.details,
        statusCode: response.status,
      };
      throw error;
    }

    return data as ApiResponse<T>;
  } catch (error) {
    if ((error as ApiError).statusCode) {
      throw error;
    }

    // Network or parsing error
    throw {
      error: 'NETWORK_ERROR',
      message: error instanceof Error ? error.message : 'Network request failed',
      statusCode: 0,
    } as ApiError;
  }
}

/**
 * Build query string from object
 */
function buildQueryString(params: Record<string, string | number | boolean | undefined | null>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

// ============================================================
// API Client Methods
// ============================================================

export const agrireportsApi = {
  /**
   * Authenticate and get JWT token
   */
  async login(email: string, password: string): Promise<ApiResponse<{ token: string; expiresIn: string; user: { id: string; name: string; email: string } }>> {
    return request('/auth/token', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  /**
   * Logout and clear token
   */
  logout(): void {
    clearToken();
  },

  /**
   * List reports with pagination and filters
   */
  async listReports(query: ListReportsQuery = {}): Promise<ApiResponse<PaginatedResponse<Report>>> {
    const queryString = buildQueryString(query as Record<string, string | number | boolean | undefined | null>);
    return request(`/reports${queryString}`);
  },

  /**
   * Get a single report by ID
   */
  async getReport(id: string): Promise<ApiResponse<Report>> {
    return request(`/reports/${id}`);
  },

  /**
   * Create a new report
   */
  async createReport(data: CreateReportRequest): Promise<ApiResponse<Report>> {
    return request('/reports/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update an existing report (draft or changes_requested only)
   */
  async updateReport(id: string, data: UpdateReportRequest): Promise<ApiResponse<Report>> {
    return request(`/reports/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a report (draft only)
   */
  async deleteReport(id: string): Promise<ApiResponse<void>> {
    return request(`/reports/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Submit report for review
   */
  async submitReport(id: string, data: SubmitReportRequest): Promise<ApiResponse<Report>> {
    return request(`/reports/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Review report (approve/reject/request changes)
   */
  async reviewReport(id: string, data: ReviewReportRequest): Promise<ApiResponse<Report>> {
    return request(`/reports/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Export types for convenience
export type {
  ApiResponse,
  ApiError,
  PaginatedResponse,
  CreateReportRequest,
  UpdateReportRequest,
  SubmitReportRequest,
  ReviewReportRequest,
  ListReportsQuery,
  Report,
};
