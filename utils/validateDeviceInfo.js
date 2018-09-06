const validateDeviceInfo = (user,sentDeviceInfo) => {
  const allowedFields = ['uuid','serial','manufacturer'];

  for ( const field of allowedFields ) {
    const tmpField = field in user ? field : 'device_' + field;

    if ( !(tmpField in user && field in sentDeviceInfo) ) {
      return false;
    }

    if ( user[tmpField] !== sentDeviceInfo[field] ) {
      return false;
    }
  }

  return true;
}

module.exports = validateDeviceInfo;