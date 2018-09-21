module.exports = function(io) {
  const
    passport = require('passport'),
    Logger   = require('../libs/Logger'),
    genError = require('../utils/generateError'),
    router   = require('express').Router();

  router.use(passport.authenticate('jwt',{ session:false }));

  const { sequelize,db:{ Notification } } = require('../Models/Models');

  router.get('/',async(req,res,next) => {
    try {
      const sql = `
        SELECT id_notification,id_notification_type,username,id_user
        FROM Notification n
        INNER JOIN User u
        ON n.notification_from = u.id_user
        WHERE notification_to = ?
      `;
      const notifications = await sequelize.query(sql,{
        replacements:[req.user.id_user],
        type: sequelize.QueryTypes.SELECT
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

      await Notification.destroy({
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
      await Notification.destroy({
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