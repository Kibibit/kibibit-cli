var os = require('os');
var kbString = require('kb-string');
var gitRoot = require('kb-git-root');

var info = {
  runFolder: process.cwd(),
  gitRoot: gitRoot,
  os: {
    username: os.userInfo().username,
    hostname: os.hostname(),
    type: os.type()
  }
  signInAnimation: [
    kbString.info(kbString.warning('/'), ' Signing in'),
    kbString.info(kbString.warning('|'), ' Signing in..'),
    kbString.info(kbString.warning('\\'), ' Signing in..'),
    kbString.info(kbString.warning('-'), ' Signing in...')
  ]
};
