
import {onCall, onRequest, HttpsError} from "firebase-functions/v2/https";
import admin from 'firebase-admin';
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import { getAuth } from 'firebase-admin/auth';

// Ensure the Admin SDK is initialized
if (!admin.apps?.length) {
  admin.initializeApp();
}

// Core invite logic as a function so it can be used by both callable and HTTP handlers
async function inviteMemberCore(inviterUid: string, email: string, householdId: string) {
  const db = getFirestore();

  const householdRef = db.collection("households").doc(householdId);
  const householdDoc = await householdRef.get();
  if (!householdDoc.exists) {
    throw new HttpsError("not-found", "The specified household does not exist.");
  }
  const members = householdDoc.data()?.members || [];
  if (!members.some((member: { id: string; }) => member.id === inviterUid)) {
    throw new HttpsError("permission-denied", "You are not a member of this household.");
  }

  let memberIdToStore = email;
  try {
    const auth = getAuth();
    const userRecord = await auth.getUserByEmail(email).catch(() => null);
    if (userRecord && userRecord.uid) memberIdToStore = userRecord.uid;
  } catch (err) {
    console.warn('Unable to resolve invited email to UID:', err);
  }

  const newMember = { id: memberIdToStore, name: email.split('@')[0], email, role: 'Member', status: 'Active' };
  const updatePayload: any = { members: FieldValue.arrayUnion(newMember) };
  if (memberIdToStore && memberIdToStore !== email) updatePayload.memberIds = FieldValue.arrayUnion(memberIdToStore);
  await householdRef.update(updatePayload);

  const notificationsRef = db.collection('notifications');
  await notificationsRef.add({ email, type: 'household_invite', householdId, message: `You've been added to a household (${householdId}).`, timestamp: FieldValue.serverTimestamp(), read: false });

  return { success: true, newMember };
}

export const inviteMember = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'You must be logged in to invite members.');
  const inviterUid = request.auth.uid;
  const { email, householdId } = request.data;
  if (!email || !householdId) throw new HttpsError('invalid-argument', 'Email and householdId are required.');
  return await inviteMemberCore(inviterUid, email, householdId);
});

// HTTP wrapper with CORS for environments where callable fails (dev fallback)
export const inviteMemberHttp = onRequest(async (req, res) => {
  // Basic CORS handling
  res.set('Access-Control-Allow-Origin', req.get('origin') || '*');
  res.set('Access-Control-Allow-Credentials', 'true');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(204).send();
    return;
  }
  try {
    const authHeader = req.headers.authorization;
    const idToken = (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) ? authHeader.split('Bearer ')[1] : (typeof req.query?.idToken === 'string' ? req.query.idToken : undefined);
    if (!idToken) { res.status(401).json({ error: 'Missing auth token' }); return; }
    const auth = getAuth();
    const decoded = await auth.verifyIdToken(idToken).catch(() => null);
    if (!decoded) { res.status(401).json({ error: 'Invalid auth token' }); return; }
    const inviterUid = decoded.uid;
    const { email, householdId } = (req.body && Object.keys(req.body).length) ? req.body : req.query;
    if (!email || !householdId) { res.status(400).json({ error: 'email and householdId required' }); return; }
    await inviteMemberCore(inviterUid, email as string, householdId as string);
    res.json({ success: true });
    return;
  } catch (err: any) {
    console.error('inviteMemberHttp error:', err);
    res.status(500).json({ error: err?.message || 'internal' });
    return;
  }
});

