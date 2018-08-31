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
  JSONvalidator = require('jsonschema').Validator,
  router        = express.Router();

const sendVerificationEmail 
  = require('../utils/register/sendVerificationEmail');

const checkIfUsernameOrEmailExists 
  = require('../utils/register/checkIfUsernameOrEmailExists');

router.get('/verify_token',async(req,res,next) => {
  const Token = new TokenModel();
  
  const token = Types.isArray(req.query.token)
    ? req.query.token[0]
    : req.query.token;

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

  try {
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
    const error = new Error();
    
    error.message = 'Error while activating your account,please try again...';
    next(error);

    try {
      const Errors = new ErrorsModel();
 
      await Errors.insertNewError(
        'Error while activating user account with token :' + token,e
      );

    } catch(e) { }
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



/* 
 * Kontroler za registraciju
 * Treba da se proveri da li su polja prazna , da li se sifre poklapaju
 * , da li vec postoji username i password.
 * Ako je sve u redu , upisati korisnika u bazu, generisati token za verifikaciju
 * e-maila, poslati token na mail...
*/
router.post('/',async (req,res,next) => {
  try {
    const {
      username,
      email,
    } = req.body;
  
    const validator = new JSONvalidator();
  
    const isValidJSON = validator.validate(req.body,{
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
    });

    if ( !isValidJSON.valid) {
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

    try {
      const
        User   = new UserModel(),
        Token  = new TokenModel(),
        result = await User.insertNewUser(Object.assign(form.cleanData,{ device_info:JSON.stringify(deviceInfo) })),
        token  = uuidV4(),
        userID = result.insertId;

      await Token.insertOrUpdateToken({
        userID , token
      });

      await sendVerificationEmail({
        to:email,
        token
      });

      res.json({
        success:true
      });
      
    } catch(e) {
      Logger.log(e,'register');

      return next(genError('REGISTER_FATAL_ERROR'));
    }

  } catch(e) {
    Logger.log(e,'register');

    return next(genError('REGISTER_FATAL_ERROR'));
  }
});

module.exports = router;