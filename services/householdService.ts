/**
 * Household Service for Firebase operations
 * Manages household creation, member management, and household lookup
 */

import {
  doc,
  collection,
  query,
  where,
  getDocs,
  setDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Household, Member, User } from '../types';

/**
 * Get or create a household for a user
 * If user has been invited to a household, fetch that
 * If user is creating their own, create a new one
 */
export const getOrCreateHousehold = async (user: User): Promise<Household | null> => {
  try {
    // First, check if user belongs to any existing household
    const householdQuery = query(
      collection(db, 'households'),
      where('members', 'array-contains', {
        email: user.email,
        id: user.id,
      })
    );

    const querySnapshot = await getDocs(householdQuery);

    if (!querySnapshot.empty) {
      // User is already in a household
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      } as Household;
    }

    // User is not in any household, create a new one
    const newHousehold = await createHousehold(
      `${user.name}'s Family`,
      user
    );

    return newHousehold;
  } catch (error) {
    console.error('Error getting/creating household:', error);
    return null;
  }
};

/**
 * Create a new household
 */
export const createHousehold = async (
  householdName: string,
  user: User
): Promise<Household> => {
  const householdId = `household_${Date.now()}`;

  const newHousehold: Household = {
    id: householdId,
    name: householdName,
    members: [
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: 'Admin',
        status: 'Active',
      },
    ],
  };

  await setDoc(doc(db, 'households', householdId), {
    ...newHousehold,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return newHousehold;
};

/**
 * Add a member to a household (when invited user joins)
 */
export const addMemberToHousehold = async (
  householdId: string,
  member: Member
): Promise<void> => {
  await updateDoc(doc(db, 'households', householdId), {
    members: arrayUnion(member),
    updatedAt: serverTimestamp(),
  });
};

/**
 * Update member status when they accept invitation
 */
export const updateMemberStatus = async (
  householdId: string,
  memberEmail: string,
  newStatus: 'Active' | 'Invited'
): Promise<void> => {
  try {
    const householdRef = doc(db, 'households', householdId);
    const householdSnap = await getDocs(
      query(collection(db, 'households'), where('id', '==', householdId))
    );

    if (householdSnap.empty) {
      throw new Error('Household not found');
    }

    const household = householdSnap.docs[0];
    const members = household.data().members || [];

    const updatedMembers = members.map((m: Member) =>
      m.email === memberEmail ? { ...m, status: newStatus } : m
    );

    await updateDoc(household.ref, {
      members: updatedMembers,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating member status:', error);
    throw error;
  }
};

/**
 * Find a household by invitation (user email and household ID from invite link)
 */
export const findHouseholdByInvite = async (
  householdId: string,
  inviteeEmail: string
): Promise<Household | null> => {
  try {
    const householdRef = doc(db, 'households', householdId);
    const householdSnap = await getDocs(
      query(collection(db, 'households'), where('id', '==', householdId))
    );

    if (householdSnap.empty) {
      return null;
    }

    const householdDoc = householdSnap.docs[0];
    const household = householdDoc.data() as Household;

    // Check if user is invited
    const isInvited = household.members?.some(
      (m: Member) => m.email === inviteeEmail && m.status === 'Invited'
    );

    return isInvited ? household : null;
  } catch (error) {
    console.error('Error finding household by invite:', error);
    return null;
  }
};

/**
 * Join a household (convert Invited status to Active)
 */
export const joinHousehold = async (
  householdId: string,
  user: User
): Promise<Household | null> => {
  try {
    // Check if user is invited
    const household = await findHouseholdByInvite(householdId, user.email);

    if (!household) {
      throw new Error('You are not invited to this household');
    }

    // Update status to Active
    await updateMemberStatus(householdId, user.email, 'Active');

    // Update user's ID in household if different
    const householdRef = doc(db, 'households', householdId);
    const householdSnap = await getDocs(
      query(collection(db, 'households'), where('id', '==', householdId))
    );

    if (!householdSnap.empty) {
      const members = householdSnap.docs[0].data().members || [];
      const updatedMembers = members.map((m: Member) => {
        if (m.email === user.email) {
          return {
            ...m,
            id: user.id,
            name: user.name,
            status: 'Active',
          };
        }
        return m;
      });

      await updateDoc(householdSnap.docs[0].ref, {
        members: updatedMembers,
        updatedAt: serverTimestamp(),
      });
    }

    // Return updated household
    return {
      ...household,
      members: household.members.map((m: Member) =>
        m.email === user.email ? { ...m, status: 'Active', id: user.id } : m
      ),
    };
  } catch (error) {
    console.error('Error joining household:', error);
    throw error;
  }
};

/**
 * Get all households a user belongs to (admin of or is a member of)
 */
export const getUserHouseholds = async (userEmail: string): Promise<Household[]> => {
  try {
    const householdQuery = query(
      collection(db, 'households'),
      where('members', 'array-contains', { email: userEmail })
    );

    const querySnapshot = await getDocs(householdQuery);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Household[];
  } catch (error) {
    console.error('Error getting user households:', error);
    return [];
  }
};
