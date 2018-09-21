const
  express       = require('express'),
  passport      = require('passport'),
  Logger        = require('../libs/Logger'),
  genError      = require('../utils/generateError'),
  router        = express.Router();

const { sequelize,db:{ Message} } = require('../Models/Models');

router.use(passport.authenticate('jwt',{ session:false }));

router.get('/',async(req,res,next) => {
  try {
    const sql = `
      SELECT message, username as senderUsername, id_user as senderID, m.date
      FROM Message m
      INNER JOIN User u
      ON m.id_sending = u.id_user
      WHERE id_receiving = ?
    `;

    const messages = await sequelize.query(sql,{
      replacements:[req.user.id_user],
      type: sequelize.QueryTypes.SELECT
    });

    return res.json(messages);
  } catch(e) {
    Logger.log(e,'messages:root');

    return next(genError('MESSAGES_FETCH_FAILED'));
  }
});

router.post('/delete_messages',async(req,res,next) => {
  try {
    if ( !req.body.userID ) {
      return next(genError('MESSAGES_DELETING_FAILED'));
    }

    await Message.destroy({
      where:{
        id_sending:req.body.userID,
        id_receiving:req.user.id_user
      }
    });

    return res.json({ success:true });
  } catch(e) {
    Logger.log(e,'messages:delete_messages');

    return next(genError('MESSAGES_DELETING_FAILED'));
  }
});

module.exports = router;