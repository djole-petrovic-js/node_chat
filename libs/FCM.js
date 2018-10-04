const admin = require('firebase-admin');

const serviceAccount = require('../nhc.json');

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
}

module.exports = FCM;