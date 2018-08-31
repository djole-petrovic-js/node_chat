class Types {
  static isNumber(object) {
      return Types.getType(object) === Types.allTypes.number;
  }

  static isString(object) {
    return Types.getType(object) === Types.allTypes.string;
  }

  static isBoolean(object) {
    return object === true  ||
           object === false || 
           Types.getType(object) === Types.allTypes.boolean;
  }

  static isFunction(object) {
    return Types.getType(object) === Types.allTypes.function;
  }

  static isObject(object) {
    return Types.getType(object) === Types.allTypes.object;
  }

  static isArray(object) {
    return Types.getType(Array.isArray) === Types.allTypes.function
      ? Array.isArray(object)
      : Types.getType(object) === Types.allTypes.array;
  }

  static isGenerator(object) {
    const type = Types.getType(object);

    return type === Types.allTypes.generator ||
           type === Types.allTypes.generatorFunction;
  }

  static isPromise(object) {
    return Types.getType(object) === Types.allTypes.promise &&
           Types.getType(object.then) === Types.allTypes.function
  }

  static isPromiseArray(object) {
    return Types.isArray(object) && object.every(x => Types.isPromise(x));
  }

  static isStringArray(object) {
    return Types.isArray(object) && object.every(x => Types.isString(x));
  }

  static isObjectEmpty(object) {
    return Object.keys(object).length === 0;
  }

  static getType(o) {
    return Object.prototype.toString.call(o);
  }

  static get allTypes() {
    return {
      number:'[object Number]',
      string:'[object String]',
      function:'[object Function]',
      object:'[object Object]',
      boolean:'[object Boolean]',
      promise:'[object Promise]',
      array:'[object Array]',
      generator:'[object Generator]',
      generatorFunction:'[object GeneratorFunction]'
    }
  }
}

module.exports = Types;