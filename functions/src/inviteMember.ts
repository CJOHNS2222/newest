import {onCall, HttpsError} from "firebase-functions/v2/https";
import {sendEmail} from "./helpers/sendEmail";

export const inviteMember = onCall(async (request) => {
  const {email, householdId} = request.data;

  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "You must be logged in to invite members."
    );
  }

  // TODO: Add logic to save the invitation to Firestore.

  const subject = "You're invited to join a household!";
  const body = `
        <p>You've been invited to join a household.</p>
        <p>Click the link below to accept the invitation:</p>
        <a href="https://your-app-url/household/${householdId}/join">Join Household</a>
    `;

  await sendEmail(email, subject, body);

  return {success: true};
});
