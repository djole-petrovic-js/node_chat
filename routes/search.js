const 
  passport = require('passport'),
  router   = require('express').Router();

const UserModel = require('../models/userModel');
const genError  = require('../utils/generateError');
const Logger    = require('../libs/Logger');

router.post('/',passport.authenticate('jwt',{ session:false }),async(req,res,next) => {
  const [{ q },{ id_user }] = [ req.body,req.user ];
  
  if ( !(q && typeof q === 'string' && q !== '') ) {
    return res.json({ result:[] });
  }

  try {
    const User = new UserModel();

    const sql = `
      SELECT id_user,username
      FROM user
      WHERE username LIKE ? AND id_user <> ?
      AND id_user NOT IN (
        SELECT id_friend_with
        FROM friend
        WHERE id_friend_is = ?
      )
    `;

    const result = await User.executeCustomQuery(
      sql,
      [`%${ q }%`,id_user,id_user]
    );

    return res.json({ result });
  } catch(e) {
    Logger.log(e,'search');

    return next(genError('SEARCH_FATAL_ERROR'));
  }
});

module.exports = router;