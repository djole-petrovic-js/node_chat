const 
  express       = require('express'),
  uuidV4        = require('uuid/v4'),
  genError      = require('../utils/generateError'),
  Logger        = require('../libs/Logger'),
  Password      = require('../libs/password'),
  JSONvalidator = require('jsonschema').Validator,
  Form          = require('../libs/Form'),
  router        = express.Router();

const sendEmail = require('../utils/sendEmail');
const checkIfUsernameOrEmailExists = require('../utils/register/checkIfUsernameOrEmailExists');
const deviceInfoRules = require('../config/deviceInfo');

const { sequelize,db:{ User,Token,BannedEmail } } = require('../Models/Models');

router.get('/verify_token',async(req,res) => {
  try {
    const token = req.query.token;

    if ( !token ) {
      return res.send('Token is missing, request another one...');
    }

    if ( typeof req.query.token !== 'string' ) {
      return res.send('Token is missing, request another one...');
    }
  
    const sql = `
      SELECT t.id_user,token,account_activated
      FROM Token t
      INNER JOIN User u
      ON u.id_user = t.id_user
      WHERE token = ? AND DATEDIFF(now(),token_date) < 7
      LIMIT 1
    `;

    const [ userToken ] = await sequelize.query(sql,{
      replacements:[token],
      type: sequelize.QueryTypes.SELECT
    });

    if ( !userToken ) {
      return res.send(`
        <h1 style="font-size:700%;">No History Chat</h1>
        <h2 style="font-size:500%;">Account activation</h2>
        <p style="font-size:500%;">Token not found or not valid,please request another one.</p>
      `);
    }

    if ( userToken.account_activated ) {
      return res.send(`
        <h1 style="font-size:700%;">No History Chat</h1>
        <h2 style="font-size:500%;">Account activation</h2>
        <p style="font-size:500%;">You have already activated your account.</p>
      `);
    }

    await User.update({
      account_activated:1
    },{
      where:{ id_user:userToken.id_user }
    })

    return res.send(`
      <h1 style="font-size:700%;">No History Chat</h1>
      <h2 style="font-size:500%;">Account activation</h2>
      <p style="font-size:500%;">Your account is activated, you can now log in.</p>
    `);
  } catch(e) {
    Logger.log(e,'register:verify_token');

    return res.send(`
      <h1 style="font-size:700%;">No History Chat</h1>
      <h2 style="font-size:500%;">Account activation</h2>
      <p style="font-size:500%;">Error while verifing your token, please try again!</p>
    `);
  }
});



router.post('/checkemailusername',async (req,res,next) => {
  try {
    const isValid = new JSONvalidator().validate(req.body,{
      type:'object',
      additionalProperties:false,
      required:['username','email'],
      properties:{
        username:{ type:'string' },
        email:{ type:'string' }
      }
    }).valid;
  
    if ( !isValid ) {
      return next(genError('EMAIL_USERNAME_LOOKUP_FAILED'));
    }

    const usernameAndEmailInfo = await checkIfUsernameOrEmailExists({
      username:req.body.username,
      email:req.body.email
    });

    res.json(usernameAndEmailInfo);
  } catch(e) {
    return next(genError('EMAIL_USERNAME_LOOKUP_FAILED'));
  }
});




router.post('/',async (req,res,next) => {
  try {
    const isValidRequest = new JSONvalidator().validate(req.body,{
      type:'object',
      properties:{
        username:{ type:'string' },
        password:{ type:'string' },
        confirmPassword:{ type:'string' },
        email:{ type:'string',format:'email' },
        deviceInfo:deviceInfoRules
      },
      required:['username','password','confirmPassword','email','deviceInfo'],
      additionalProperties:false
    }).valid;

    if ( !isValidRequest) {
      return res.json({
        errors:form.errors,
        errorCode:'REGISTER_DATA_NOT_VALID'
      });
    }

    const usernameRegex = '^[a-zA-Z0-9\\._]{5,20}$';
    const passwordRegex = '^(?=.*\\d)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z._]{8,16}$';

    const form = new Form({
      username:`bail|required|minlength:5|maxlength:20|regex:${usernameRegex}`,
      password:`bail|required|minlength:8|maxlength:16|regex:${passwordRegex}:g|same:confirmPassword`,
      confirmPassword:'required',
      email:'bail|required|email'
    });

    form.bindValues(req.body);
    form.validate();

    if ( !form.isValid() ) {
      return res.json({
        errors:form.errors,
        errorCode:'REGISTER_DATA_NOT_VALID'
      });
    }
    // check if user email is banned
    const isBanned = await BannedEmail.findOne({
      where:{ banned_email:req.body.email } 
    });

    if ( isBanned ) {
      return res.json({ errorCode:'REGISTER_EMAIL_BANNED' });
    }

    // check if account is already made from this devices
    const accountFromDeviceExists = await User.findOne({
      where:{
        device_uuid:req.body.deviceInfo.uuid,
        device_serial:req.body.deviceInfo.serial,
        device_manufacturer:req.body.deviceInfo.manufacturer
      }
    });

    if ( accountFromDeviceExists ) {
      return res.json({ errorCode:'REGISTER_DEVICE_EXISTS' });
    }

    const info = await checkIfUsernameOrEmailExists({
      username:req.body.username,
      email:req.body.email
    });

    if ( info.usernameAlreadyExists || info.emailAlreadyExists ) {
      info.errorCode = info.usernameAlreadyExists
        ? 'REGISTER_USERNAME_EXISTS'
        : 'REGISTER_EMAIL_EXISTS';

      return res.json(info);
    }

    const result = await User.create({
      username:req.body.username,
      password:req.body.password,
      email:req.body.email,
      device_uuid:req.body.deviceInfo.uuid,
      device_serial:req.body.deviceInfo.serial,
      device_manufacturer:req.body.deviceInfo.manufacturer,
    });

    const token = uuidV4();

    await Token.insertOrUpdateToken({ userID:result.id_user,token });

    try {
      await sendEmail({
        to:req.body.email,
        subject:'Activate your account',
        html:`
          <h1>Activate your account</h1>
          <h2>Welcome to No History Chat!</h2>
          <p>Press link below to activate your account</p>
          <a href="${ process.env.SITE_URL }/api/register/verify_token?token=${ token }"
          >Click here</a>
          <p>If this email is unexpected, please just ignore it.</p>
        `
      });
    } catch(e) {
      Logger.log(e,'register:root');

      return next(genError('REGISTER_EMAIL_SEND_ERROR'));
    }

    return res.json({ success:true });
  } catch(e) {
    Logger.log(e,'register:root');

    return next(genError('REGISTER_FATAL_ERROR'));
  }
});



router.post('/resend_confirmation_email',async(req,res,next) => {
  try {
    const isValidRequest = new JSONvalidator().validate(req.body,{
      type:'object',
      additionalProperties:false,
      required:['email','password'],
      properties:{
        email:{ type:'string' },
        password:{ type:'string' }
      }
    }).valid

    if ( !isValidRequest ) {
      return next(genError('REGISTER_DATA_NOT_VALID'));
    }

    const user = await User.findOne({
      where:{ email:req.body.email }
    });

    if ( !user ) {
      return next(genError('EMAIL_PASSWORD_INCORRECT'));
    }

    const { isMatched } = await new Password(req.body.password).comparePasswords(user.password);

    if ( !isMatched ) {
      return next(genError('EMAIL_PASSWORD_INCORRECT'));
    }

    if ( user.account_activated ) {
      return next(genError('ACCOUNT_ALREADY_ACTIVATED'));
    }

    const token = uuidV4();

    await Promise.all([
      Token.insertOrUpdateToken({ userID:user.id_user,token }),
      sendEmail({
        to:user.email,
        subject:'Activate your account',
        html:`
          <h1>Activate your account</h1>
          <h2>Welcome to No History Chat!</h2>
          <p>Press link below to activate your account</p>
          <a href="${ process.env.SITE_URL }/api/register/verify_token?token=${ token }"
          >Click here</a>
          <p>If this email is unexpected, please just ignore it.</p>
        `
      }),
    ]);

    return res.json({ success:true });
  } catch(e) {
    Logger.log(e,'register:resend_confirmation_email');

    return next(genError('REGISTER_EMAIL_RESEND_ERROR'));
  }
});

module.exports = router;