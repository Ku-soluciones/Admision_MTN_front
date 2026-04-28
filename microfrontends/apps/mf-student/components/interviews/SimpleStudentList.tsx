import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { FiUser, FiSearch, FiRefreshCw, FiChevronRight } from 'react-icons/fi';
import { applicationService } from '../../services/applicationService';

interface Student {
  applicationId: number;
  name: string;
  grade: string;
  hasInterviews: boolean;
}

interface SimpleStudentListProps {
  onStudentSelect: (applicationId: number, studentName: string) => void;
  className?: string;
}

const SimpleStudentList: React.FC<SimpleStudentListProps> = ({
  onStudentSelect,
  className = ''
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    // Filtrar estudiantes basado en búsqueda
    if (searchTerm.trim() === '') {
      setFilteredStudents(students);
    } else {
      const filtered = students.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.grade.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredStudents(filtered);
    }
  }, [searchTerm, students]);

  const loadStudents = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const applications = await applicationService.getAllApplications();
      
      const studentList: Student[] = applications
        .filter(app => app.student) // Solo aplicaciones con estudiante
        .map(app => ({
          applicationId: app.id,
          name: `${app.student!.firstName} ${app.student!.lastName} ${app.student!.maternalLastName || ''}`.trim(),
          grade: app.student!.gradeApplied || 'Sin especificar',
          hasInterviews: false // Lo calcularemos después si es necesario
        }))
        .sort((a, b) => a.name.localeCompare(b.name)); // Ordenar alfabéticamente

      setStudents(studentList);
      setFilteredStudents(studentList);

    } catch (err: any) {
      console.error('Error loading students:', err);
      setError('Error al cargar la lista de estudiantes');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600">Cargando estudiantes...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={loadStudents} variant="outline">
          <FiRefreshCw className="w-4 h-4 mr-2" />
          Reintentar
        </Button>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header simple */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <FiUser className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">
            Estudiantes ({filteredStudents.length})
          </h2>
        </div>
        
        <Button onClick={loadStudents} variant="outline" size="sm">
          <FiRefreshCw className="w-4 h-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Buscador simple */}
      <Card className="p-4">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar estudiante o curso..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </Card>

      {/* Lista simple de estudiantes */}
      <Card className="overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FiUser className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>{searchTerm ? 'No se encontraron estudiantes' : 'No hay estudiantes registrados'}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredStudents.map((student) => (
              <button
                key={student.applicationId}
                onClick={() => onStudentSelect(student.applicationId, student.name)}
                className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors duration-150 focus:outline-none focus:bg-blue-50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {student.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {student.grade}
                    </p>
                  </div>
                  
                  <FiChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Info simple en el pie */}
      {filteredStudents.length > 0 && (
        <div className="text-center text-sm text-gray-500">
          Haz clic en cualquier estudiante para ver sus detalles y entrevistas
        </div>
      )}
    </div>
  );
};

export default SimpleStudentList;