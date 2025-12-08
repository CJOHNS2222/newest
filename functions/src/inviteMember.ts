
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {sendEmail} from "./helpers/sendEmail";
import {getFirestore, FieldValue} from "firebase-admin/firestore";

export const inviteMember = onCall(async (request) => {
  // Initialize Firestore Admin SDK (lazy initialization)
  const db = getFirestore();
  
  // 1. Check if the user is authenticated
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "You must be logged in to invite members."
    );
  }
  const inviterUid = request.auth.uid;
  const {email, householdId} = request.data;

  // 2. Validate incoming data
  if (!email || !householdId) {
    throw new HttpsError("invalid-argument", "Email and householdId are required.");
  }

  const householdRef = db.collection("households").doc(householdId);
  const householdDoc = await householdRef.get();

  // 3. Verify that the household exists and the person inviting is a member
  if (!householdDoc.exists) {
    throw new HttpsError("not-found", "The specified household does not exist.");
  }
  const members = householdDoc.data()?.members || [];
  if (!members.some((member: { id: string; }) => member.id === inviterUid)) {
    throw new HttpsError("permission-denied", "You are not a member of this household.");
  }

  // 4. Create the new member object with a 'Pending' status
  const newMember = {
    id: `pending-${Date.now()}`, // A temporary, unique ID for pending status
    name: email.split('@')[0], // Use email prefix as a placeholder name
    email: email,
    role: 'Member',
    status: 'Pending Invitation'
  };

  // 5. Securely add the new member to the household's member list
  await householdRef.update({
    members: FieldValue.arrayUnion(newMember)
  });

  // 6. Send the invitation email
  const subject = "You're invited to join a household!";
  const body = `
        <p>You've been invited to join a household.</p>
        <p>Click the link below to accept the invitation:</p>
        <a href="https://your-app-url/household/${householdId}/join">Join Household</a>
    `;
  await sendEmail(email, subject, body);

  // 7. Return success and the new member data to the client
  return {success: true, newMember};
});
