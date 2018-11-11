if ( !process.env.SITE_URL ) {
  const path = require('path');

  require('dotenv').config({ path:path.join(__dirname,'../','.env') });
}

const sendEmail = require('../utils/sendEmail');

const run = async() => {
  await sendEmail({
    to:'djolescarface@gmail.com',
    subject:'Activate your account',
    html:`
      <h1>TESTING!</h1>
      <h1>Activate your account</h1>
      <h2>Welcome to No History Chat!</h2>
      <p>Press link below to activate your account</p>
      <a href="${ process.env.SITE_URL }/api/register/verify_token?token=${ 123 }"
      >Click here</a>
      <p>If this email is unexpected, please just ignore it.</p>
    `
  });
}

run();