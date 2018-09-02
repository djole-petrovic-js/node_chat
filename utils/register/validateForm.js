const Form = require('../../libs/form');

const validateForm = function(formData) {
  return new Promise((resolve,reject) => {
    const form = new Form(formData);

    form
      .field('username')
      .validate('required','You have to enter username')
      .validate('minlength',5,'Username has to be at least 5 characters long')
      .validate('maxlength',20,'Username is longer than 20 characters')
      .validate('regex',/^[a-zA-Z0-9\._]{5,20}$/g,'Username is not properly formated');
    
    const passwordErrorMsg = 'Password must containt one digit, and one uppercase letter. Numbers, letters "\." and "_" are allowed';

    form
      .field('password')
      .validate('required','You have to enter password')
      .validate('minlength',8,'Password has to be at least 8 characters long')
      .validate('maxlength',25,'Maximum of 25 characters for password.')
      .validate('regex',/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z\._]{8,25}$/g,passwordErrorMsg)
      .validate('equalsAnotherField','confirmPassword','Passwords doesnt match...');

    form
      .field('email')
      .validate('required','You have to enter email')
      .validate('email','That is not an email');

    if ( form.isValid() ) {
      resolve({
        isValid:true,
        cleanData:form.getCleanData()
      });
    } else {
      resolve({
        isValid:false,
        errors:form.getErrorsForEachField()
      })
    }
  });
}

module.exports = validateForm;