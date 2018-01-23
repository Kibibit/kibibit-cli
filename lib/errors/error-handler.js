/*eslint-env es6*/
var _ = require('lodash');

module.exports = function errorHandlerClosure(prefix) {
  // console.log('error handler created for ', prefix);
  return function errorHandler(error) {
    var logError = error.exitStatus === 0 || error.noTrace ?
      console.error : console.trace;
    var exitStatus = _.isNumber(error.exitStatus) ? error.exitStatus : 1;

    prefix = _.isString(prefix) ? _.trim(prefix) + ' ' : '';

    logError(prefix + error);

    process.exit(exitStatus);
  };
};
