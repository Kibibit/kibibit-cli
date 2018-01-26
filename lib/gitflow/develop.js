var errorHandler = require('../errors/error-handler')('[DEVELOP-FLOW]');
var kbRepo = require('../services/kb-repo');

var developGitFlow = {};

developGitFlow.develop = develop;

module.exports = developGitFlow;

function develop() {
  return kbRepo.openGit()
    .then(function(repo) {
      return kbRepo.checkoutMainBranch(repo, 'develop');
    })
    .catch(errorHandler);
}
