var KbError = require('./errors/KbError');
var currentFolder = process.cwd();
var path = require('path');
var fs = require('fs');
var Q = require('q');

var findRoot = require('find-root');

var kbGitRoot = {};

kbGitRoot.getGitRoot = getGitRoot;

var deferred = Q.defer();

try {
  var foundRoot = findRoot(currentFolder, function (dir) {
    return fs.existsSync(path.resolve(dir, '.git'));
  });
  // console.log('found git root', foundRoot);
  deferred.resolve(foundRoot);
} catch (error) {
  // console.error('no git root found', error);
  // gitRoot = null;
  var err = new KbError('git repo not found', 1, true);
  deferred.reject(err);
}

// console.log('this is gitRoot', gitRoot);

module.exports = kbGitRoot;

function getGitRoot() {
  // console.log('yo');
  return deferred.promise;
}
