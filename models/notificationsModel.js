const Model = require('./model');

class NotificationsModel extends Model {
  constructor(tableName) {
    super();

    this.tableName = tableName || 'notification';
  }

  getAllNotifications(id_user) {
    return new Promise(async (resolve,reject) => {
      if ( !id_user ) {
        return reject('NotificationModel: no user id is given');
      }

      try {
        const notifications = await this.select({
          columns:['id_notification','id_notification_type','username','id_user'],
          alias:'n',
          innerJoin:{
            user:['u','n.notification_from','u.id_user']
          },
          where:{ notification_to:id_user }
        });

        resolve(notifications);
      } catch(e) {
        reject(e);
      }
    });
  }

  insertNewNotification(notificationsOptions) {
    return new Promise(async (resolve,reject) => {
      try {
        const result = await this.insert(notificationsOptions);

        resolve(result);
      } catch(e) {
        reject(e);
      }
    });
  }
}

module.exports = NotificationsModel;