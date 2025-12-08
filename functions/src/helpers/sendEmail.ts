import * as functions from "firebase-functions";
import * as nodemailer from "nodemailer";

let transporter: any;

const getTransporter = () => {
  if (!transporter) {
    const gmailConfig = functions.config().gmail;
    if (!gmailConfig?.email || !gmailConfig?.password) {
      throw new Error("Gmail credentials not configured. Please run: firebase functions:config:set gmail.email=YOUR_EMAIL gmail.password=YOUR_PASSWORD");
    }
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
  const mailOptions = {
    from: functions.config().gmail.email,
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
