const validateDeviceInfo = (user,sentDeviceInfo) => {
  const allowedFields = ['uuid','serial','manufacturer'];

  for ( const field of allowedFields ) {
    if ( !('device_' + field in user && field in sentDeviceInfo) ) {
      return false;
    }

    if ( user['device_' + field] !== sentDeviceInfo[field] ) {
      return false;
    }
  }

  return true;
}

module.exports = validateDeviceInfo;