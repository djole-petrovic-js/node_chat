module.exports = function(io) {
  const 
    passport = require('passport'),
    Logger   = require('../libs/Logger'),
    genError = require('../utils/generateError'),
    Types    = require('../libs/types'),
    router   = require('express').Router();

  const { sequelize,db:{ Notification,Friend,Operation } } = require('../Models/Models');

  router.use(passport.authenticate('jwt',{ session:false }));

  router.get('/',async(req,res,next) => {
    try {
      const friends = await Friend.getFriendsForUserWithID(req.user.id_user);

      return res.json(friends);
    } catch(e) {
      Logger.log(e,'friends:root');

      return next(genError('FRIENDS_FATAL_ERROR')); 
    }
  });


  router.get('/pending_requests',async(req,res,next) => {
    try {
      const sql = `
        SELECT id_user,username
        FROM Friend f
        INNER JOIN User u
        ON f.id_friend_with = u.id_user
        WHERE id_friend_is = ? AND confirmed = 0
      `;

      const pendingRequests = await sequelize.query(sql,{
        replacements:[req.user.id_user],
        type: sequelize.QueryTypes.SELECT
      });

      return res.json(pendingRequests);
    } catch(e) {
      Logger.log(e,'friends:pending_requests');

      return next(genError('FRIENDS_FATAL_ERROR'));
    }
  });



  router.post('/cancel_request',async(req,res,next) => {
    try {
      if ( !(req.body.id_user && Types.isNumber(req.body.id_user)) ) {
        return next(genError('PENDING_FATAL_ERROR'));
      }

      const friend = await Friend.findOne({
        where:{
          id_friend_is:req.user.id_user,
          id_friend_with:req.body.id_user,
          confirmed:0
        }
      });

      if ( friend ) {
        await friend.destroy();
      } else {
        return res.json({ success:true });
      }

      const notification = await Notification.findOne({
        where:{
          id_notification_type:1,
          notification_from:req.user.id_user,
          notification_to:req.body.id_user
        }
      });

      const operation = await Operation.findOne({
        where:{
          name:'notification:new-notification',
          id_user:req.body.id_user,
          data:{
            [sequelize.Op.like]:`%"id_user":${req.user.id_user}%`
          }
        }
      });

      if ( operation ) {
        await operation.destroy();
      }

      if ( notification ) {
        await notification.destroy();
      }

      return res.json({ success:true });
    } catch(e) {
      Logger.log(e,'friends:cancel_request');

      return next(genError('PENDING_FATAL_ERROR'));
    }
  });


  router.post('/delete_friend',async(req,res,next) => {
    try {
      const { id_user:IdUserRemoving } = req.user;
      const { IdFriendToRemove } = req.body;

      if ( !IdUserRemoving || !IdFriendToRemove ) {
        return next(genError('FRIENDS_MISSING_DATA'));
      }
      // check if user is actualy a friend with another user
      const userInFriendsList = await Friend.findOne({
        where:{
          id_friend_is:IdUserRemoving,
          id_friend_with:IdFriendToRemove,
          confirmed:1
        }
      });

      if ( !userInFriendsList ) {
        return next(genError('FRIENDS_FATAL_ERROR'));
      }

      await Promise.all([
        Friend.destroy({
          where:{
            id_friend_is:IdUserRemoving,
            id_friend_with:IdFriendToRemove
          }
        }),
        Friend.destroy({
          where:{
            id_friend_is:IdFriendToRemove,
            id_friend_with:IdUserRemoving
          }
        })
      ]);

      await io.updateFriends(IdUserRemoving,IdFriendToRemove);

      await io.emitOrSaveOperation(
        IdFriendToRemove,
        'friends:friend-you-removed',
        { IdUserRemoving }
      );

      return res.json({ success:true });
    } catch(e) {
      Logger.log(e,'friends:delete_friend');

      return next(genError('FRIENDS_FATAL_ERROR'));
    }
  });



  router.post('/add_friend',async(req,res,next) => {
    try {
      const { id_user:idFrom } = req.user;
      const { id:idTo } = req.body;

      if ( !(idFrom && idTo && Types.isInteger(idFrom) && Types.isInteger(idTo)) ) {
        return next(genError('FRIENDS_MISSING_DATA')); 
      }
      //Check if user has already added this user...
      const friend = await Friend.findOne({
        where:{ id_friend_is:idFrom, id_friend_with:idTo }
      });

      if ( friend ) {
        return res.json({
          error:true,
          message:'You have already added this friend...',
          errorCode:'FRIENDS_ALREADY_ADDED'
        });
      }
      // Check if user has already been added by another user...
      const friendAlreadyAddedYou = await Friend.findOne({
        where:{ id_friend_is:idTo, id_friend_with:idFrom }
      });

      if ( friendAlreadyAddedYou ) {
        return res.json({
          error:true,
          message:'User has already added you as a friend , go confirm the friend request...',
          errorCode:'FRIENDS_USER_ALREADY_ADDED'
        })
      }
      
      const [ resultNotification ] = await Promise.all([
        Notification.create({
          id_notification_type:1,
          notification_from:idFrom,
          notification_to:idTo
        }),
        Friend.insertNewFriend({
          id_friend_is:idFrom,
          id_friend_with:idTo,
          confirmed:0
        })
      ]);

      await io.emitOrSaveOperation(
        idTo,
        'notification:new-notification',
        {
          id_notification:resultNotification.id_notification,
          id_notification_type:1,
          id_user:idFrom,
          username:req.user.username
        }
      );

      return res.send({ success:true });
    } catch(e) {
      Logger.log(e,'friends:add_friend');

      return next(genError('FRIENDS_FATAL_ERROR'));
    }
  });

  router.post('/confirm_friend',async(req,res,next) => {
    if ( !req.body.id ) {
      return next(genError('FRIENDS_CONFIRMING_FATAL_ERROR'));
    }

    const { id_user:idUserConfirming } = req.user;
    const { id:idUserToAdd } = req.body;

    try {
      const friend = await Friend.findOne({
        where:{
          id_friend_is:idUserConfirming,
          id_friend_with:idUserToAdd,
          confirmed:1
        }
      });

      if ( friend ) {
        return res.json({
          error:true,
          message:'You have already confirmed this friend request...',
          errorCode:'FRIENDS_ALREADY_CONFIRMED'
        });
      }

    } catch(e) {
      Logger.log(e,'friends:confirm_friend');

      return next(genError('FRIENDS_CONFIRMING_FATAL_ERROR'));
    }

    // check if another user has actually added this friend
    // friend request cancel could happend!
    try {
      const user = await Friend.findOne({
        where:{
          id_friend_is:idUserToAdd,
          id_friend_with:idUserConfirming,
          confirmed:0
        }
      });

      if ( !user ) {
        return next(genError('FRIENDS_CONFIRMING_FATAL_ERROR'));
      }

    } catch(e) {
      return next(genError('FRIENDS_CONFIRMING_FATAL_ERROR'));
    }

    try {
      const [ notificationResult ] = await Promise.all([
        Notification.create({
          id_notification_type:2,
          notification_from:idUserConfirming,
          notification_to:idUserToAdd
        }),
        Friend.insertNewFriend({
          id_friend_is:idUserConfirming,
          id_friend_with:idUserToAdd,
          confirmed:0
        })  
      ]);

      await Friend.confirmFriends({
        userIDs:[idUserConfirming,idUserToAdd]
      });

      await io.updateFriends(idUserConfirming,idUserToAdd);

      const sqlFriend1 = `
        SELECT id_user, username, online
        FROM Friend f
        INNER JOIN User u
        ON f.id_friend_with = u.id_user
        WHERE id_friend_is = ? AND id_friend_with = ? AND confirmed = 1
      `;

      const [ friend ] = await sequelize.query(sqlFriend1,{
        replacements:[idUserConfirming,idUserToAdd],
        type: sequelize.QueryTypes.SELECT
      });

      await io.emitOrSaveOperation(
        idUserConfirming,
        'friends:user-confirmed',
        { friend }
      );

      const sqlFriend2 = `
        SELECT id_user, username, online
        FROM Friend f
        INNER JOIN User u
        ON f.id_friend_with = u.id_user
        WHERE id_friend_is = ? AND id_friend_with = ? and confirmed = 1
      `;

      const [ friend2 ] = await sequelize.query(sqlFriend2,{
        replacements:[idUserToAdd,idUserConfirming],
        type: sequelize.QueryTypes.SELECT
      });

      await io.emitOrSaveOperation(
        idUserToAdd,
        'friends:user-confirmed',
        { friend:friend2 }
      );

      const sqlNotification = `
        SELECT id_notification, id_notification_type, username, id_user
        FROM Notification n
        INNER JOIN User u
        ON n.notification_from = u.id_user
        WHERE id_notification = ?
      `;

      const [ newNotification ] = await sequelize.query(sqlNotification,{
        replacements:[notificationResult.id_notification],
        type:sequelize.QueryTypes.SELECT
      });

      await io.emitOrSaveOperation(
        idUserToAdd,
        'notification:new-notification',
        newNotification
      );

      return res.json({ success:true });
    } catch(e) {
      Logger.log(e,'friends:confirm_friend');

      return next(genError('FRIENDS_CONFIRMING_FATAL_ERROR'));
    }
  });

  return router;
}