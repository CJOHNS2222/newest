let admin;
try {
  admin = require('firebase-admin');
} catch (e) {
  // try loading from functions node_modules
  admin = require('../functions/node_modules/firebase-admin');
}

(async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node scripts/createHousehold.cjs <email>');
    process.exit(1);
  }

  try {
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    const auth = admin.auth();
    const db = admin.firestore();

    let uid = null;
    try {
      const user = await auth.getUserByEmail(email);
      uid = user.uid;
      console.log(`Resolved email to UID: ${uid}`);
    } catch (err) {
      console.warn('Could not resolve email to UID (user may not exist or insufficient permissions). Proceeding with email as identifier.');
    }

    const householdRef = db.collection('households').doc();
    const memberId = uid || email;
    const householdData = {
      name: 'Test Household',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      members: [
        { id: memberId, name: email.split('@')[0], email, role: 'Owner', status: 'Active' }
      ]
    };
    if (uid) householdData.memberIds = [uid];

    await householdRef.set(householdData);
    console.log('Created household', householdRef.id);
    process.exit(0);
  } catch (err) {
    console.error('Error creating household:', err);
    process.exit(2);
  }
})();
