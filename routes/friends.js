module.exports = function(io) {
  const 
    express  = require('express'),
    passport = require('passport'),
    Logger   = require('../libs/Logger'),
    genError = require('../utils/generateError'),
    Types    = require('../libs/types'),
    router   = express.Router();

  const FriendsModel = require('../models/friendsModel');
  const NotificationsModel = require('../models/notificationsModel');

  router.use(passport.authenticate('jwt',{ session:false }));

  router.get('/',async(req,res,next) => {
    const Friends = new FriendsModel();

    try {
      const friends = await Friends.getFriendsForUserWithID(req.user.id_user);

      return res.json(friends);
    } catch(e) {
      Logger.log(e,'friends');

      return next(genError('FRIENDS_FATAL_ERROR')); 
    }
  });


  router.get('/pending_requests',async(req,res,next) => {
    try {
      const Friends = new FriendsModel();

      const pendingRequests = await Friends.select({
        columns:['id_user','username'],
        alias:'f',
        innerJoin:{
          user:['u','f.id_friend_with','u.id_user']
        },
        where:{
          id_friend_is:req.user.id_user,
          confirmed:0
        }
      });

      return res.json(pendingRequests);
    } catch(e) {
      Logger.log(e,'friends');

      return next(genError('FRIENDS_FATAL_ERROR'));
    }
  });



  router.post('/cancel_request',async(req,res,next) => {
    try {
      if ( !(req.body.id_user && Types.isNumber(req.body.id_user)) ) {
        return next(genError('PENDING_FATAL_ERROR'));
      }

      const Friends = new FriendsModel();

      await Friends.deleteMultiple({
        confirm:true,
        where:{
          id_friend_is:req.user.id_user,
          id_friend_with:req.body.id_user,
          confirmed:0
        }
      });

      return res.json({
        success:true
      });
    } catch(e) {
      Logger.log(e,'friends');

      return next(genError('PENDING_FATAL_ERROR'));
    }
  });


  router.post('/delete_friend',async(req,res,next) => {
    try {
      const { id_user:IdUserRemoving } = req.user;
      const { IdFriendToRemove } = req.body;

      if ( !IdUserRemoving || !IdFriendToRemove ) {
        const error = new Error();
        error.message = 'No friends specified';
        error.errorCode = 'FRIENDS_MISSING_DATA';

        return next(error); 
      }

      const Friends = new FriendsModel();

      // check if user is actualy a friend with another user
      const [ userInFriendsList ] = await Friends.select({
        limit:1,
        where:{
          id_friend_is:IdUserRemoving,
          id_friend_with:IdFriendToRemove,
          confirmed:1
        }
      });

      if ( !userInFriendsList ) {
        return next(genError('FRIENDS_FATAL_ERROR'));
      }

      const q1 = Friends.deleteMultiple({
        confirm:true,
        where:{
          id_friend_is:IdUserRemoving,
          id_friend_with:IdFriendToRemove
        }
      })

      const q2 = Friends.deleteMultiple({
        confirm:true,
        where:{
          id_friend_is:IdFriendToRemove ,
          id_friend_with:IdUserRemoving
        }
      });
      
      await Promise.all([q1,q2]);
      await io.updateFriends(IdUserRemoving,IdFriendToRemove);

      if ( io.users[IdFriendToRemove]) {
        io.to(io.users[IdFriendToRemove].socketID).emit('friend:friend-you-removed',{ IdUserRemoving });
      }

      return res.json({
        success:true
      });

    } catch(e) {
      Logger.log(e,'friends');

      return next(genError('FRIENDS_FATAL_ERROR'));
    }
  });



  router.post('/add_friend',async(req,res,next) => {
    try {
      const { id_user:idFrom } = req.user;
      const { id:idTo } = req.body;

      if ( !idFrom || !idTo ) {
        return next(genError('FRIENDS_MISSING_DATA')); 
      }

      const Friends = new FriendsModel();

      //Check if user has already added this user...
      const [ friend ] = await Friends.select({
        where:{
          id_friend_is:idFrom,
          id_friend_with:idTo
        }
      });

      if ( friend ) {
        return res.json({
          error:true,
          message:'You have already added this friend...',
          errorCode:'FRIENDS_ALREADY_ADDED'
        });
      }

      // Check if user has already been added by another user...
      const [ friendAlreadyAddedYou ] = await Friends.select({
        where:{
          id_friend_is:idTo,
          id_friend_with:idFrom
        }
      });

      if ( friendAlreadyAddedYou ) {
        return res.json({
          error:true,
          message:'User has already added you as a friend , go confirm the friend request...',
          errorCode:'FRIENDS_USER_ALREADY_ADDED'
        })
      }

      const Notifications = new NotificationsModel();

      const [ resultNotification ] = await Promise.all([
        Notifications.insertNewNotification({
          id_notification_type:1,
          notification_from:idFrom,
          notification_to:idTo
        }),
        Friends.insertNewFriend({
          id_friend_is:idFrom,
          id_friend_with:idTo,
          confirmed:0
        })
      ]);

      res.send({ success:true });

      if ( io.users[idTo] ) {
        const [ newNotification ] = await Notifications.select({
          columns:['id_notification','id_notification_type','username','id_user'],
          alias:'n',
          innerJoin:{
            user:['u','n.notification_from','u.id_user']
          },
          where:{ id_notification:resultNotification.insertId }
        });
        
        io.to(io.users[idTo].socketID).emit('notification:new-notification',newNotification);
      }
    } catch(e) {
      Logger.log(e,'friends');

      return next(genError('FRIENDS_FATAL_ERROR'));
    }
  });

  router.post('/confirm_friend',async(req,res,next) => {
    if ( !req.body.id ) {
      return next(genError('FRIENDS_CONFIRMING_FATAL_ERROR'));
    }

    const { id_user:idUserConfirming } = req.user;
    const { id:idUserToAdd } = req.body;

    const Friends = new FriendsModel()

    try {
      const [ friend ] = await Friends.select({
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
      Logger.log(e,'friends');

      return next(genError('FRIENDS_CONFIRMING_FATAL_ERROR'));
    }

    // check if another user has actually added this friend
    // friend request cancel could happend!
    try {
      const [ user ] = await Friends.select({
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
      const Notifications = new NotificationsModel();

      const [ notificationResult ] = await Promise.all([
        Notifications.insertNewNotification({
          id_notification_type:2,
          notification_from:idUserConfirming,
          notification_to:idUserToAdd
        }),
        Friends.insertNewFriend({
          id_friend_is:idUserConfirming,
          id_friend_with:idUserToAdd,
          confirmed:0
        })
      ]);

      await Friends.confirmFriends({
        userIDs:[idUserConfirming,idUserToAdd]
      });

      res.json({ success:true });

      io.updateFriends(idUserConfirming,idUserToAdd);

      if ( io.users[idUserConfirming] ) {
        const [ friend ] = await Friends.select({
          limit:1,
          columns:['id_user','username','online'],
          alias:'f',
          innerJoin:{
            user:['u','f.id_friend_with','u.id_user']
          },
          where:{
            id_friend_is:idUserConfirming,
            id_friend_with:idUserToAdd,
            confirmed:1,
          }
        });

        io.to(io.users[idUserConfirming].socketID).emit(
          'friends:user-confirmed',{ friend }
        );
      }

      if ( io.users[idUserToAdd] ) {
        const [ friend ] = await Friends.select({
          limit:1,
          columns:['id_user','username','online'],
          alias:'f',
          innerJoin:{
            user:['u','f.id_friend_with','u.id_user']
          },
          where:{
            id_friend_is:idUserToAdd,
            id_friend_with:idUserConfirming,
            confirmed:1,
          }
        });

        io.to(io.users[idUserToAdd].socketID).emit(
          'friends:user-confirmed',{ friend }
        );

        const [ newNotification ] = await Notifications.select({
          columns:['id_notification','id_notification_type','username','id_user'],
          alias:'n',
          innerJoin:{
            user:['u','n.notification_from','u.id_user']
          },
          where:{ id_notification:notificationResult.insertId }
        });

        io.to(io.users[idUserToAdd].socketID).emit(
          'notification:new-notification',newNotification
        );
      }
    } catch(e) {
      Logger.log(e,'friends');

      return next(genError('FRIENDS_CONFIRMING_FATAL_ERROR'));
    }
  });

  return router;
}