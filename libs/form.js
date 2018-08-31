const Types = require('./types');

class Form {
  constructor(formData) {
    if ( !formData || !Types.isObject(formData) ) {
      throw new Error('Form data missing or not an object...');
    }

    for ( const key of Object.keys(formData) ) {
      formData[key] = formData[key].trim();
    }

    this.formData = formData;
    this.currentWorkingField = null;
    this.currentWorkingFieldValue = null;
    this.fields = {};
    this.errors = [];
    this.dataToClean = {};
  }

  field(fieldName) {
    this.fields[fieldName] = [];

    this.currentWorkingField = fieldName;
    this.currentWorkingFieldValue = this.formData[fieldName];

    return this;
  }

  validate(criteria,criteriaToMatch,errorMessage) {
    if ( Types.isFunction(this[criteria]) ) {
      this[criteria](criteriaToMatch,errorMessage);

      return this;
    } else {
      throw new Error('Method you tried to call doesnt exist...');
    }
  }

  required(errorMessage) {
    if ( !this.currentWorkingFieldValue || this.currentWorkingFieldValue === '' ) {
      this.pushErrors(errorMessage);
    } else {
      this.dataToClean[this.currentWorkingField] = this.currentWorkingFieldValue;
    }

    return this;
  }

  minlength(criteriaToMatch,errorMessage) {
    if ( !(this.currentWorkingFieldValue.length >= criteriaToMatch) ) {
      this.pushErrors(errorMessage);
    } else {
      this.dataToClean[this.currentWorkingField] = this.currentWorkingFieldValue;
    }

    return this;
  }

  maxlength(criteriaToMatch,errorMessage) {
    if ( !(this.currentWorkingFieldValue.length <= criteriaToMatch) ) {
      this.pushErrors(errorMessage);
    } else {
      this.dataToClean[this.currentWorkingField] = this.currentWorkingFieldValue;
    }

    return this;
  }

  equalsAnotherField(fieldToMatch,errorMessage) {
    if ( 
      this.currentWorkingFieldValue === '' ||
      this.currentWorkingFieldValue !==  this.formData[fieldToMatch] 
    ) {
      this.pushErrors(errorMessage);
    } else {
      this.dataToClean[this.currentWorkingField] = this.currentWorkingFieldValue;
    }

    return this;
  }

  equals(criteriaToMatch,errorMessage) {
    if ( this.currentWorkingFieldValue !==  criteriaToMatch ) {
      this.pushErrors(errorMessage);
    } else {
      this.dataToClean[this.currentWorkingField] = this.currentWorkingFieldValue;
    }

    return this;
  }

  email(errorMessage) {
    const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    if ( !emailRegex.test(this.currentWorkingFieldValue) ) {
      this.pushErrors(errorMessage);
    } else {
      this.dataToClean[this.currentWorkingField] = this.currentWorkingFieldValue;
    }

    return this;
  }

  regex(regexToMatch,errorMessage) {
    if ( !regexToMatch.test(this.currentWorkingFieldValue) ) {
      this.pushErrors(errorMessage);
    } else {
      this.dataToClean[this.currentWorkingField] = this.currentWorkingFieldValue;
    }

    return this;
  }

  inList(list,errorMessage) {
    if ( !list.includes(this.currentWorkingFieldValue) ) {
      this.pushErrors(errorMessage);
    } else {
      this.dataToClean[this.currentWorkingField] = this.currentWorkingFieldValue;
    }

    return this;
  }

  pushErrors(errorMessage) {
    this.fields[this.currentWorkingField].push(errorMessage);
    this.errors.push(errorMessage);
  }

  getCleanData() {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };

    for ( let [ key , value ] of Object.entries(this.dataToClean) ) {
      this.dataToClean[key] = this
        .dataToClean[key]
        .replace(/[&<>"']/g, function(m) { return map[m]; });
    }

    return this.dataToClean;
  }

  getErrorsForEachField() {
    return this.fields;
  }

  isValid() {
    return this.errors.length === 0;
  }
}

module.exports = Form;