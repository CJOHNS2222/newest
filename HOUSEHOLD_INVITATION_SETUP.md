# Household Invitation Email Setup Guide

The household invitation feature now supports sending emails to invited family members. There are two recommended approaches to enable email functionality:

## Option 1: Firebase Cloud Functions (Recommended - More Secure)

This is the recommended approach as it keeps your email service credentials on the server-side only.

### Setup Steps:

1. **Create a Firebase Cloud Function** in your Firebase project that sends emails.

   Example using SendGrid or Nodemailer:

   ```typescript
   import * as functions from 'firebase-functions';
   import * as nodemailer from 'nodemailer';

   const transporter = nodemailer.createTransport({
     service: 'gmail',
     auth: {
       user: process.env.EMAIL_USER,
       pass: process.env.EMAIL_PASSWORD
     }
   });

   export const sendHouseholdInvitation = functions.https.onRequest(async (req, res) => {
     try {
       const { inviteeEmail, householdName, inviterName } = req.body;

       await transporter.sendMail({
         from: process.env.EMAIL_USER,
         to: inviteeEmail,
         subject: `${inviterName} invited you to join "${householdName}" on SmartPantry`,
         html: `
           <h2>You're invited to join a household!</h2>
           <p>${inviterName} invited you to join "<strong>${householdName}</strong>" household on SmartPantry.</p>
           <p><a href="${process.env.APP_URL}">Accept Invitation</a></p>
         `
       });

       res.status(200).json({ success: true });
     } catch (error) {
       console.error('Error sending email:', error);
       res.status(500).json({ error: 'Failed to send email' });
     }
   });
   ```

2. **Add environment variables** to your `.env.local`:

   ```env
   # Firebase Cloud Functions URL (replace with your actual URL)
   VITE_FIREBASE_FUNCTIONS_URL=https://us-central1-gen-lang-client-0893655267.cloudfunctions.net
   ```

## Option 2: EmailJS (Client-Side - Quick Setup)

EmailJS is a free service that allows sending emails directly from your frontend.

### Setup Steps:

1. **Sign up for EmailJS** at [https://www.emailjs.com/](https://www.emailjs.com/)

2. **Create an Email Template** in your EmailJS dashboard:
   - Template Variables:
     - `{{to_email}}` - Recipient email
     - `{{inviter_name}}` - Name of person sending invite
     - `{{household_name}}` - Name of the household
     - `{{app_url}}` - URL to your app
     - `{{invite_link}}` - Direct invite link

3. **Get your credentials**:
   - Service ID
   - Template ID
   - Public Key

4. **Install EmailJS package**:

   ```bash
   npm install @emailjs/browser
   ```

5. **Add to `.env.local`**:

   ```env
   VITE_EMAILJS_SERVICE_ID=your_service_id_here
   VITE_EMAILJS_TEMPLATE_ID=your_template_id_here
   VITE_EMAILJS_PUBLIC_KEY=your_public_key_here
   ```

## Option 3: No Email Service (Local Invitations Only)

If you don't want to set up an email service, the invitations will still be saved locally and appear in the household members list. Users can manually share the household invitation link.

## How It Works

### Flow:
1. User enters an email address in the "Invite Family Member" form
2. The app validates the email address
3. It attempts to send an email (if a service is configured)
4. The invitation is saved locally and to Firestore immediately
5. A confirmation message appears to the user

### Status Messages:
- **✓ Success**: "Invitation sent to email@example.com"
- **✓ Local**: "Member added locally. Configure EmailJS or Cloud Functions to send emails."
- **✗ Error**: Shows specific error message

## Database Structure

Invitations are stored in Firestore with the following structure:

```javascript
// households/{householdId}/members/{memberId}
{
  id: "member_id",
  name: "user_name",
  email: "user@example.com",
  role: "Member",
  status: "Invited",
  invitedAt: "2025-12-06T10:30:00Z",
  invitedBy: "inviter@example.com"
}
```

## Troubleshooting

### Invitations not sending?

1. **Check console logs** for error messages
2. **Verify .env.local variables** are set correctly
3. **Test Cloud Function separately** if using that approach
4. **Check email service quotas** (EmailJS has free tier limits)

### EmailJS not working?

- Verify the library is installed: `npm install @emailjs/browser`
- Check credentials in .env.local
- Verify email template variables match the function parameters

### Cloud Functions not responding?

- Ensure the function URL is correct
- Check Firebase Cloud Functions logs
- Verify CORS is properly configured
- Test the endpoint with a curl request

## Email Template Example (EmailJS)

Create a template that looks like this:

```html
<div style="font-family: Arial, sans-serif; max-width: 600px;">
  <h2>You're Invited! 🎉</h2>
  <p>Hello {{to_name}},</p>
  <p>{{inviter_name}} invited you to join the household "<strong>{{household_name}}</strong>" on SmartPantry!</p>
  
  <p>SmartPantry helps families manage their shared pantry inventory, plan meals together, and find recipes based on what you have.</p>
  
  <p>
    <a href="{{invite_link}}" style="display: inline-block; padding: 10px 20px; background-color: #d97706; color: white; text-decoration: none; border-radius: 4px;">
      Accept Invitation
    </a>
  </p>
  
  <p>Or copy this link: {{app_url}}</p>
  <p>Happy cooking! 👨‍🍳</p>
</div>
```

## Testing the Feature

1. Open the Household Manager modal
2. Click on the "Community" tab
3. Scroll to "Invite Family Member"
4. Enter a test email address
5. Click the send button
6. Check for success/error message
7. (If email service configured) Check the test email inbox

## Next Steps

- Set up one of the email service options above
- Test sending an invitation
- Customize the email template to match your branding
- Consider implementing invitation acceptance flow
