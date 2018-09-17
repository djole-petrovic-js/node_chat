class SocketEventsLockdown {
  constructor() {
    this.lockedUserSockets = {};
  }

  wait(userID) {
    return new Promise((resolve) => {
      if ( !this.lockedUserSockets[userID] ) {
        return resolve();
      }
      // it can happend that use is deleted, but another timeout is still trying
      // to unlock, which causes an exception. With catch block it is safe to
      // just resolve the promise.
      const checkForCompletion = () => {
        try {
          if ( this.lockedUserSockets[userID].connect && this.lockedUserSockets[userID].disconnect ) {
            delete this.lockedUserSockets[userID];
            resolve();
          } else {
            setTimeout(checkForCompletion,500);
          }
        } catch(e) {
          resolve();
        }
      }

      checkForCompletion();
    });
  }

  lock(userID) {
    this.lockedUserSockets[userID] = {
      connect:false,
      disconnect:false
    }
  }

  unlock(userID,event) {
    if ( !['connect','disconnect'].includes(event) ) {
      throw new Error('Unlocking events can only be connect or disconnect');
    }

    this.lockedUserSockets[userID][event] = true;
  }
}

module.exports = new SocketEventsLockdown();