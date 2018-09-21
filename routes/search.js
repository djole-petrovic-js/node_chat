const 
  passport = require('passport'),
  router   = require('express').Router();

const genError = require('../utils/generateError');
const Logger = require('../libs/Logger');

const { sequelize } = require('../Models/Models');

router.post('/',passport.authenticate('jwt',{ session:false }),async(req,res,next) => {
  const [{ q },{ id_user }] = [ req.body,req.user ];
  
  if ( !(q && typeof q === 'string' && q !== '') ) {
    return res.json({ result:[] });
  }

  try {
    const sql = `
      SELECT id_user,username
      FROM User
      WHERE username LIKE :search AND id_user <> :id_user
      AND id_user NOT IN (
        SELECT id_friend_with
        FROM Friend
        WHERE id_friend_is = :id_user
      )
    `;

    const result = await sequelize.query(sql,{
      replacements:{
        search:'%' + q + '%',
        id_user
      },
      type:sequelize.QueryTypes.SELECT
    });

    return res.json({ result });
  } catch(e) {
    Logger.log(e,'search:root');

    return next(genError('SEARCH_FATAL_ERROR'));
  }
});

module.exports = router;