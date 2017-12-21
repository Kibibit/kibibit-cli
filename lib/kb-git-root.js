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

  deferred.resolve(foundRoot);
} catch (error) {
  // console.error(error);
  gitRoot = null;
  deferred.resolve(null);
}

// console.log('this is gitRoot', gitRoot);

module.exports = kbGitRoot;

function getGitRoot() {
  return deferred.promise;
}
