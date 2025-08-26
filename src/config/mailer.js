import nodemailer from 'nodemailer';

// Create transporter with proper Gmail configuration
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail', // Use service name instead of host/port
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

export const sendMail = async ({ to, subject, html }) => {
  try {
    const transporter = createTransporter();
    const from = process.env.SMTP_FROM || `"Chat App" <${process.env.SMTP_USER}>`;
    
    const mailOptions = {
      from,
      to,
      subject,
      html,
    };

    // Verify connection first
    await transporter.verify();
    console.log('SMTP Server is ready to send emails');
    
    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully to:', to);
    return result;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};