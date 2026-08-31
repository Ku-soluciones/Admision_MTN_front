export interface GuardianDocument {
  id: number | string;
  documentType?: string;
  document_type?: string;
  originalName?: string;
  original_name?: string;
  name?: string;
  uploadDate?: string;
  upload_date?: string;
  created_at?: string;
}

export interface GuardianApplicationDocumentsSource {
  id: number | string;
  student?: {
    firstName?: string;
    lastName?: string;
    fullName?: string;
  };
  documents?: unknown;
}

export interface GuardianDocumentGroup {
  applicationId: number | string;
  studentName: string;
  documents: GuardianDocument[];
  loadError: boolean;
}

type DocumentsLoader = (applicationId: number | string) => Promise<unknown>;

function readDocumentList(payload: unknown): GuardianDocument[] | null {
  if (Array.isArray(payload)) {
    return payload as GuardianDocument[];
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    const data = (payload as { data?: unknown }).data;
    return Array.isArray(data) ? data as GuardianDocument[] : null;
  }

  return null;
}

function getStudentName(application: GuardianApplicationDocumentsSource): string {
  const firstName = application.student?.firstName?.trim() || '';
  const lastName = application.student?.lastName?.trim() || '';
  const composedName = `${firstName} ${lastName}`.trim();

  return composedName || application.student?.fullName?.trim() || `Postulación #${application.id}`;
}

export async function loadGuardianDocumentGroups(
  applications: GuardianApplicationDocumentsSource[],
  loadDocuments: DocumentsLoader,
): Promise<GuardianDocumentGroup[]> {
  return Promise.all(applications.map(async application => {
    const fallbackDocuments = readDocumentList(application.documents) || [];
    const baseGroup = {
      applicationId: application.id,
      studentName: getStudentName(application),
    };

    try {
      const response = await loadDocuments(application.id);
      const documents = readDocumentList(response);

      if (documents === null) {
        return { ...baseGroup, documents: fallbackDocuments, loadError: true };
      }

      return { ...baseGroup, documents, loadError: false };
    } catch {
      return { ...baseGroup, documents: fallbackDocuments, loadError: true };
    }
  }));
}

export function formatGuardianDocumentDate(value?: string): string {
  if (!value) return 'Fecha no disponible';

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Fecha no disponible'
    : date.toLocaleDateString('es-CL');
}
