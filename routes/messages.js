const
  express       = require('express'),
  passport      = require('passport'),
  MessagesModel = require('../models/messagesModel'),
  Logger        = require('../libs/Logger'),
  genError      = require('../utils/generateError'),
  router        = express.Router();

router.get('/',passport.authenticate('jwt',{ session:false }),async(req,res,next) => {
  const userID = req.user.id_user;

  try {
    const Messages = new MessagesModel();

    const allMessages = await Messages.select({
      alias:'m',
      columns:['message','username as senderUsername,id_user as senderID','m.date'],
      innerJoin:{
        user:['u','m.id_sending','u.id_user']
      },
      where:{
        id_receiving:userID
      }
    });

    res.json(allMessages);

  } catch(e) {
    Logger.log(e,'messages');

    return next(genError('MESSAGES_FETCH_FAILED'));
  }
});

router.post('/delete_messages',passport.authenticate('jwt',{ session:false }),async(req,res,next) => {
  try {
    if ( !req.body.userID ) {
      return next(genError('MESSAGES_DELETING_FAILED'));
    }

    const 
      deleteMessagesFromUserWithID = req.body.userID,
      deleteMessagesForUserWithID  = req.user.id_user;

    const Messages = new MessagesModel();

    await Messages.deleteMultiple({
      confirm:true,
      where:{
        id_sending:deleteMessagesFromUserWithID,
        id_receiving:deleteMessagesForUserWithID
      }
    });

    res.json({
      success:true
    });

  } catch(e) {
    Logger.log(e,'messages');

    return next(genError('MESSAGES_DELETING_FAILED'));
  }
});

module.exports = router;