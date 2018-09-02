const mailer = require('nodemailer');
const bluebird = require('bluebird');

const sendVerificationEmail = async({ to , token }) => {
  try {
    if ( !to || !token ) {
      throw new Error('Missing recipient or token');
    }

    const mailOptions = {
      to,
      from:process.env.EMAIL,
      subject:'Activate your account',
      html:`
        <h1>Activate your account</h1>
        <h2>Welcome to NoHistoryChat!</h2>
        <p>Press link below to activate your account</p>
        <a href="${ process.env.SITE_URL }/api/register/verify_token?token=${ token }"
        >Click here</a>
        <p>If this email is unexpcted, please just ignore it.</p>
      `
    };

    const transporter = bluebird.promisifyAll(mailer.createTransport(
      `smtps://${ process.env.EMAIL }:${ process.env.EMAIL_PASSWORD }@smtp.gmail.com`
    ));

    return await transporter.sendMail(mailOptions);
  } catch(e) {
    throw e;
  }
}

module.exports = sendVerificationEmail;