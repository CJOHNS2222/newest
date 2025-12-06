import * as functions from "firebase-functions";
import * as nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: functions.config().gmail.email,
    pass: functions.config().gmail.password,
  },
});

export const sendEmail = async (
  email: string,
  subject: string,
  body: string
) => {
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
