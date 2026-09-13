import { apiClient } from '../api/apiClient';

export type EmailTemplateType = {
  type: string;
  variables: string[];
  subject: string;
  body: string;
};

export type EmailTemplate = Omit<EmailTemplateType, 'variables'> & {
  id: number;
  organization_id: number;
  created_at: string;
  updated_at: string;
};

export const getEmailTemplateTypes = () => apiClient<EmailTemplateType[]>('/email-templates/types');
export const getEmailTemplates = () => apiClient<EmailTemplate[]>('/email-templates');
export const createEmailTemplate = (payload: Pick<EmailTemplate, 'type' | 'subject' | 'body'>) =>
  apiClient<EmailTemplate>('/email-templates', { method: 'POST', body: JSON.stringify(payload) });
export const updateEmailTemplate = (id: number, payload: Pick<EmailTemplate, 'subject' | 'body'>) =>
  apiClient<EmailTemplate>(`/email-templates/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
export const deleteEmailTemplate = (id: number) =>
  apiClient<void>(`/email-templates/${id}`, { method: 'DELETE' });
