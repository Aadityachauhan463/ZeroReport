// api/sendEmail.js
const nodemailer = require('nodemailer');

export default async function (req, res) {
  if (req.method === 'POST') {
    const { to, subject, body } = req.body;

    // Create a Nodemailer transporter using SMTP
    // You'll need to replace these with your actual email service details
    // For Gmail, you'd use 'smtp.gmail.com' and port 465 (for secure SSL) or 587 (for TLS)
    // The YouTube video you provided [00:01:29] specifically mentions using Gmail.
    const transporter = nodemailer.createTransport({
      service: 'gmail', // Use 'gmail' for Gmail accounts [00:01:29]
      auth: {
        user: "aadityachauhan733@gmail.com", // Your email address (sender) [00:02:22]
        pass: "xrownirhargeiuuy", // Your App Password [00:02:47]
      },
    });

    try {
      // Send the email
      const info = await transporter.sendMail({
        from: process.env.EMAIL_USER, // Sender address [00:03:05]
        to, // Recipient address [00:03:10]
        subject, // Subject line [00:03:26]
        text: body, // Plain text body [00:03:42]
        // html: `<b>${body}</b>`, // Optional: HTML body
      });

      console.log('Message sent: %s', info.messageId);
      res.status(200).json({ messageId: info.messageId, message: 'Email sent successfully!' });
    } catch (error) {
      console.error('Error sending email:', error);
      res.status(500).json({ error: 'Failed to send email. Please check server logs.' });
    }
  } else {
    // Handle any non-POST requests
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
