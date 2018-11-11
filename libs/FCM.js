const admin = require('firebase-admin');
const serviceAccount = require('../nhc.json');
const { db:{ User } } = require('../Models/Models');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
},'nohistorychat');

const messaging = admin.messaging(admin.app('nohistorychat'));

class FCM {
  static async send(token,payload,options) {
    try {
      const res = await messaging.sendToDevice(token,payload,options);

      return res;
    } catch(e) {
      throw e;
    }
  }

  static async sendWithUserPermissionChecking({ id,title,body }) {
    try {
      const user = await User.findOne({
        attributes:['push_notifications_enabled','push_registration_token'],
        where:{ id_user:id }
      });

      if ( user.push_notifications_enabled && user.push_registration_token ) {
        await FCM.send(user.push_registration_token,{
          notification:{
            sound:'default',
            title,
            body,
          },
        },{
          sound:'default',
          priority:'high',
        });

        return true;
      }
    } catch(e) {
      global.Logger.log(e,'FCM:sendWithUserPermissionChecking');

      return false;
    }

    return false;
  }
}

module.exports = FCM;