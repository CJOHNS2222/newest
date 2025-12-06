/**
 * Email Service for sending household invitations
 * Supports two approaches:
 * 1. EmailJS (client-side, optional, requires npm install @emailjs/browser)
 * 2. Firebase Cloud Function (server-side, more secure, recommended)
 */

// Get environment variables safely
const getEnvVar = (key: string, defaultValue: string = ''): string => {
  try {
    // This works with Vite
    const env = (globalThis as any).__VITE_ENV__ || (import.meta as any).env || {};
    return env[key] || defaultValue;
  } catch {
    return defaultValue;
  }
};

const EMAILJS_SERVICE_ID = getEnvVar('VITE_EMAILJS_SERVICE_ID', '');
const EMAILJS_TEMPLATE_ID = getEnvVar('VITE_EMAILJS_TEMPLATE_ID', '');
const EMAILJS_PUBLIC_KEY = getEnvVar('VITE_EMAILJS_PUBLIC_KEY', '');

/**
 * Sends an invitation email to a household member
 * @param inviteeEmail - Email of the person being invited
 * @param householdName - Name of the household/family group
 * @param inviterName - Name of the person sending the invite
 * @param appUrl - URL to the app (for the invitation link)
 */
export const sendHouseholdInvitation = async (
  inviteeEmail: string,
  householdName: string,
  inviterName: string,
  appUrl: string = typeof window !== 'undefined' ? window.location.origin : ''
): Promise<{ success: boolean; message: string }> => {
  try {
    // First, try to send via Firebase Cloud Function (more secure)
    const cloudFunctionResult = await sendViaCloudFunction(inviteeEmail, householdName, inviterName);
    if (cloudFunctionResult.success) {
      return cloudFunctionResult;
    }

    // Fallback to EmailJS if Cloud Function fails and credentials exist
    if (EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY) {
      return await sendViaEmailJS(inviteeEmail, householdName, inviterName, appUrl);
    }

    // If neither service is configured, just log locally
    console.warn('No email service configured. Configure EmailJS or Cloud Functions to send emails.');
    return {
      success: true,
      message: 'Invitation saved locally. Configure EmailJS or Cloud Functions to send emails.'
    };
  } catch (error) {
    console.error('Error in sendHouseholdInvitation:', error);
    return {
      success: false,
      message: `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Send invitation via Firebase Cloud Function
 */
const sendViaCloudFunction = async (
  inviteeEmail: string,
  householdName: string,
  inviterName: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const functionUrl = getEnvVar(
      'VITE_FIREBASE_FUNCTIONS_URL',
      'https://us-central1-gen-lang-client-0893655267.cloudfunctions.net'
    );

    const response = await fetch(
      `${functionUrl}/sendHouseholdInvitation`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inviteeEmail,
          householdName,
          inviterName
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Cloud Function returned ${response.status}`);
    }

    return {
      success: true,
      message: `Invitation sent to ${inviteeEmail}`
    };
  } catch (error) {
    console.warn('Cloud Function unavailable:', error);
    return {
      success: false,
      message: 'Cloud Function unavailable'
    };
  }
};

/**
 * Send invitation via EmailJS (requires @emailjs/browser to be installed)
 * Install with: npm install @emailjs/browser
 */
const sendViaEmailJS = async (
  inviteeEmail: string,
  householdName: string,
  inviterName: string,
  appUrl: string
): Promise<{ success: boolean; message: string }> => {
  try {
    // Dynamically load EmailJS only if needed (avoids build-time errors)
    const emailjsScript = document.createElement('script');
    emailjsScript.type = 'text/javascript';
    emailjsScript.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/browser.min.js';
    
    return new Promise((resolve) => {
      emailjsScript.onload = async () => {
        try {
          // @ts-ignore - EmailJS loads globally as emailjs
          const emailjs = window.emailjs;
          
          if (!emailjs) {
            resolve({
              success: false,
              message: 'EmailJS library failed to load'
            });
            return;
          }

          emailjs.init(EMAILJS_PUBLIC_KEY);

          const templateParams = {
            to_email: inviteeEmail,
            to_name: inviteeEmail.split('@')[0],
            inviter_name: inviterName,
            household_name: householdName,
            app_url: appUrl,
            invite_link: `${appUrl}?invite=${btoa(inviteeEmail)}`
          };

          const response = await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID,
            templateParams
          );

          if ((response as any).status === 200) {
            resolve({
              success: true,
              message: `Invitation sent to ${inviteeEmail}`
            });
          } else {
            throw new Error('Email send failed');
          }
        } catch (error) {
          console.error('EmailJS error:', error);
          resolve({
            success: false,
            message: `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      };

      emailjsScript.onerror = () => {
        resolve({
          success: false,
          message: 'Failed to load EmailJS library from CDN'
        });
      };

      document.head.appendChild(emailjsScript);
    });
  } catch (error) {
    console.error('EmailJS setup error:', error);
    return {
      success: false,
      message: `Failed to set up email: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};
