module.exports = function(io) {
  const
    passport = require('passport'),
    Logger   = require('../libs/Logger'),
    genError = require('../utils/generateError'),
    router   = require('express').Router();

  const NotificationsModel = require('../models/notificationsModel');

  router.use(passport.authenticate('jwt',{ session:false }));

  router.get('/',async(req,res,next) => {
    try {
      const Notifications = new NotificationsModel();
      const notifications = await Notifications.getAllNotifications(req.user.id_user);

      res.json(notifications);
    } catch(e) {
      Logger.log(e,'notifications');

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

      const Notifications = new NotificationsModel();

      await Notifications.deleteOne({
        where:{ id_notification:notificationID }
      });

      return res.json({ success:true });
    } catch(e) {
      Logger.log(e,'notifications');

      return next(genError('NOTIFICATION_FATAL_ERROR'));
    }
  });

  router.post('/dismiss_all',async(req,res,next) => {
    try {
      const Notifications = new NotificationsModel();

      await Notifications.deleteMultiple({
        confirm:true,
        where:{ notification_to:req.user.id_user }
      });

      return res.json({ success:true });
    } catch(e) {
      Logger.log(e,'notifications');

      return next(genError('NOTIFICATION_FATAL_ERROR'));
    }
  });

  return router;
}