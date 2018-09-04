const 
  express       = require('express'),
  uuidV4        = require('uuid/v4'),
  Types         = require('../libs/types'),
  UserModel     = require('../models/userModel'),
  TokenModel    = require('../models/tokenModel'),
  ErrorsModel   = require('../models/errorsModel'),
  validateForm  = require('../utils/register/validateForm'),
  genError      = require('../utils/generateError'),
  Logger        = require('../libs/Logger'),
  Password      = require('../libs/password'),
  JSONvalidator = require('jsonschema').Validator,
  router        = express.Router();

const sendVerificationEmail 
  = require('../utils/register/sendVerificationEmail');

const checkIfUsernameOrEmailExists 
  = require('../utils/register/checkIfUsernameOrEmailExists');

router.get('/verify_token',async(req,res) => {
  try {
    const Token = new TokenModel();

    if ( typeof req.query.token !== 'string' ) {
      return res.send('Token is missing, request another one...');
    }
  
    const token = req.query.token;

    if ( !token ) {
      return res.send('Token is missing, request another one...');
    }

    const sql = `
      SELECT t.id_user,token,account_activated
      FROM token t
      INNER JOIN user u
      ON u.id_user = t.id_user
      WHERE token = ? AND DATEDIFF(now(),token_date) < 7
      LIMIT 1
    `;

    const userTokenResult = await Token.executeCustomQuery(sql,[token]);

    if ( userTokenResult.length > 1 ) {
      try {
        const Errors = new ErrorsModel();

        await Errors.insertNewError(
          'Tokens UUID',
          `There seems to be more than one tokens,
          length is : ${ userTokenResult.length }`
        );

      } catch(e) { } 
    }

    const [ userToken ] = userTokenResult;

    if ( !userToken ) {
      return res.send('Token not found or not valid,please request another one...');
    }

    if ( userToken.account_activated === 1 ) {
      return res.send('You have already activated your account...');
    }

    const User = new UserModel();

    await User.update({
      columns:['account_activated'],
      values:[1],
      where:{ id_user:userToken.id_user }
    });

    res.send('Your account is activated, you can now log in...');

  } catch(e) {
    Logger.log(e,'register');

    return res.send('Error while verifing your token, please try again!');
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
    const { username,email } = req.body;
  
    const isValidRequest = new JSONvalidator().validate(req.body,{
      type:'object',
      properties:{
        username:{ type:'string' },
        password:{ type:'string' },
        confirmPassword:{ type:'string' },
        email:{ type:'string',format:'email' },
        deviceInfo:{
          type:'object',
          properties:{
            uuid:{ type:['string',null] },
            serial:{ type:['string',null] },
            manufacturer:{ type:['string',null] }
          },
          required:['uuid','serial','manufacturer'],
          additionalProperties:false
        }
      },
      required:['username','password','confirmPassword','email','deviceInfo'],
      additionalProperties:false
    }).valid

    if ( !isValidRequest) {
      return res.json({
        errors:form.errors,
        errorCode:'REGISTER_DATA_NOT_VALID'
      });
    }

    // exlude device info from validation
    const deviceInfo = req.body.deviceInfo;

    delete req.body.deviceInfo;

    const form = await validateForm(req.body);

    if ( !form.isValid ) {
      return res.json({
        errors:form.errors,
        errorCode:'REGISTER_DATA_NOT_VALID'
      });
    }

    const usernameAndEmailInfo = 
      await checkIfUsernameOrEmailExists({ username , email });

    if (
      usernameAndEmailInfo.usernameAlreadyExists ||
      usernameAndEmailInfo.emailAlreadyExists
    ) {
      usernameAndEmailInfo.errorCode = usernameAndEmailInfo.usernameAlreadyExists
        ? 'REGISTER_USERNAME_EXISTS'
        : 'REGISTER_EMAIL_EXISTS';

      return res.json(usernameAndEmailInfo);
    }

    const userToInsert = {
      username,
      password:req.body.password,
      email,
      device_uuid:deviceInfo.uuid,
      device_serial:deviceInfo.serial,
      device_manufacturer:deviceInfo.manufacturer,
    };

    const
      User   = new UserModel(),
      Token  = new TokenModel(),
      result = await User.insertNewUser(userToInsert),
      token  = uuidV4(),
      userID = result.insertId;

    await Token.insertOrUpdateToken({ userID,token });

    try {
      await sendVerificationEmail({ to:email,token });
    } catch(e) {
      Logger.log(e,'register');

      return next(genError('REGISTER_EMAIL_SEND_ERROR'));
    }

    return res.json({ success:true });
  } catch(e) {
    Logger.log(e,'register');

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

    const User = new UserModel();
    const Token = new TokenModel();

    const [ user ] = await User.select({
      where:{ email:req.body.email }
    });

    if ( !user ) {
      return next(genError('EMAIL_PASSWORD_INCORRECT'));
    }

    const { isMatched } = await new Password(req.body.password).comparePasswords(user.password);

    if ( !isMatched ) {
      return next(genError('EMAIL_PASSWORD_INCORRECT'));
    }

    if ( user.account_activated === 1 ) {
      return next(genError('ACCOUNT_ALREADY_ACTIVATED'));
    }

    const token = uuidV4();

    await Promise.all([
      Token.insertOrUpdateToken({ userID:user.id_user,token }),
      sendVerificationEmail({ to:user.email,token })
    ]);

    return res.json({ success:true });
  } catch(e) {
    Logger.log(e,'register');

    return next(genError('REGISTER_EMAIL_RESEND_ERROR'));
  }
});

module.exports = router;