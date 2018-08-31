const 
  mailer = require('nodemailer'),
  config = require('../../config/config');

const sendVerificationEmail = function({ to , token }) {
  if ( !to || !token ) {
    throw new Error('Missing recipient or token');
  }

  return new Promise((resolve,reject) => {
    const mailOptions = {
      to,
      from:'nohistorychat@gmail.com',
      subject:'Activate your account',
      html:`
        <h1>Activate your account</h1>
        <h2>Welcome to NoHistoryChat!</h2>
        <p>Press link below to activate your account</p>
        <a href="${ config.siteURL }/api/register/verify_token?token=${ token }"
        >Click here</a>
        <p>If this email is unexpcted, please just ignore it.</p>
      `
    };

    const transporter = mailer.createTransport(
      `smtps://${ process.env.EMAIL }:${ process.env.EMAIL_PASSWORD }@smtp.gmail.com`
    );

    transporter.sendMail(mailOptions,(err,info) => {
      if ( err ) {
        reject(err);
      } else {
        resolve(info);
      }
    });
  });
}

module.exports = sendVerificationEmail;