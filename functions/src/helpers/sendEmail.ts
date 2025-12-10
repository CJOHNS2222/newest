import * as functions from "firebase-functions";
import * as nodemailer from "nodemailer";

let transporter: any;
let cachedGmailEmail: string | null = null;

const getTransporter = () => {
  if (!transporter) {
    // @ts-ignore - functions.config() is available at runtime
    const gmailConfig = functions.config().gmail;
    if (!gmailConfig?.email || !gmailConfig?.password) {
      throw new Error("Gmail credentials not configured. Please run: firebase functions:config:set gmail.email=YOUR_EMAIL gmail.password=YOUR_PASSWORD");
    }
    cachedGmailEmail = gmailConfig.email;
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailConfig.email,
        pass: gmailConfig.password,
      },
    });
  }
  return transporter;
};

export const sendEmail = async (
  email: string,
  subject: string,
  body: string
) => {
  const transporter = getTransporter();
  if (!cachedGmailEmail) {
    // @ts-ignore - functions.config() is available at runtime
    const gmailConfig = functions.config().gmail;
    cachedGmailEmail = gmailConfig?.email || "noreply@smartpantry.com";
  }
  const mailOptions = {
    from: cachedGmailEmail,
    to: email,
    subject: subject,
    html: body,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Email sent to", email);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};
