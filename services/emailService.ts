/**
 * Email Service for sending household invitations
 * Uses Firebase Cloud Functions to send emails securely
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebaseConfig';

/**
 * Sends an invitation email to a household member via Firebase Cloud Function
 * @param inviteeEmail - Email of the person being invited
 * @param householdName - Name of the household/family group
 * @param inviterName - Name of the person sending the invite
 */
export const sendHouseholdInvitation = async (
  inviteeEmail: string,
  householdName: string,
  inviterName: string
): Promise<{ success: boolean; message: string }> => {
  try {
    // Call the Firebase Cloud Function
    const sendInvitation = httpsCallable(functions, 'sendHouseholdInvitation');

    const result = await sendInvitation({
      inviteeEmail,
      householdName,
      inviterName,
    });

    const data = result.data as any;
    return {
      success: true,
      message: data?.message || `Invitation sent to ${inviteeEmail}`,
    };
  } catch (error: any) {
    console.error('Failed to send invitation:', error);

    // Provide user-friendly error messages
    let message = 'Failed to send invitation email';

    if (error.code === 'functions/unauthenticated') {
      message = 'Please log in to send invitations';
    } else if (error.code === 'functions/invalid-argument') {
      message = error.message || 'Invalid invitation data';
    } else if (error.code === 'functions/internal') {
      message = 'Email service temporarily unavailable. Please try again later.';
    }

    return {
      success: false,
      message,
    };
  }
};
