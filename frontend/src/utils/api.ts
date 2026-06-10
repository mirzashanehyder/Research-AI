import axios from 'axios';
import { getToken, logout } from './auth';

// ------------------------------------------------------------------ //
// Types                                                                //
// ------------------------------------------------------------------ //

export interface RegisterPayload { name: string; email: string; password: string }
export interface LoginPayload    { email: string; password: string }
export interface TokenResponse   { access_token: string; token_type: string; role: string }

export interface Workspace {
  id: number; user_id: number; name: string;
  description: string | null; created_at: string; paper_count: number;
}
export interface WorkspaceCreate { name: string; description?: string }
export interface WorkspaceUpdate { name?: string; description?: string }

export interface PaperResult {
  title: string; authors: string[]; abstract: string;
  publication_date: string; source_website: string;
  source_type: string; url: string; doi?: string;
}
export interface Paper {
  id: number; workspace_id: number; title: string; authors: string[];
  abstract: string | null; url: string | null; doi: string | null;
  publication_date: string | null; source_website: string | null;
  source_type: string | null; created_at: string;
}
export interface PaperImport {
  workspace_id: number; title: string; authors: string[];
  abstract?: string; url?: string; doi?: string;
  publication_date?: string; source_website?: string; source_type?: string;
}

export interface SearchResponse {
  results: PaperResult[]; total: number; sources_used: string[]; query: string;
}

export interface ChatRequest  { workspace_id: number; message: string }
export interface Citation     { paper_title: string; authors: string[]; source_website: string; retrieval_method: string; url?: string }
export interface ChatResponse { response: string; citations: Citation[]; workspace_id: number }
export interface ConversationEntry {
  id: number; workspace_id: number; user_message: string; ai_response: string; timestamp: string;
}

export interface Document {
  id: number; workspace_id: number; title: string;
  content: string | null; type: string; created_at: string; updated_at: string;
}
export interface DocumentCreate { workspace_id: number; title: string; content?: string; type?: string }
export interface DocumentUpdate { title?: string; content?: string }

// ------------------------------------------------------------------ //
// Axios instance                                                       //
// ------------------------------------------------------------------ //

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) logout();
    return Promise.reject(err);
  }
);

// ------------------------------------------------------------------ //
// Auth                                                                 //
// ------------------------------------------------------------------ //

export interface UserProfile { id: number; name: string; email: string; role: string; created_at: string }
export interface UserUpdatePayload { name?: string; current_password?: string; new_password?: string }

export const apiRegister = (d: RegisterPayload) =>
  api.post<{ message: string; user_id: number }>('/auth/register', d);

export const apiLogin = (d: LoginPayload) =>
  api.post<TokenResponse>('/auth/login', d);

export const apiGetMe = () =>
  api.get<UserProfile>('/auth/me');

export const apiUpdateMe = (d: UserUpdatePayload) =>
  api.put<UserProfile>('/auth/me', d);

export const apiForgotPassword = (email: string) =>
  api.post<{ message: string }>('/auth/forgot-password', { email });

export const apiVerifyOtp = (d: { email: string; otp: string; new_password: string }) =>
  api.post<{ message: string }>('/auth/verify-otp', d);

// ------------------------------------------------------------------ //
// Workspaces                                                           //
// ------------------------------------------------------------------ //

export const apiGetWorkspaces = () =>
  api.get<Workspace[]>('/workspaces');

export const apiCreateWorkspace = (d: WorkspaceCreate) =>
  api.post<Workspace>('/workspaces', d);

export const apiUpdateWorkspace = (id: number, d: WorkspaceUpdate) =>
  api.put<Workspace>(`/workspaces/${id}`, d);

export const apiDeleteWorkspace = (id: number) =>
  api.delete(`/workspaces/${id}`);

// ------------------------------------------------------------------ //
// Search                                                               //
// ------------------------------------------------------------------ //

export const apiSearch = (q: string, workspace_id: number) =>
  api.get<SearchResponse>('/search', { params: { q, workspace_id } });

// ------------------------------------------------------------------ //
// Papers                                                               //
// ------------------------------------------------------------------ //

export const apiGetPapers = (workspace_id: number) =>
  api.get<Paper[]>('/papers', { params: { workspace_id } });

export const apiImportPaper = (d: PaperImport) =>
  api.post<Paper>('/import', d);

export const apiUploadPDF = (formData: FormData) =>
  api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const apiDeletePaper = (id: number) =>
  api.delete(`/papers/${id}`);

// ------------------------------------------------------------------ //
// Chat                                                                 //
// ------------------------------------------------------------------ //

export const apiChat = (d: ChatRequest) =>
  api.post<ChatResponse>('/chat', d);

export const apiGetHistory = (workspace_id: number) =>
  api.get<ConversationEntry[]>('/history', { params: { workspace_id } });

// ------------------------------------------------------------------ //
// AI Tools                                                             //
// ------------------------------------------------------------------ //

export const apiSummarize = (paper_ids: number[]) =>
  api.post<{ summary: string; paper_count: number; paper_titles: string[] }>('/summary', { paper_ids });

export const apiReview = (workspace_id: number, topic: string) =>
  api.post<{ review: string; workspace_id: number; topic: string }>('/review', { workspace_id, topic });

export const apiResearchGaps = (workspace_id: number) =>
  api.post<{ gaps: string; workspace_id: number }>('/research-gaps', { workspace_id });

export const apiCitations = (paper_id: number) =>
  api.post<{ paper_id: number; title: string; citations: Record<string, string> }>('/citations', { paper_id });

export const apiCompare = (paper_ids: number[]) =>
  api.post<{ comparison: string; paper_count: number; paper_titles: string[] }>('/compare', { paper_ids });

export const apiRecommend = (workspace_id: number) =>
  api.post<{ recommendations: string[]; workspace_id: number; count: number }>('/recommend', { workspace_id });

// ------------------------------------------------------------------ //
// Documents                                                            //
// ------------------------------------------------------------------ //

export const apiGetDocuments = (workspace_id: number) =>
  api.get<Document[]>('/documents', { params: { workspace_id } });

export const apiCreateDocument = (d: DocumentCreate) =>
  api.post<Document>('/documents', d);

export const apiUpdateDocument = (id: number, d: DocumentUpdate) =>
  api.put<Document>(`/documents/${id}`, d);

export const apiDeleteDocument = (id: number) =>
  api.delete(`/documents/${id}`);

export default api;
