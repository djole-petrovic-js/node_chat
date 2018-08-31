const generateError = (errorCode,message = 'None', status = 500) => {
  const error = new Error();

  error.errorCode = errorCode;
  error.message = message;
  error.status = status;

  return error;
}

module.exports = generateError;