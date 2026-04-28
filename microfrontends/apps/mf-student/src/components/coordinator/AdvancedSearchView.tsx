/**
 * Advanced Search View Component
 * HU-008: Sistema de búsqueda avanzada de postulantes
 *
 * Features: 20+ filters, saved searches, export results, pagination
 */

import React, { useState, useEffect } from 'react';
import { searchClient } from '../../api/search.client';
import type {
  AdvancedSearchParams,
  SearchResult,
  SearchResponse,
  SavedSearch
} from '../../api/search.types';

export const AdvancedSearchView: React.FC = () => {
  const [searchParams, setSearchParams] = useState<AdvancedSearchParams>({
    page: 0,
    limit: 20,
    sortBy: 'created_at',
    sortOrder: 'DESC'
  });

  const [results, setResults] = useState<SearchResponse | null>(null);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSearchName, setSaveSearchName] = useState('');

  const filterOptions = searchClient.getFilterOptions();

  useEffect(() => {
    loadSavedSearches();
  }, []);

  const loadSavedSearches = () => {
    setSavedSearches(searchClient.getSavedSearches());
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await searchClient.advancedSearch(searchParams);
      setResults(response);
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message || 'Error al realizar la búsqueda');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSearch = async (query: string) => {
    setSearchParams({ ...searchParams, search: query, page: 0 });
  };

  const handleFilterChange = (key: keyof AdvancedSearchParams, value: any) => {
    setSearchParams({ ...searchParams, [key]: value, page: 0 });
  };

  const handleClearFilters = () => {
    setSearchParams({
      page: 0,
      limit: 20,
      sortBy: 'created_at',
      sortOrder: 'DESC'
    });
    setResults(null);
  };

  const handleSaveSearch = () => {
    if (!saveSearchName.trim()) {
      alert('Por favor ingrese un nombre para la búsqueda');
      return;
    }
    searchClient.saveSearch(saveSearchName, searchParams);
    setSaveSearchName('');
    loadSavedSearches();
  };

  const handleLoadSavedSearch = (search: SavedSearch) => {
    searchClient.useSavedSearch(search.id);
    setSearchParams(search.filters);
    loadSavedSearches();
  };

  const handleDeleteSavedSearch = (id: string) => {
    searchClient.deleteSavedSearch(id);
    loadSavedSearches();
  };

  const handleExport = async () => {
    try {
      const blob = await searchClient.exportSearchResults(searchParams);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `postulaciones_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert('Error al exportar: ' + err.message);
    }
  };

  const handlePageChange = (newPage: number) => {
    setSearchParams({ ...searchParams, page: newPage });
  };

  useEffect(() => {
    if (searchParams.search || Object.keys(searchParams).length > 4) {
      handleSearch();
    }
  }, [searchParams.page, searchParams.sortBy, searchParams.sortOrder]);

  const activeFiltersCount = Object.keys(searchParams).filter(
    key => !['page', 'limit', 'sortBy', 'sortOrder'].includes(key) && searchParams[key as keyof AdvancedSearchParams]
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Búsqueda Avanzada</h1>
        <p className="mt-2 text-sm text-gray-600">
          Busque postulantes con filtros avanzados
        </p>
      </div>

      {/* Quick Search */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Buscar por nombre o RUT..."
              value={searchParams.search || ''}
              onChange={(e) => handleQuickSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Filtros {activeFiltersCount > 0 && `(${activeFiltersCount})`}
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Filtros Avanzados</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                value={searchParams.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">Todos</option>
                {filterOptions.statuses.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Grade Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nivel</label>
              <select
                value={searchParams.gradeApplied || ''}
                onChange={(e) => handleFilterChange('gradeApplied', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">Todos</option>
                {filterOptions.grades.map(g => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>

            {/* Academic Year Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Año Académico</label>
              <select
                value={searchParams.academicYear || ''}
                onChange={(e) => handleFilterChange('academicYear', e.target.value ? parseInt(e.target.value) : undefined)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">Todos</option>
                {filterOptions.academicYears.map(y => (
                  <option key={y.value} value={y.value}>{y.label}</option>
                ))}
              </select>
            </div>

            {/* School Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Colegio</label>
              <select
                value={searchParams.schoolApplied || ''}
                onChange={(e) => handleFilterChange('schoolApplied', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">Todos</option>
                {filterOptions.schools.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Special Needs Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Necesidades Especiales</label>
              <select
                value={searchParams.hasSpecialNeeds === undefined ? '' : String(searchParams.hasSpecialNeeds)}
                onChange={(e) => handleFilterChange('hasSpecialNeeds', e.target.value === '' ? undefined : e.target.value === 'true')}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">Todos</option>
                <option value="true">Sí</option>
                <option value="false">No</option>
              </select>
            </div>

            {/* Documents Complete Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Documentos Completos</label>
              <select
                value={searchParams.documentsComplete === undefined ? '' : String(searchParams.documentsComplete)}
                onChange={(e) => handleFilterChange('documentsComplete', e.target.value === '' ? undefined : e.target.value === 'true')}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">Todos</option>
                <option value="true">Sí</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex justify-between">
            <button
              onClick={handleClearFilters}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Limpiar Filtros
            </button>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nombre para guardar búsqueda..."
                value={saveSearchName}
                onChange={(e) => setSaveSearchName(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
              <button
                onClick={handleSaveSearch}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Guardar Búsqueda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Searches */}
      {savedSearches.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-3">Búsquedas Guardadas</h2>
          <div className="flex flex-wrap gap-2">
            {savedSearches.map(search => (
              <div key={search.id} className="flex items-center bg-gray-100 rounded-md px-3 py-1">
                <button
                  onClick={() => handleLoadSavedSearch(search)}
                  className="text-sm text-blue-600 hover:text-blue-800 mr-2"
                >
                  {search.name}
                </button>
                <button
                  onClick={() => handleDeleteSavedSearch(search.id)}
                  className="text-gray-400 hover:text-red-600"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-medium text-gray-900">
                Resultados ({results.totalCount})
              </h2>
              <p className="text-sm text-gray-500">
                Página {results.page + 1} de {results.totalPages}
              </p>
            </div>
            <button
              onClick={handleExport}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exportar CSV
            </button>
          </div>

          {/* Results Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estudiante</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">RUT</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nivel</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Docs</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Puntaje</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.results.map((result) => (
                  <tr key={result.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{result.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {result.student_first_name} {result.student_paternal_last_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.student_rut}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.grade_applied}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        result.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                        result.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                        result.status === 'UNDER_REVIEW' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {result.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.document_count}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {result.avg_evaluation_score ? result.avg_evaluation_score.toFixed(1) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900">Ver</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {results.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <button
                onClick={() => handlePageChange(results.page - 1)}
                disabled={!results.hasPreviousPage}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <span className="text-sm text-gray-700">
                Página {results.page + 1} de {results.totalPages}
              </span>
              <button
                onClick={() => handlePageChange(results.page + 1)}
                disabled={!results.hasNextPage}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      )}

      {/* No Results */}
      {results && results.results.length === 0 && (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontraron resultados</h3>
          <p className="mt-1 text-sm text-gray-500">Intente con diferentes criterios de búsqueda</p>
        </div>
      )}
    </div>
  );
};

export default AdvancedSearchView;
