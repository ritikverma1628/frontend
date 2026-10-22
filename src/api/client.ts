import type { Analysis, Message, Pattern, Session, User } from '../types'

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'
export const mockMode = import.meta.env.VITE_USE_MOCK_API !== 'false'
let accessToken: string | undefined
export const clearAuth = () => { accessToken = undefined }
const key = 'cognitrace.demo.sessions'
const readSessions = (): Session[] => {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as Session[] : seedSessions }
  catch { return seedSessions }
}
const persist = (value: Session[]) => localStorage.setItem(key, JSON.stringify(value))
const seedSessions: Session[] = [
  { id: 's-101', title: 'Choosing a project direction', topic: 'Product decisions', date: 'Today · 10:24 AM', status: 'completed', duration: '18 min', messages: [{ id: 'm1', role: 'user', content: 'I’m deciding between polishing the current prototype and starting a more ambitious version. The deadline is three weeks away.', createdAt: '10:24 AM' }, { id: 'm2', role: 'assistant', content: 'What would make the current prototype feel ready enough to share? It may help to separate the smallest useful improvement from the bigger idea.', createdAt: '10:24 AM' }, { id: 'm3', role: 'user', content: 'The core flow works. I keep thinking a new version would avoid some compromises, but I have not asked anyone to try the existing one.', createdAt: '10:27 AM' }, { id: 'm4', role: 'assistant', content: 'You have two open questions: what users need next, and what the new version would truly unlock. A small test of the current flow could give you evidence for both.', createdAt: '10:28 AM' }] },
  { id: 's-102', title: 'Planning a difficult conversation', topic: 'Communication', date: 'Yesterday · 4:12 PM', status: 'completed', duration: '12 min', messages: [] },
  { id: 's-103', title: 'Organizing a busy week', topic: 'Planning', date: 'Oct 19 · 9:05 AM', status: 'completed', duration: '9 min', messages: [] },
  { id: 's-104', title: 'Learning a new framework', topic: 'Learning', date: 'Oct 17 · 2:36 PM', status: 'completed', duration: '15 min', messages: [] },
]
const demoWait = () => new Promise(resolve => setTimeout(resolve, 380))
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, { ...init, credentials: 'include', headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...init?.headers } })
  if (!response.ok) { const detail = await response.text(); throw new Error(detail || `Request failed (${response.status})`) }
  return response.json() as Promise<T>
}
export const api = {
  async me(): Promise<User> { if (mockMode) { await demoWait(); return { id: 'u-demo', name: 'Alex Morgan', email: 'alex@example.com' } } return request('/auth/me') },
  async authenticate(email: string, password: string, name?: string): Promise<User> {
    if (!mockMode) {
      if (name) await request('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) })
      const token = await request<{ access_token: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
      accessToken = token.access_token
      return request('/auth/me')
    }
    await demoWait(); return { id: 'u-demo', name: name || (email.split('@')[0].replace(/[._-]/g,' ').replace(/\b\w/g, c=>c.toUpperCase()) || 'Alex Morgan'), email }
  },
  async sessions(): Promise<Session[]> { if (mockMode) { await demoWait(); return readSessions() } return request('/sessions') },
  async createSession(topic: string): Promise<Session> {
    if (!mockMode) return request('/sessions', { method: 'POST', body: JSON.stringify({ title: topic }) })
    const session: Session = { id: crypto.randomUUID(), title: topic, topic: 'Reflection', date: 'Just now', status: 'in_progress', duration: 'New', messages: [] }
    persist([session, ...readSessions()]); await demoWait(); return session
  },
  async sendMessage(sessionId: string, content: string): Promise<Message[]> {
    if (!mockMode) return request(`/sessions/${sessionId}/messages`, { method: 'POST', body: JSON.stringify({ content }) })
    const current = readSessions(), session = current.find(item => item.id === sessionId)
    if (!session) throw new Error('This session could not be found.')
    const user: Message = { id: crypto.randomUUID(), role: 'user', content, createdAt: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) }
    session.messages.push(user); persist(current); await demoWait()
    const reply: Message = { id: crypto.randomUUID(), role: 'assistant', content: 'Thanks for laying that out. What feels like the most important constraint to keep in view as you consider your options?', createdAt: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) }
    session.messages.push(reply); persist(current); return [...session.messages]
  },
  async completeSession(sessionId: string): Promise<void> {
    if (!mockMode) { await request(`/sessions/${sessionId}/complete`, { method: 'POST' }); return }
    const current = readSessions(); const session = current.find(item => item.id === sessionId)
    if (session) session.status = 'completed'; persist(current); await demoWait()
  },
  async deleteSession(id: string): Promise<void> { if (!mockMode) { await request(`/sessions/${id}`, { method: 'DELETE' }); return } persist(readSessions().filter(session => session.id !== id)); await demoWait() },
  async analysis(sessionId: string): Promise<Analysis> { if (!mockMode) return request(`/analysis/${sessionId}`); await demoWait(); return { summary: 'You weighed a near-term test against a larger rebuild. Your reflection highlighted that the current flow has not yet been tried by users, leaving a useful source of evidence unexplored.', traces: [{ type: 'Decision point', content: 'Considered polishing the current prototype versus starting a new version.', evidence: 'Choosing a project direction · 10:24 AM' }, { type: 'Open question', content: 'Whether user feedback would change the direction or scope of the work.', evidence: 'Choosing a project direction · 10:27 AM' }], reflection: 'What is the smallest test that could help you choose with more confidence?' } },
  async patterns(): Promise<Pattern[]> { if (!mockMode) return request('/patterns'); await demoWait(); return [{ id: 'p1', title: 'Testing assumptions with a small first step', description: 'In several sessions, you explored a lightweight way to gather information before committing to a larger plan.', confidence: .72, sessions: 3, evidence: ['Choosing a project direction', 'Organizing a busy week', 'Learning a new framework'] }, { id: 'p2', title: 'Making trade-offs explicit', description: 'You often compare options by naming the time, effort, or coordination each would require.', confidence: .64, sessions: 2, evidence: ['Choosing a project direction', 'Planning a difficult conversation'] }] },
  async recommendations(): Promise<string[]> { if (!mockMode) { const result = await request<{ content: string }[]>('/recommendations'); return result.map(item => item.content) } await demoWait(); return ['Before your next decision, write down one assumption you could check this week.', 'Try a 15-minute “first test” before expanding the scope of a project.', 'After a decision, note what evidence would make you revisit it.'] },
  async feedback(targetId: string, value: 'helpful' | 'not_helpful'): Promise<void> { if (!mockMode) await request('/feedback', { method: 'POST', body: JSON.stringify({ target_id: targetId, value }) }); else await demoWait() },
}
