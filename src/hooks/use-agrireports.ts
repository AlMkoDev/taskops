// React Hooks for AgriReports API
// Provides convenient hooks for interacting with the reports API

import { useState, useEffect, useCallback } from 'react';
import { agrireportsApi, setToken, clearToken as _clearToken } from '../lib/agrireports-api-client';
import {
  ApiError,
  CreateReportRequest,
  UpdateReportRequest,
  SubmitReportRequest,
  ReviewReportRequest,
  ListReportsQuery,
} from '../types/agrireports-api';
import { Report } from '../types/agrireports';

// ============================================================
// Authentication Hook
// ============================================================

export interface AuthState {
  user: { name: string; email?: string } | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
}

export function useAgriAuth(): AuthState {
  const [user, setUser] = useState<{ name: string; email?: string } | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load token from session on mount
  useEffect(() => {
    const storedToken = sessionStorage.getItem('agrireports_token');
    if (storedToken) {
      setTokenState(storedToken);
      // TODO: Decode JWT to get user info
      // For now, we'll just set a placeholder
      setUser({ name: 'Authenticated User' });
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await agrireportsApi.login(email, password);
      
      if (response.success && response.data) {
        setToken(response.data.token);
        setTokenState(response.data.token);
        setUser(response.data.user);
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (err) {
      const error = err as ApiError;
      setError(error.message || 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    agrireportsApi.logout();
    setTokenState(null);
    setUser(null);
  }, []);

  return {
    user,
    token,
    isLoading,
    isAuthenticated: !!token,
    login,
    logout,
    error,
  };
}

// ============================================================
// Reports List Hook
// ============================================================

export interface UseReportsListResult {
  reports: Report[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  } | null;
  isLoading: boolean;
  error: string | null;
  fetchReports: (query?: ListReportsQuery) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useReportsList(initialQuery: ListReportsQuery = {}): UseReportsListResult {
  const [reports, setReports] = useState<Report[]>([]);
  const [pagination, setPagination] = useState<UseReportsListResult['pagination']>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(initialQuery);

  const fetchReports = useCallback(async (queryParams?: ListReportsQuery) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const fetchQuery = queryParams || query;
      const response = await agrireportsApi.listReports(fetchQuery);
      
      if (response.success && response.data) {
        setReports(response.data.data || []);
        setPagination(response.data.total ? {
          total: response.data.total,
          page: response.data.page,
          pageSize: response.data.pageSize,
          hasMore: response.data.hasMore,
        } : null);
        
        // Update query state if new params provided
        if (queryParams) {
          setQuery(queryParams);
        }
      } else {
        throw new Error(response.message || 'Failed to fetch reports');
      }
    } catch (err) {
      const error = err as ApiError;
      setError(error.message || 'Failed to fetch reports');
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  const refetch = useCallback(() => {
    return fetchReports();
  }, [fetchReports]);

  // Auto-fetch on mount and query change
  useEffect(() => {
    fetchReports();
  }, []);

  return {
    reports,
    pagination,
    isLoading,
    error,
    fetchReports,
    refetch,
  };
}

// ============================================================
// Single Report Hook
// ============================================================

export interface UseReportResult {
  report: Report | null;
  isLoading: boolean;
  error: string | null;
  fetchReport: (id: string) => Promise<void>;
  updateReport: (data: UpdateReportRequest) => Promise<Report>;
  submitReport: (data: SubmitReportRequest) => Promise<Report>;
  reviewReport: (data: ReviewReportRequest) => Promise<Report>;
  deleteReport: () => Promise<void>;
  clearReport: () => void;
}

export function useReport(): UseReportResult {
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await agrireportsApi.getReport(id);
      
      if (response.success && response.data) {
        setReport(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch report');
      }
    } catch (err) {
      const error = err as ApiError;
      setError(error.message || 'Failed to fetch report');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateReport = useCallback(async (data: UpdateReportRequest): Promise<Report> => {
    if (!report) throw new Error('No report loaded');
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await agrireportsApi.updateReport(report.id, data);
      
      if (response.success && response.data) {
        setReport(response.data);
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to update report');
      }
    } catch (err) {
      const error = err as ApiError;
      setError(error.message || 'Failed to update report');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [report]);

  const submitReport = useCallback(async (data: SubmitReportRequest): Promise<Report> => {
    if (!report) throw new Error('No report loaded');
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await agrireportsApi.submitReport(report.id, data);
      
      if (response.success && response.data) {
        setReport(response.data);
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to submit report');
      }
    } catch (err) {
      const error = err as ApiError;
      setError(error.message || 'Failed to submit report');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [report]);

  const reviewReportFn = useCallback(async (data: ReviewReportRequest): Promise<Report> => {
    if (!report) throw new Error('No report loaded');
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await agrireportsApi.reviewReport(report.id, data);
      
      if (response.success && response.data) {
        setReport(response.data);
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to review report');
      }
    } catch (err) {
      const error = err as ApiError;
      setError(error.message || 'Failed to review report');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [report]);

  const deleteReportFn = useCallback(async () => {
    if (!report) throw new Error('No report loaded');
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await agrireportsApi.deleteReport(report.id);
      
      if (response.success) {
        setReport(null);
      } else {
        throw new Error(response.message || 'Failed to delete report');
      }
    } catch (err) {
      const error = err as ApiError;
      setError(error.message || 'Failed to delete report');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [report]);

  const clearReport = useCallback(() => {
    setReport(null);
    setError(null);
  }, []);

  return {
    report,
    isLoading,
    error,
    fetchReport,
    updateReport,
    submitReport,
    reviewReport: reviewReportFn,
    deleteReport: deleteReportFn,
    clearReport,
  };
}

// ============================================================
// Create Report Hook
// ============================================================

export interface UseCreateReportResult {
  isCreating: boolean;
  error: string | null;
  createReport: (data: CreateReportRequest) => Promise<Report>;
}

export function useCreateReport(): UseCreateReportResult {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createReport = useCallback(async (data: CreateReportRequest): Promise<Report> => {
    setIsCreating(true);
    setError(null);
    
    try {
      const response = await agrireportsApi.createReport(data);
      
      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to create report');
      }
    } catch (err) {
      const error = err as ApiError;
      setError(error.message || 'Failed to create report');
      throw err;
    } finally {
      setIsCreating(false);
    }
  }, []);

  return {
    isCreating,
    error,
    createReport,
  };
}
