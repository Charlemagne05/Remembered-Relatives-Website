// Centralized API client — all calls go through here

export interface StoryImage {
  id: number;
  image_path: string;
}

export interface Memorial {
  id: number;
  user_id: number;
  title: string;        // nom de la personne décédée
  relationship: string; // ex: "Grand-mère", "Meilleur ami"
  content: string;      // le récit
  author: string;       // username de l'auteur
  image_path: string | null; // legacy (kept for compat)
  images: StoryImage[];      // photos multiples (max 15)
  is_public: number;
  created_at: string;
  likes: number;
  user_liked: boolean;
}

export interface Report {
  id: number;
  story_id: number;
  reported_by: number;
  reported_by_username: string;
  reason: string;
  created_at: string;
}

export interface ReportedStory extends Memorial {
  report_count: number;
  reports: Report[];
}

export interface Comment {
  id: number;
  story_id: number;
  user_id: number;
  username: string;
  content: string;
  created_at: string;
}

export interface AuthUser {
  id: number;
  username: string;
  is_admin: boolean;
  token: string;
}

function getToken(): string | null {
  const raw = localStorage.getItem('auth') || sessionStorage.getItem('auth');
  if (!raw) return null;
  try {
    return (JSON.parse(raw) as AuthUser).token;
  } catch {
    return null;
  }
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    const message = data.error || data.errors?.[0]?.msg || 'Erreur serveur';
    throw new Error(message);
  }
  return data as T;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function register(username: string, email: string, password: string): Promise<AuthUser> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  return handleResponse<AuthUser>(res);
}

export async function login(username: string, password: string): Promise<AuthUser> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return handleResponse<AuthUser>(res);
}

// ── Stories ───────────────────────────────────────────────────────────────────

export async function getStories(search?: string, sort?: 'likes' | 'date'): Promise<Memorial[]> {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (sort) params.set('sort', sort);
  const res = await fetch(`/api/stories?${params}`, { headers: authHeaders() });
  return handleResponse<Memorial[]>(res);
}

export async function getStory(id: number): Promise<Memorial> {
  const res = await fetch(`/api/stories/${id}`, { headers: authHeaders() });
  return handleResponse<Memorial>(res);
}

export async function createStory(data: {
  title: string;
  relationship: string;
  content: string;
  is_public?: number;
  images?: File[];
}): Promise<Memorial> {
  const form = new FormData();
  form.append('title', data.title);
  form.append('relationship', data.relationship);
  form.append('content', data.content);
  form.append('is_public', String(data.is_public ?? 1));
  if (data.images) data.images.forEach((img) => form.append('images', img));

  const res = await fetch('/api/stories', {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  return handleResponse<Memorial>(res);
}

export async function updateStory(
  id: number,
  data: { title?: string; relationship?: string; content?: string; is_public?: number }
): Promise<Memorial> {
  const res = await fetch(`/api/stories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  return handleResponse<Memorial>(res);
}

export async function deleteStory(id: number): Promise<void> {
  const res = await fetch(`/api/stories/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handleResponse<void>(res);
}

export async function toggleLike(id: number): Promise<{ liked: boolean; likes: number }> {
  const res = await fetch(`/api/stories/${id}/like`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return handleResponse<{ liked: boolean; likes: number }>(res);
}

export async function getUserStories(userId: number): Promise<Memorial[]> {
  const res = await fetch(`/api/stories/user/${userId}`, { headers: authHeaders() });
  return handleResponse<Memorial[]>(res);
}

// ── Story images ──────────────────────────────────────────────────────────────

export async function addStoryImages(storyId: number, files: File[]): Promise<{ images: StoryImage[] }> {
  const form = new FormData();
  files.forEach((f) => form.append('images', f));
  const res = await fetch(`/api/stories/${storyId}/images`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  return handleResponse<{ images: StoryImage[] }>(res);
}

export async function deleteStoryImage(storyId: number, imageId: number): Promise<void> {
  const res = await fetch(`/api/stories/${storyId}/images/${imageId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handleResponse<void>(res);
}

// ── Reports ───────────────────────────────────────────────────────────────────

export async function reportStory(id: number, reason: string): Promise<void> {
  const res = await fetch(`/api/stories/${id}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ reason }),
  });
  return handleResponse<void>(res);
}

export async function getAdminReports(): Promise<ReportedStory[]> {
  const res = await fetch('/api/admin/reports', { headers: authHeaders() });
  return handleResponse<ReportedStory[]>(res);
}

export async function dismissReports(storyId: number): Promise<void> {
  const res = await fetch(`/api/admin/reports/${storyId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handleResponse<void>(res);
}

// ── Comments ──────────────────────────────────────────────────────────────────

export async function getComments(storyId: number): Promise<Comment[]> {
  const res = await fetch(`/api/stories/${storyId}/comments`, { headers: authHeaders() });
  return handleResponse<Comment[]>(res);
}

export async function postComment(storyId: number, content: string): Promise<Comment> {
  const res = await fetch(`/api/stories/${storyId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ content }),
  });
  return handleResponse<Comment>(res);
}

export async function deleteComment(storyId: number, commentId: number): Promise<void> {
  const res = await fetch(`/api/stories/${storyId}/comments/${commentId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handleResponse<void>(res);
}

// ── Banned Words ──────────────────────────────────────────────────────────────

export interface BannedWord {
  id: number;
  word: string;
}

export async function getBannedWords(): Promise<BannedWord[]> {
  const res = await fetch('/api/admin/banned-words', { headers: authHeaders() });
  return handleResponse<BannedWord[]>(res);
}

export async function addBannedWord(word: string): Promise<BannedWord> {
  const res = await fetch('/api/admin/banned-words', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ word }),
  });
  return handleResponse<BannedWord>(res);
}

export async function deleteBannedWord(id: number): Promise<void> {
  const res = await fetch(`/api/admin/banned-words/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handleResponse<void>(res);
}
