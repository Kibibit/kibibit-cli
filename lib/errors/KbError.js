/*eslint-env es6*/
var _ = require('lodash');

module.exports = class KbError extends Error {
  constructor(message, exitStatus, noTrace) {

    // Calling parent constructor of base Error class.
    super(message);

    // Saving class name in the property of our custom error as a shortcut.
    this.name = this.constructor.name;
    this.noTrace = noTrace || false;

    // Capturing stack trace, excluding constructor call from it.
    Error.captureStackTrace(this, this.constructor);

    // process.exit exit status.
    // default is to throw an error
    // set to 0 if you want to show error gracefully (intentional)
    this.exitStatus = _.isNumber(exitStatus) ? exitStatus : 1;

  }
};
