module.exports = function(io) {
  const
    express  = require('express'),
    passport = require('passport'),
    Logger   = require('../libs/Logger'),
    genError = require('../utils/generateError'),
    router   = express.Router();

  const NotificationsModel = require('../models/notificationsModel');

  router.get('/',passport.authenticate('jwt',{ session:false }),async(req,res,next) => {
    try {
      const { id_user } = req.user , Notifications = new NotificationsModel();

      const notifications = await Notifications.getAllNotifications(id_user);

      res.json(notifications);
    } catch(e) {
      Logger.log(e,'notifications');

      return next(genError('NOTIFICATION_FATAL_ERROR'));
    }
  });

  router.post('/dismiss',passport.authenticate('jwt',{ session:false }),async(req,res,next) => {
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
        where:{
          id_notification:notificationID
        }
      });

      res.json({
        success:true
      });

    } catch(e) {
      Logger.log(e,'notifications');

      return next(genError('NOTIFICATION_FATAL_ERROR'));
    }
  });

  router.post('/dismiss_all',passport.authenticate('jwt',{ session:false }),async(req,res,next) => {
    const { id_user } = req.user;

    try {
      const Notifications = new NotificationsModel();

      await Notifications.deleteMultiple({
        confirm:true,
        where:{
          notification_to:id_user
        }
      });

      res.json({
        success:true
      });

    } catch(e) {
      Logger.log(e,'notifications');

      return next(genError('NOTIFICATION_FATAL_ERROR'));
    }
  });

  return router;
}