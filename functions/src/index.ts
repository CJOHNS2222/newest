import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Configure your email service here
// Using Gmail with App Password (recommended for security)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

interface SendHouseholdInvitationRequest {
  inviteeEmail: string;
  householdName: string;
  inviterName: string;
}

/**
 * Cloud Function to send household invitations
 * Called from the frontend when a user invites someone to their household
 */
export const sendHouseholdInvitation = functions.https.onCall(
  async (data: SendHouseholdInvitationRequest, context) => {
    try {
      // Verify the user is authenticated
      if (!context.auth) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'User must be authenticated to send invitations'
        );
      }

      const { inviteeEmail, householdName, inviterName } = data;

      // Validate input
      if (!inviteeEmail || !householdName || !inviterName) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Missing required fields: inviteeEmail, householdName, inviterName'
        );
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(inviteeEmail)) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Invalid email address'
        );
      }

      // Get app URL from environment or use a default
      const appUrl = process.env.APP_URL || 'https://smartpantry.app';

      // Create invitation link with encoded email
      const inviteToken = Buffer.from(inviteeEmail).toString('base64');
      const inviteLink = `${appUrl}?invite=${inviteToken}`;

      // Send email
      const mailOptions = {
        from: `SmartPantry <${process.env.EMAIL_USER}>`,
        to: inviteeEmail,
        subject: `${inviterName} invited you to join "${householdName}" on SmartPantry`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #d97706;">You're Invited! 🎉</h2>
            <p>Hello ${escapeHtml(inviteeEmail.split('@')[0])},</p>
            <p><strong>${escapeHtml(inviterName)}</strong> invited you to join the household "<strong>${escapeHtml(householdName)}</strong>" on SmartPantry!</p>
            
            <p>SmartPantry helps families manage their shared pantry inventory, plan meals together, and find recipes based on what you have.</p>
            
            <p style="margin: 30px 0;">
              <a href="${inviteLink}" style="display: inline-block; padding: 12px 30px; background-color: #d97706; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Accept Invitation
              </a>
            </p>
            
            <p style="color: #666; font-size: 14px;">
              Or copy this link if the button doesn't work: <br/>
              <code style="background: #f3f4f6; padding: 10px; display: inline-block; margin-top: 5px; word-break: break-all;">
                ${inviteLink}
              </code>
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              SmartPantry • Making shared meal planning easier
            </p>
          </div>
        `,
        text: `
          Hi ${inviteeEmail.split('@')[0]},

          ${inviterName} invited you to join the household "${householdName}" on SmartPantry!

          SmartPantry helps families manage their shared pantry inventory, plan meals together, and find recipes based on what you have.

          Accept the invitation: ${inviteLink}

          Happy cooking!
          SmartPantry Team
        `,
      };

      // Send the email
      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', info.messageId);

      return {
        success: true,
        message: `Invitation sent to ${inviteeEmail}`,
        messageId: info.messageId,
      };
    } catch (error) {
      console.error('Error sending invitation email:', error);

      // Return appropriate error message
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        'internal',
        'Failed to send invitation email. Please try again later.'
      );
    }
  }
);

/**
 * HTTP endpoint alternative for sending invitations
 * Can be used if you prefer HTTP requests over callable functions
 */
export const sendHouseholdInvitationHttp = functions.https.onRequest(
  async (req, res) => {
    // Only allow POST requests
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    try {
      const { inviteeEmail, householdName, inviterName, idToken } = req.body;

      // Verify the ID token
      if (!idToken) {
        res.status(401).json({ error: 'Missing authentication token' });
        return;
      }

      try {
        await admin.auth().verifyIdToken(idToken);
      } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
      }

      // Validate input
      if (!inviteeEmail || !householdName || !inviterName) {
        res.status(400).json({
          error: 'Missing required fields: inviteeEmail, householdName, inviterName',
        });
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(inviteeEmail)) {
        res.status(400).json({ error: 'Invalid email address' });
        return;
      }

      // Get app URL from environment or use a default
      const appUrl = process.env.APP_URL || 'https://smartpantry.app';

      // Create invitation link
      const inviteToken = Buffer.from(inviteeEmail).toString('base64');
      const inviteLink = `${appUrl}?invite=${inviteToken}`;

      // Send email
      const mailOptions = {
        from: `SmartPantry <${process.env.EMAIL_USER}>`,
        to: inviteeEmail,
        subject: `${inviterName} invited you to join "${householdName}" on SmartPantry`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #d97706;">You're Invited! 🎉</h2>
            <p>Hello ${escapeHtml(inviteeEmail.split('@')[0])},</p>
            <p><strong>${escapeHtml(inviterName)}</strong> invited you to join the household "<strong>${escapeHtml(householdName)}</strong>" on SmartPantry!</p>
            
            <p>SmartPantry helps families manage their shared pantry inventory, plan meals together, and find recipes based on what you have.</p>
            
            <p style="margin: 30px 0;">
              <a href="${inviteLink}" style="display: inline-block; padding: 12px 30px; background-color: #d97706; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Accept Invitation
              </a>
            </p>
            
            <p style="color: #666; font-size: 14px;">
              Or copy this link if the button doesn't work: <br/>
              <code style="background: #f3f4f6; padding: 10px; display: inline-block; margin-top: 5px; word-break: break-all;">
                ${inviteLink}
              </code>
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              SmartPantry • Making shared meal planning easier
            </p>
          </div>
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', info.messageId);

      res.status(200).json({
        success: true,
        message: `Invitation sent to ${inviteeEmail}`,
        messageId: info.messageId,
      });
    } catch (error) {
      console.error('Error sending invitation:', error);
      res.status(500).json({
        error: 'Failed to send invitation email. Please try again later.',
      });
    }
  }
);

/**
 * Helper function to escape HTML characters to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
