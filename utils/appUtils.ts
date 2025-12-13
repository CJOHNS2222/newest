import { doc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { DayPlan } from '../types';

export async function saveDayPlan(householdId: string, day: DayPlan) {
  const id = day.date; // 'YYYY-MM-DD'
  const ref = doc(db, 'households', householdId, 'mealPlan', id);
  await ref.set({
    date: Timestamp.fromDate(new Date(day.date)),
    meals: day.meals || [],
    lastModifiedBy: localStorage.getItem('clientId') || null,
    lastModifiedAt: serverTimestamp()
  }, { merge: true });
}

export function next7DateKeys(start = new Date()) {
  const keys: string[] = [];
  const d = new Date(start);
  d.setHours(0,0,0,0);
  for (let i = 0; i < 7; i++) {
    const k = d.toISOString().slice(0,10); // 'YYYY-MM-DD'
    keys.push(k);
    d.setDate(d.getDate() + 1);
  }
  return keys;
}

export function isHouseholdMember(h: any, u: any) {
  if (!h || !u) return false;
  if (Array.isArray(h.memberIds) && h.memberIds.includes(u.id)) return true;
  if (Array.isArray(h.members)) {
    return h.members.some((m: any) => (m.id && m.id === u.id) || (m.email && m.email === u.email));
  }
  return false;
}