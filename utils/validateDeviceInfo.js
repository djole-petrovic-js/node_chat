const validateDeviceInfo = (userDeviceInfo,sentDeviceInfo) => {
  if ( typeof userDeviceInfo === 'string' ) {
    userDeviceInfo = JSON.parse(userDeviceInfo);
  }

  if ( typeof sentDeviceInfo === 'string' ) {
    sentDeviceInfo = JSON.parse(sentDeviceInfo);
  }

  const allowedFields = ['uuid','serial','manufacturer'];

  for ( const field of allowedFields ) {
    if ( !(field in userDeviceInfo && field in sentDeviceInfo) ) {
      return false;
    }

    if ( userDeviceInfo[field] !== sentDeviceInfo[field] ) {
      return false;
    }
  }

  return true;
}

module.exports = validateDeviceInfo;