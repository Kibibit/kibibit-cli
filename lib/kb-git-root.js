var findRoot = require('find-root');

var gitRoot;

try {
  gitRoot = findRoot(currentFolder, function (dir) {
    return fs.existsSync(path.resolve(dir, '.git'));
  });
} catch (error) {
  console.error(error);
}

console.log('this is gitRoot', gitRoot);

module.exports = gitRoot;
