import { useCallback } from 'react';
import { downloadAuthenticatedUserDocument, getAuthenticatedUserDocuments } from '../../../api/authApi';
import type { ApiPaginated, ApiUserDocument } from '../../../services/ErpApiService';
import { UserDocumentsPanel } from '../members/UserDocumentsPanel';

function unwrapList(payload: ApiPaginated<ApiUserDocument> | ApiUserDocument[]) {
  return Array.isArray(payload) ? payload : payload.data ?? [];
}

export function ProfileDocumentsPage({ childId }: { childId?: number } = {}) {
  const fetchDocuments = useCallback(async () => unwrapList(await getAuthenticatedUserDocuments(childId)), [childId]);
  const downloadDocument = useCallback((documentId: number) => downloadAuthenticatedUserDocument(documentId, childId), [childId]);

  return (
    <UserDocumentsPanel
      canUpload={false}
      canDelete={false}
      fetchDocuments={fetchDocuments}
      downloadDocumentOverride={downloadDocument}
    />
  );
}
