/**
 * Advanced Search API Client
 * Sistema de Admisión MTN - Port 8083 (Application Service)
 */

import httpClient from '../services/http';
import type {
  AdvancedSearchParams,
  SearchResult,
  SearchResponse,
  SavedSearch,
  SearchFilterOptions
} from './search.types';

class SearchClient {
  private readonly basePath = '/api/applications';
  private readonly storageKey = 'mtn_saved_searches';

  /**
   * Advanced search with all filters
   * Endpoint: GET /api/applications/search
   * Supports 20+ filters, pagination, and sorting
   */
  async advancedSearch(params: AdvancedSearchParams): Promise<SearchResponse> {
    const searchParams = { ...params };
    if (Array.isArray(searchParams.status)) {
      searchParams.status = searchParams.status.join(',');
    }

    const response = await httpClient.get<any>(
      `${this.basePath}/search`,
      { params: searchParams }
    );

    const raw = response.data;

    // BFF returns { success, data: Application[], count } — map to SearchResponse
    if (raw?.data !== undefined && !raw?.results) {
      const data: any[] = raw.data || [];
      const page = params.page ?? 0;
      const limit = params.limit ?? data.length;
      const total = raw.count ?? data.length;
      const totalPages = limit > 0 ? Math.ceil(total / limit) : 1;
      return {
        results: data as SearchResult[],
        totalCount: total,
        page,
        limit,
        totalPages,
        hasNextPage: page + 1 < totalPages,
        hasPreviousPage: page > 0
      };
    }

    return raw as SearchResponse;
  }

  /**
   * Quick search by name or RUT
   */
  async quickSearch(query: string, limit: number = 10): Promise<SearchResult[]> {
    const response = await this.advancedSearch({
      search: query,
      limit,
      page: 0
    });

    return response.results;
  }

  /**
   * Search by status
   */
  async searchByStatus(
    status: string | string[],
    params?: Omit<AdvancedSearchParams, 'status'>
  ): Promise<SearchResponse> {
    return this.advancedSearch({
      status,
      ...params
    });
  }

  /**
   * Search by grade
   */
  async searchByGrade(
    gradeApplied: string,
    params?: Omit<AdvancedSearchParams, 'gradeApplied'>
  ): Promise<SearchResponse> {
    return this.advancedSearch({
      gradeApplied,
      ...params
    });
  }

  /**
   * Search by academic year
   */
  async searchByAcademicYear(
    academicYear: number,
    params?: Omit<AdvancedSearchParams, 'academicYear'>
  ): Promise<SearchResponse> {
    return this.advancedSearch({
      academicYear,
      ...params
    });
  }

  /**
   * Search applications with special needs
   */
  async searchSpecialNeeds(
    params?: Omit<AdvancedSearchParams, 'hasSpecialNeeds'>
  ): Promise<SearchResponse> {
    return this.advancedSearch({
      hasSpecialNeeds: true,
      ...params
    });
  }

  /**
   * Search applications with incomplete documents
   */
  async searchIncompleteDocuments(
    params?: Omit<AdvancedSearchParams, 'documentsComplete'>
  ): Promise<SearchResponse> {
    return this.advancedSearch({
      documentsComplete: false,
      ...params
    });
  }

  /**
   * Search by evaluation score range
   */
  async searchByScoreRange(
    minScore: number,
    maxScore: number,
    params?: Omit<AdvancedSearchParams, 'minScore' | 'maxScore'>
  ): Promise<SearchResponse> {
    return this.advancedSearch({
      minScore,
      maxScore,
      ...params
    });
  }

  /**
   * Search by date range
   */
  async searchByDateRange(
    dateFrom: string,
    dateTo: string,
    params?: Omit<AdvancedSearchParams, 'submissionDateFrom' | 'submissionDateTo'>
  ): Promise<SearchResponse> {
    return this.advancedSearch({
      submissionDateFrom: dateFrom,
      submissionDateTo: dateTo,
      ...params
    });
  }

  /**
   * Export search results to CSV
   */
  async exportSearchResults(params: AdvancedSearchParams): Promise<Blob> {
    const searchParams = { ...params };
    if (Array.isArray(searchParams.status)) {
      searchParams.status = searchParams.status.join(',');
    }

    const response = await httpClient.get(
      `${this.basePath}/export`,
      {
        params: searchParams,
        headers: { 'Accept': 'text/csv' },
        responseType: 'blob'
      }
    );

    return response.data as Blob;
  }

  /**
   * Get filter options with counts
   * (This would need a backend endpoint, for now returns static options)
   */
  getFilterOptions(): SearchFilterOptions {
    return {
      statuses: [
        { value: 'SUBMITTED', label: 'Enviada' },
        { value: 'UNDER_REVIEW', label: 'En Revisión' },
        { value: 'APPROVED', label: 'Aprobada' },
        { value: 'REJECTED', label: 'Rechazada' },
        { value: 'WAITLIST', label: 'Lista de Espera' },
        { value: 'WITHDRAWN', label: 'Retirada' },
        { value: 'ARCHIVED', label: 'Archivada' }
      ],
      grades: [
        { value: 'PK', label: 'Pre-Kinder' },
        { value: 'K', label: 'Kinder' },
        { value: '1st', label: '1° Básico' },
        { value: '2nd', label: '2° Básico' },
        { value: '3rd', label: '3° Básico' },
        { value: '4th', label: '4° Básico' },
        { value: '5th', label: '5° Básico' },
        { value: '6th', label: '6° Básico' },
        { value: '7th', label: '7° Básico' },
        { value: '8th', label: '8° Básico' },
        { value: '9th', label: '1° Medio' },
        { value: '10th', label: '2° Medio' },
        { value: '11th', label: '3° Medio' },
        { value: '12th', label: '4° Medio' }
      ],
      academicYears: [
        { value: 2024, label: '2024' },
        { value: 2025, label: '2025' },
        { value: 2026, label: '2026' }
      ],
      schools: [
        { value: 'MONTE_TABOR', label: 'Monte Tabor' },
        { value: 'NAZARET', label: 'Nazaret' }
      ],
      evaluationStatuses: [
        { value: 'PENDING', label: 'Pendiente' },
        { value: 'IN_PROGRESS', label: 'En Progreso' },
        { value: 'COMPLETED', label: 'Completada' }
      ]
    };
  }

  /**
   * Save search for later use (localStorage)
   */
  saveSearch(name: string, filters: AdvancedSearchParams): SavedSearch {
    const searches = this.getSavedSearches();
    const newSearch: SavedSearch = {
      id: `search_${Date.now()}`,
      name,
      filters,
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      useCount: 1
    };

    searches.push(newSearch);
    localStorage.setItem(this.storageKey, JSON.stringify(searches));

    return newSearch;
  }

  /**
   * Get all saved searches
   */
  getSavedSearches(): SavedSearch[] {
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : [];
  }

  /**
   * Delete saved search
   */
  deleteSavedSearch(id: string): void {
    const searches = this.getSavedSearches();
    const filtered = searches.filter(s => s.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(filtered));
  }

  /**
   * Use saved search (updates lastUsed and useCount)
   */
  useSavedSearch(id: string): SavedSearch | null {
    const searches = this.getSavedSearches();
    const search = searches.find(s => s.id === id);

    if (search) {
      search.lastUsed = new Date().toISOString();
      search.useCount += 1;
      localStorage.setItem(this.storageKey, JSON.stringify(searches));
    }

    return search || null;
  }

  /**
   * Clear all saved searches
   */
  clearSavedSearches(): void {
    localStorage.removeItem(this.storageKey);
  }
}

// Export singleton instance
export const searchClient = new SearchClient();
export default searchClient;
