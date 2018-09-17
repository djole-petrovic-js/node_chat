module.exports = function(io) {
  const
    passport = require('passport'),
    Logger   = require('../libs/Logger'),
    genError = require('../utils/generateError'),
    router   = require('express').Router();

  const NotificationsModel = require('../models/notificationsModel');
  const Notification = new NotificationsModel();

  router.use(passport.authenticate('jwt',{ session:false }));

  router.get('/',async(req,res,next) => {
    try {
      const notifications = await Notification.select({
        columns:['id_notification','id_notification_type','username','id_user'],
        alias:'n',
        innerJoin:{
          user:['u','n.notification_from','u.id_user']
        },
        where:{ notification_to:req.user.id_user }
      });

      res.json(notifications);
    } catch(e) {
      Logger.log(e,'notifications:root');

      return next(genError('NOTIFICATION_FATAL_ERROR'));
    }
  });

  router.post('/dismiss',async(req,res,next) => {
    try {
      const { notificationID } = req.body;

      if ( !notificationID ) {
        return res.json({
          error:true,
          message:'You didnt select notification to delete...',
          errorCode:'NOTIFICATION_FATAL_ERROR'
        });
      }

      await Notification.deleteOne({
        where:{ id_notification:notificationID }
      });

      return res.json({ success:true });
    } catch(e) {
      Logger.log(e,'notifications:dismiss');

      return next(genError('NOTIFICATION_FATAL_ERROR'));
    }
  });

  router.post('/dismiss_all',async(req,res,next) => {
    try {
      await Notification.deleteMultiple({
        confirm:true,
        where:{ notification_to:req.user.id_user }
      });

      return res.json({ success:true });
    } catch(e) {
      Logger.log(e,'notifications:dismiss_all');

      return next(genError('NOTIFICATION_FATAL_ERROR'));
    }
  });

  return router;
}