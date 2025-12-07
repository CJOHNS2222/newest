import * as functions from 'firebase-functions';
/**
 * Cloud Function to send household invitations
 * Called from the frontend when a user invites someone to their household
 */
export declare const sendHouseholdInvitation: functions.HttpsFunction & functions.Runnable<any>;
/**
 * HTTP endpoint alternative for sending invitations
 * Can be used if you prefer HTTP requests over callable functions
 */
export declare const sendHouseholdInvitationHttp: functions.HttpsFunction;
