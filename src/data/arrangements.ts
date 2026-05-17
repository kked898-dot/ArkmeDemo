export type ArrangementTimeType = 'deadline' | 'timerange' | 'reminder' | 'none';

export type ArrangementStatus = 'pending' | 'snoozed' | 'done' | 'auto_done';

export type ArrangementSource = 'manual' | 'self_message' | 'private_chat' | 'group_chat';

export type ArrangementExecutor = 'user_only' | 'ai_assist' | 'ai_full';

export interface ArrangementContext {
  id: string;
  sourceType: ArrangementSource;
  sourceLabel: string;
  snippet: string;
  timestamp: number;
  conversationId?: string;
  messageId?: string;
}

export interface Arrangement {
  id: string;
  title: string;
  note?: string;
  mood?: string;
  timeType: ArrangementTimeType;
  startTime?: number;
  endTime?: number;
  remindAt?: number;
  isRecurring: boolean;
  location?: string;
  relatedPeople: string[];
  status: ArrangementStatus;
  source: ArrangementSource;
  executor: ArrangementExecutor;
  contexts: ArrangementContext[];
  mergedFromIds: string[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'arrangements';

export function getArrangements(): Arrangement[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = window.localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to parse arrangements from localStorage:', error);
    return [];
  }
}

export function saveArrangements(list: Arrangement[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (error) {
    console.error('Failed to save arrangements to localStorage:', error);
  }
}

export function createArrangement(partial: Partial<Arrangement>): Arrangement {
  const now = Date.now();
  const id = `arr_${now}_${Math.random().toString(36).substring(2, 9)}`;
  
  const newArrangement: Arrangement = {
    id,
    title: partial.title || '无标题安排',
    note: partial.note,
    mood: partial.mood,
    timeType: partial.timeType || 'none',
    startTime: partial.startTime,
    endTime: partial.endTime,
    remindAt: partial.remindAt,
    isRecurring: partial.isRecurring || false,
    location: partial.location,
    relatedPeople: partial.relatedPeople || [],
    status: partial.status || 'pending',
    source: partial.source || 'manual',
    executor: partial.executor || 'user_only',
    contexts: partial.contexts || [],
    mergedFromIds: partial.mergedFromIds || [],
    createdAt: now,
    updatedAt: now,
  };

  return newArrangement;
}

export function updateArrangement(id: string, changes: Partial<Arrangement>): void {
  const list = getArrangements();
  const index = list.findIndex(arr => arr.id === id);
  
  if (index !== -1) {
    list[index] = {
      ...list[index],
      ...changes,
      updatedAt: Date.now(),
    };
    saveArrangements(list);
  }
}

export function deleteArrangement(id: string): void {
  const list = getArrangements();
  const filteredList = list.filter(arr => arr.id !== id);
  saveArrangements(filteredList);
}

export function isOverdue(arrangement: Arrangement): boolean {
  if (arrangement.status !== 'pending') return false;
  
  const now = Date.now();
  if (arrangement.endTime && arrangement.endTime < now) {
    return true;
  }
  if (arrangement.startTime && !arrangement.endTime && arrangement.startTime < now) {
    return true;
  }
  
  return false;
}

export function getDaysOverdue(arrangement: Arrangement): number {
  if (!isOverdue(arrangement)) return 0;
  
  const now = Date.now();
  const targetTime = arrangement.endTime || arrangement.startTime;
  
  if (!targetTime) return 0;
  
  const diffTime = now - targetTime;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}
