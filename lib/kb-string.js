var kbString = {};

var clc = require('cli-color');
var _ = require('lodash');

var msgColors = clc.xterm(45).bgXterm(236);
var headerColors = clc.bgXterm(0);
var warningColors = clc.xterm(184);
var errorColors = clc.xterm(196);
var infoColors = clc.xterm(39);
var successColors = clc.xterm(42);
var whiteColors = clc.xterm(15);
var ohNoColors = clc.bgXterm(9).xterm(15);

kbString.important = buildImportant;
kbString.msg = buildMsg;
kbString.header = buildHeader;
kbString.warning = buildWarning;
kbString.error = buildError;
kbString.info = buildInfo;
kbString.success = buildSuccess;
kbString.white = buildWhite;
kbString.ohNo = buildOhNo;
kbString.param = buildParam;
kbString.kibibitLogo = kibibitLogo;
kbString.build = build;

module.exports = kbString;

function buildImportant() {
  return clc.bold.underline.blink(kbString.build.apply(this, arguments));
}

function buildParam() {
  return clc.cyan(kbString.build.apply(this, arguments));
}

function buildMsg() {
  return msgColors(kbString.build.apply(this, arguments));
}

function buildHeader() {
  return headerColors(kbString.build.apply(this, arguments));
}

function buildWarning() {
  return warningColors(kbString.build.apply(this, arguments));
}

function buildError() {
  return errorColors(kbString.build.apply(this, arguments));
}

function buildInfo() {
  return infoColors(kbString.build.apply(this, arguments));
}

function buildSuccess() {
  return successColors(kbString.build.apply(this, arguments));
}

function buildWhite() {
  return whiteColors(kbString.build.apply(this, arguments));
}

function buildOhNo() {
  return ohNoColors(kbString.build.apply(this, arguments));
}

function kibibitLogo(big) {
  if (big) {
    return kbString.build([
      ' _    ', kbString.error('_'), ' _     ', kbString.info('_'), ' _     ', kbString.warning('_'), ' _   \n',
      '| | _', kbString.error('(_)'), ' |__ ', kbString.info('(_)'), ' |__ ', kbString.warning('(_)'), ' |_ \n',
      "| |/ / ", kbString.error('|'), " '_ \\", kbString.info('| |'), " '_ \\", kbString.warning('| |'), " __|\n",
      '|   <', kbString.error('| |'), ' |_) ', kbString.info('| |'), ' |_) ', kbString.warning('| |'), ' |_ \n',
      '|_|\\_\\', kbString.error('_|'), '_.__/', kbString.info('|_|'), '_.__/', kbString.warning('|_|'), '\\__|\n'
    ]);
  }
  return kbString.build([
    kbString.white('k'),
    kbString.error('i'),
    kbString.white('b'),
    kbString.info('i'),
    kbString.white('b'),
    kbString.warning('i'),
    kbString.white('t')
  ]);
}

function build() {
  var array = _.isArray(arguments[0]) ? arguments[0] : arguments;

  return _.join(array, '');
}
