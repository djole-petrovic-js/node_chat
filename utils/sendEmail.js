const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmail = async({ to,subject,html }) => {
  try {
    const msg = {
      to,
      from:process.env.EMAIL,
      subject,
      html,
    };

    return await sgMail.send(msg);
  } catch(e) {
    throw e;
  }
}

module.exports = sendEmail;