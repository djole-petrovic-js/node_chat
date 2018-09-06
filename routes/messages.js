const
  express       = require('express'),
  passport      = require('passport'),
  MessagesModel = require('../models/messagesModel'),
  Logger        = require('../libs/Logger'),
  genError      = require('../utils/generateError'),
  router        = express.Router();

router.use(passport.authenticate('jwt',{ session:false }));

router.get('/',async(req,res,next) => {
  try {
    const Messages = new MessagesModel();

    const allMessages = await Messages.select({
      alias:'m',
      columns:['message','username as senderUsername,id_user as senderID','m.date'],
      innerJoin:{
        user:['u','m.id_sending','u.id_user']
      },
      where:{
        id_receiving:req.user.id_user
      }
    });

    return res.json(allMessages);
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

    const Messages = new MessagesModel();

    await Messages.deleteMultiple({
      confirm:true,
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