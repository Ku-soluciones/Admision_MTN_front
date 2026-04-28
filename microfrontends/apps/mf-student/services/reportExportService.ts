// Servicio de Exportación de Reportes PDF/Excel para Entrevistas
import * as XLSX from 'xlsx';
import { Interview, InterviewStats, INTERVIEW_STATUS_LABELS, INTERVIEW_TYPE_LABELS, INTERVIEW_MODE_LABELS, INTERVIEW_RESULT_LABELS } from '../types/interview';

export interface ExportOptions {
  format: 'pdf' | 'excel';
  reportType: 'interviews' | 'statistics' | 'calendar' | 'performance';
  dateRange?: {
    start: string;
    end: string;
  };
  filters?: {
    status?: string[];
    type?: string[];
    interviewer?: string[];
  };
  includeCharts?: boolean;
  includeSummary?: boolean;
}

export interface ReportData {
  title: string;
  subtitle?: string;
  generatedAt: string;
  generatedBy: string;
  interviews?: Interview[];
  stats?: InterviewStats;
  summary?: ReportSummary;
}

export interface ReportSummary {
  totalInterviews: number;
  completionRate: number;
  averageScore: number;
  mostCommonIssues: string[];
  recommendations: string[];
  periodStart: string;
  periodEnd: string;
}

class ReportExportService {
  private collegeInfo = {
    name: 'Colegio Monte Tabor y Nazaret',
    address: 'Dirección del Colegio, Chile',
    phone: '+56 2 2345 6789',
    email: 'info@mtn.cl',
    logo: '/assets/logo-mtn.png'
  };

  // Exportar reporte de entrevistas a Excel
  async exportInterviewsToExcel(
    interviews: Interview[], 
    options: ExportOptions
  ): Promise<void> {
    const workbook = XLSX.utils.book_new();

    // Hoja principal con datos de entrevistas
    const interviewData = this.prepareInterviewDataForExcel(interviews);
    const interviewSheet = XLSX.utils.json_to_sheet(interviewData);
    
    // Configurar ancho de columnas
    const columnWidths = [
      { wch: 15 }, // ID
      { wch: 25 }, // Estudiante
      { wch: 25 }, // Padres
      { wch: 15 }, // Grado
      { wch: 20 }, // Entrevistador
      { wch: 15 }, // Estado
      { wch: 15 }, // Tipo
      { wch: 12 }, // Modalidad
      { wch: 12 }, // Fecha
      { wch: 10 }, // Hora
      { wch: 10 }, // Duración
      { wch: 25 }, // Ubicación
      { wch: 15 }, // Resultado
      { wch: 8 },  // Score
      { wch: 40 }  // Notas
    ];
    interviewSheet['!cols'] = columnWidths;

    XLSX.utils.book_append_sheet(workbook, interviewSheet, 'Entrevistas');

    // Hoja de estadísticas
    if (options.includeSummary) {
      const statsData = this.prepareStatsForExcel(interviews);
      const statsSheet = XLSX.utils.json_to_sheet(statsData);
      XLSX.utils.book_append_sheet(workbook, statsSheet, 'Estadísticas');
    }

    // Hoja de análisis por estado
    const statusAnalysis = this.prepareStatusAnalysis(interviews);
    const statusSheet = XLSX.utils.json_to_sheet(statusAnalysis);
    XLSX.utils.book_append_sheet(workbook, statusSheet, 'Análisis por Estado');

    // Generar nombre de archivo
    const filename = this.generateFilename('entrevistas', options.format, options.dateRange);
    
    // Descargar archivo
    XLSX.writeFile(workbook, filename);
  }

  // Exportar estadísticas completas a Excel
  async exportStatsToExcel(stats: InterviewStats, options: ExportOptions): Promise<void> {
    const workbook = XLSX.utils.book_new();

    // Resumen general
    const summaryData = [
      { Métrica: 'Total de Entrevistas', Valor: stats.totalInterviews },
      { Métrica: 'Entrevistas Completadas', Valor: stats.completedInterviews },
      { Métrica: 'Entrevistas Pendientes', Valor: stats.pendingInterviews },
      { Métrica: 'Entrevistas Canceladas', Valor: stats.cancelledInterviews },
      { Métrica: 'No Asistieron', Valor: stats.noShowInterviews },
      { Métrica: 'Tasa de Finalización', Valor: `${stats.completionRate.toFixed(1)}%` },
      { Métrica: 'Tasa de Cancelación', Valor: `${stats.cancellationRate.toFixed(1)}%` },
      { Métrica: 'Puntuación Promedio', Valor: stats.averageScore.toFixed(2) },
      { Métrica: 'Resultados Positivos', Valor: stats.positiveResults },
      { Métrica: 'Resultados Negativos', Valor: stats.negativeResults }
    ];
    
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen General');

    // Distribución por estado
    const statusData = Object.entries(stats.statusDistribution).map(([status, count]) => ({
      Estado: INTERVIEW_STATUS_LABELS[status as keyof typeof INTERVIEW_STATUS_LABELS] || status,
      Cantidad: count,
      Porcentaje: `${((count / stats.totalInterviews) * 100).toFixed(1)}%`
    }));
    const statusSheet = XLSX.utils.json_to_sheet(statusData);
    XLSX.utils.book_append_sheet(workbook, statusSheet, 'Por Estado');

    // Distribución por tipo
    const typeData = Object.entries(stats.typeDistribution).map(([type, count]) => ({
      Tipo: INTERVIEW_TYPE_LABELS[type as keyof typeof INTERVIEW_TYPE_LABELS] || type,
      Cantidad: count,
      Porcentaje: `${((count / stats.totalInterviews) * 100).toFixed(1)}%`
    }));
    const typeSheet = XLSX.utils.json_to_sheet(typeData);
    XLSX.utils.book_append_sheet(workbook, typeSheet, 'Por Tipo');

    // Tendencias mensuales
    const trendsData = Object.entries(stats.monthlyTrends).map(([month, count]) => ({
      Mes: month,
      'Entrevistas Realizadas': count
    }));
    const trendsSheet = XLSX.utils.json_to_sheet(trendsData);
    XLSX.utils.book_append_sheet(workbook, trendsSheet, 'Tendencias Mensuales');

    const filename = this.generateFilename('estadisticas', options.format, options.dateRange);
    XLSX.writeFile(workbook, filename);
  }

  // Exportar calendario de entrevistas
  async exportCalendarToExcel(interviews: Interview[], options: ExportOptions): Promise<void> {
    const workbook = XLSX.utils.book_new();

    // Agrupar entrevistas por semana
    const weeklyData = this.groupInterviewsByWeek(interviews);
    
    weeklyData.forEach((week, index) => {
      const weekData = week.interviews.map(interview => ({
        Fecha: interview.scheduledDate,
        Hora: interview.scheduledTime,
        Estudiante: interview.studentName,
        Tipo: INTERVIEW_TYPE_LABELS[interview.type],
        Entrevistador: interview.interviewerName,
        Estado: INTERVIEW_STATUS_LABELS[interview.status],
        Modalidad: INTERVIEW_MODE_LABELS[interview.mode],
        Ubicación: interview.location || 'No especificada',
        Duración: `${interview.duration} min`
      }));

      const weekSheet = XLSX.utils.json_to_sheet(weekData);
      XLSX.utils.book_append_sheet(workbook, weekSheet, `Semana ${index + 1}`);
    });

    const filename = this.generateFilename('calendario', options.format, options.dateRange);
    XLSX.writeFile(workbook, filename);
  }

  // Exportar reporte de rendimiento
  async exportPerformanceToExcel(interviews: Interview[], options: ExportOptions): Promise<void> {
    const workbook = XLSX.utils.book_new();

    // Análisis de rendimiento por entrevistador
    const interviewerPerformance = this.analyzeInterviewerPerformance(interviews);
    const perfSheet = XLSX.utils.json_to_sheet(interviewerPerformance);
    XLSX.utils.book_append_sheet(workbook, perfSheet, 'Rendimiento Entrevistadores');

    // Análisis de tiempos de respuesta
    const responseTimeAnalysis = this.analyzeResponseTimes(interviews);
    const timeSheet = XLSX.utils.json_to_sheet(responseTimeAnalysis);
    XLSX.utils.book_append_sheet(workbook, timeSheet, 'Tiempos de Respuesta');

    // Análisis de satisfacción (basado en scores)
    const satisfactionAnalysis = this.analyzeSatisfaction(interviews);
    const satisfactionSheet = XLSX.utils.json_to_sheet(satisfactionAnalysis);
    XLSX.utils.book_append_sheet(workbook, satisfactionSheet, 'Análisis de Satisfacción');

    const filename = this.generateFilename('rendimiento', options.format, options.dateRange);
    XLSX.writeFile(workbook, filename);
  }

  // Generar reporte PDF usando HTML y CSS
  async exportToPDF(data: ReportData, options: ExportOptions): Promise<void> {
    // Para exportar PDF necesitaríamos una librería como jsPDF o html2pdf
    // Por ahora, generamos el HTML que se puede convertir a PDF
    const htmlContent = this.generatePDFHTML(data, options);
    
    // Crear blob y descargar
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = this.generateFilename(options.reportType, 'html', options.dateRange);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    // Mostrar instrucciones para PDF
    alert('Se ha descargado el archivo HTML. Para convertir a PDF:\n1. Abre el archivo en tu navegador\n2. Usa Ctrl+P (Cmd+P en Mac)\n3. Selecciona "Guardar como PDF"');
  }

  // Preparar datos de entrevistas para Excel
  private prepareInterviewDataForExcel(interviews: Interview[]) {
    return interviews.map(interview => ({
      ID: interview.id,
      Estudiante: interview.studentName,
      Padres: interview.parentNames,
      Grado: interview.gradeApplied,
      Entrevistador: interview.interviewerName,
      Estado: INTERVIEW_STATUS_LABELS[interview.status],
      Tipo: INTERVIEW_TYPE_LABELS[interview.type],
      Modalidad: INTERVIEW_MODE_LABELS[interview.mode],
      Fecha: interview.scheduledDate,
      Hora: interview.scheduledTime,
      'Duración (min)': interview.duration,
      Ubicación: interview.location || 'No especificada',
      'Enlace Virtual': interview.virtualMeetingLink || 'N/A',
      Resultado: interview.result ? INTERVIEW_RESULT_LABELS[interview.result] : 'Pendiente',
      Puntuación: interview.score || 'N/A',
      'Seguimiento Requerido': interview.followUpRequired ? 'Sí' : 'No',
      Notas: interview.notes || 'Sin notas',
      Recomendaciones: interview.recommendations || 'Sin recomendaciones',
      'Creado el': interview.createdAt ? new Date(interview.createdAt).toLocaleDateString('es-CL') : 'N/A',
      'Completado el': interview.completedAt ? new Date(interview.completedAt).toLocaleDateString('es-CL') : 'N/A'
    }));
  }

  // Preparar estadísticas para Excel
  private prepareStatsForExcel(interviews: Interview[]) {
    const statusCounts = interviews.reduce((acc, interview) => {
      acc[interview.status] = (acc[interview.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const typeCounts = interviews.reduce((acc, interview) => {
      acc[interview.type] = (acc[interview.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { Categoría: 'Resumen', Métrica: 'Total Entrevistas', Valor: interviews.length },
      { Categoría: 'Resumen', Métrica: 'Completadas', Valor: interviews.filter(i => i.status === 'COMPLETED').length },
      { Categoría: 'Resumen', Métrica: 'Pendientes', Valor: interviews.filter(i => i.status === 'PENDING' || i.status === 'SCHEDULED').length },
      ...Object.entries(statusCounts).map(([status, count]) => ({
        Categoría: 'Por Estado',
        Métrica: INTERVIEW_STATUS_LABELS[status as keyof typeof INTERVIEW_STATUS_LABELS] || status,
        Valor: count
      })),
      ...Object.entries(typeCounts).map(([type, count]) => ({
        Categoría: 'Por Tipo',
        Métrica: INTERVIEW_TYPE_LABELS[type as keyof typeof INTERVIEW_TYPE_LABELS] || type,
        Valor: count
      }))
    ];
  }

  // Análisis por estado
  private prepareStatusAnalysis(interviews: Interview[]) {
    const statusGroups = interviews.reduce((acc, interview) => {
      if (!acc[interview.status]) {
        acc[interview.status] = [];
      }
      acc[interview.status].push(interview);
      return acc;
    }, {} as Record<string, Interview[]>);

    return Object.entries(statusGroups).map(([status, interviews]) => {
      const avgScore = interviews
        .filter(i => i.score)
        .reduce((sum, i) => sum + (i.score || 0), 0) / interviews.filter(i => i.score).length;

      return {
        Estado: INTERVIEW_STATUS_LABELS[status as keyof typeof INTERVIEW_STATUS_LABELS] || status,
        Cantidad: interviews.length,
        'Puntuación Promedio': isNaN(avgScore) ? 'N/A' : avgScore.toFixed(2),
        'Seguimiento Requerido': interviews.filter(i => i.followUpRequired).length,
        'Con Resultado Positivo': interviews.filter(i => i.result === 'POSITIVE').length
      };
    });
  }

  // Agrupar entrevistas por semana
  private groupInterviewsByWeek(interviews: Interview[]) {
    const weeks: { startDate: string; endDate: string; interviews: Interview[] }[] = [];
    
    // Implementación básica - se puede mejorar
    const sortedInterviews = interviews.sort((a, b) => 
      new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    );

    let currentWeek: Interview[] = [];
    let weekStart = '';

    sortedInterviews.forEach(interview => {
      const interviewDate = new Date(interview.scheduledDate);
      const dayOfWeek = interviewDate.getDay();
      
      if (!weekStart || dayOfWeek === 1) { // Lunes o primera entrevista
        if (currentWeek.length > 0) {
          weeks.push({
            startDate: weekStart,
            endDate: currentWeek[currentWeek.length - 1].scheduledDate,
            interviews: [...currentWeek]
          });
        }
        currentWeek = [interview];
        weekStart = interview.scheduledDate;
      } else {
        currentWeek.push(interview);
      }
    });

    if (currentWeek.length > 0) {
      weeks.push({
        startDate: weekStart,
        endDate: currentWeek[currentWeek.length - 1].scheduledDate,
        interviews: currentWeek
      });
    }

    return weeks;
  }

  // Análisis de rendimiento por entrevistador
  private analyzeInterviewerPerformance(interviews: Interview[]) {
    const interviewerGroups = interviews.reduce((acc, interview) => {
      if (!acc[interview.interviewerId]) {
        acc[interview.interviewerId] = {
          name: interview.interviewerName,
          interviews: []
        };
      }
      acc[interview.interviewerId].interviews.push(interview);
      return acc;
    }, {} as Record<number, { name: string; interviews: Interview[] }>);

    return Object.values(interviewerGroups).map(group => {
      const interviews = group.interviews;
      const completed = interviews.filter(i => i.status === 'COMPLETED');
      const avgScore = completed
        .filter(i => i.score)
        .reduce((sum, i) => sum + (i.score || 0), 0) / completed.filter(i => i.score).length;

      return {
        Entrevistador: group.name,
        'Total Asignadas': interviews.length,
        'Completadas': completed.length,
        'Tasa Finalización': `${((completed.length / interviews.length) * 100).toFixed(1)}%`,
        'Puntuación Promedio': isNaN(avgScore) ? 'N/A' : avgScore.toFixed(2),
        'Canceladas': interviews.filter(i => i.status === 'CANCELLED').length,
        'No Asistieron': interviews.filter(i => i.status === 'NO_SHOW').length
      };
    });
  }

  // Análisis de tiempos de respuesta
  private analyzeResponseTimes(interviews: Interview[]) {
    return interviews
      .filter(i => i.createdAt && i.completedAt)
      .map(interview => {
        const created = new Date(interview.createdAt!);
        const completed = new Date(interview.completedAt!);
        const daysDiff = Math.ceil((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

        return {
          Estudiante: interview.studentName,
          'Fecha Creación': created.toLocaleDateString('es-CL'),
          'Fecha Completado': completed.toLocaleDateString('es-CL'),
          'Días Transcurridos': daysDiff,
          Entrevistador: interview.interviewerName,
          Resultado: interview.result ? INTERVIEW_RESULT_LABELS[interview.result] : 'N/A'
        };
      });
  }

  // Análisis de satisfacción basado en scores
  private analyzeSatisfaction(interviews: Interview[]) {
    const scoredInterviews = interviews.filter(i => i.score);
    
    const scoreRanges = {
      'Excelente (9-10)': scoredInterviews.filter(i => i.score! >= 9).length,
      'Bueno (7-8)': scoredInterviews.filter(i => i.score! >= 7 && i.score! < 9).length,
      'Regular (5-6)': scoredInterviews.filter(i => i.score! >= 5 && i.score! < 7).length,
      'Deficiente (1-4)': scoredInterviews.filter(i => i.score! < 5).length
    };

    return Object.entries(scoreRanges).map(([range, count]) => ({
      'Rango de Puntuación': range,
      Cantidad: count,
      Porcentaje: `${((count / scoredInterviews.length) * 100).toFixed(1)}%`
    }));
  }

  // Generar HTML para PDF
  private generatePDFHTML(data: ReportData, options: ExportOptions): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${data.title}</title>
    <style>
        @page { margin: 2cm; }
        body { 
            font-family: Arial, sans-serif; 
            line-height: 1.4; 
            color: #333;
            margin: 0;
            padding: 20px;
        }
        .header { 
            text-align: center; 
            border-bottom: 2px solid #2563eb; 
            padding-bottom: 20px; 
            margin-bottom: 30px;
        }
        .logo { width: 100px; height: auto; margin-bottom: 10px; }
        h1 { color: #2563eb; margin: 0; font-size: 24px; }
        h2 { color: #1e40af; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
        .info-item { background: #f8fafc; padding: 10px; border-radius: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px; }
        th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
        th { background-color: #f3f4f6; font-weight: bold; }
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
        .stat-card { background: #f8fafc; border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; text-align: center; }
        .stat-number { font-size: 24px; font-weight: bold; color: #2563eb; }
        .stat-label { color: #6b7280; font-size: 14px; }
        .footer { 
            margin-top: 40px; 
            padding-top: 20px; 
            border-top: 1px solid #e5e7eb; 
            text-align: center; 
            color: #6b7280; 
            font-size: 12px;
        }
        @media print {
            .page-break { page-break-before: always; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${this.collegeInfo.name}</h1>
        <h2>${data.title}</h2>
        ${data.subtitle ? `<p>${data.subtitle}</p>` : ''}
        <div class="info-grid">
            <div class="info-item">
                <strong>Generado:</strong> ${new Date(data.generatedAt).toLocaleString('es-CL')}
            </div>
            <div class="info-item">
                <strong>Generado por:</strong> ${data.generatedBy}
            </div>
        </div>
    </div>

    ${data.summary ? this.generateSummaryHTML(data.summary) : ''}
    ${data.stats ? this.generateStatsHTML(data.stats) : ''}
    ${data.interviews ? this.generateInterviewsTableHTML(data.interviews) : ''}

    <div class="footer">
        <p>${this.collegeInfo.name} - ${this.collegeInfo.address}</p>
        <p>Teléfono: ${this.collegeInfo.phone} | Email: ${this.collegeInfo.email}</p>
        <p>Reporte generado el ${new Date().toLocaleString('es-CL')}</p>
    </div>
</body>
</html>`;
  }

  private generateSummaryHTML(summary: ReportSummary): string {
    return `
    <div class="page-break">
        <h2>Resumen Ejecutivo</h2>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${summary.totalInterviews}</div>
                <div class="stat-label">Total Entrevistas</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${summary.completionRate.toFixed(1)}%</div>
                <div class="stat-label">Tasa Finalización</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${summary.averageScore.toFixed(1)}</div>
                <div class="stat-label">Puntuación Promedio</div>
            </div>
        </div>
        <div style="margin-top: 20px;">
            <h3>Período del Reporte</h3>
            <p><strong>Desde:</strong> ${new Date(summary.periodStart).toLocaleDateString('es-CL')} 
               <strong>Hasta:</strong> ${new Date(summary.periodEnd).toLocaleDateString('es-CL')}</p>
        </div>
    </div>`;
  }

  private generateStatsHTML(stats: InterviewStats): string {
    return `
    <div class="page-break">
        <h2>Estadísticas Detalladas</h2>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${stats.completedInterviews}</div>
                <div class="stat-label">Completadas</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.pendingInterviews}</div>
                <div class="stat-label">Pendientes</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.cancelledInterviews}</div>
                <div class="stat-label">Canceladas</div>
            </div>
        </div>
    </div>`;
  }

  private generateInterviewsTableHTML(interviews: Interview[]): string {
    const rows = interviews.slice(0, 50).map(interview => `
        <tr>
            <td>${interview.studentName}</td>
            <td>${interview.interviewerName}</td>
            <td>${INTERVIEW_STATUS_LABELS[interview.status]}</td>
            <td>${INTERVIEW_TYPE_LABELS[interview.type]}</td>
            <td>${new Date(interview.scheduledDate).toLocaleDateString('es-CL')}</td>
            <td>${interview.scheduledTime}</td>
            <td>${interview.result ? INTERVIEW_RESULT_LABELS[interview.result] : 'Pendiente'}</td>
            <td>${interview.score || 'N/A'}</td>
        </tr>
    `).join('');

    return `
    <div class="page-break">
        <h2>Listado de Entrevistas</h2>
        <table>
            <thead>
                <tr>
                    <th>Estudiante</th>
                    <th>Entrevistador</th>
                    <th>Estado</th>
                    <th>Tipo</th>
                    <th>Fecha</th>
                    <th>Hora</th>
                    <th>Resultado</th>
                    <th>Puntuación</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
        ${interviews.length > 50 ? `<p><em>Mostrando las primeras 50 entrevistas de ${interviews.length} totales.</em></p>` : ''}
    </div>`;
  }

  // Generar nombre de archivo
  private generateFilename(
    reportType: string, 
    format: string, 
    dateRange?: { start: string; end: string }
  ): string {
    const date = new Date().toISOString().split('T')[0];
    const rangeSuffix = dateRange ? 
      `_${dateRange.start}_${dateRange.end}` : 
      `_${date}`;
    
    return `reporte_${reportType}${rangeSuffix}.${format === 'pdf' ? 'html' : 'xlsx'}`;
  }
}

// Instancia singleton
export const reportExportService = new ReportExportService();

export default reportExportService;