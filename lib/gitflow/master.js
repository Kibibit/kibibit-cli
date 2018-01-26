var errorHandler = require('../errors/error-handler')('[MASTER-FLOW]');
var kbRepo = require('../services/kb-repo');

var masterGitFlow = {};

masterGitFlow.master = master;

module.exports = masterGitFlow;

function master() {
  return kbRepo.openGit()
    .then(function(repo) {
      return kbRepo.checkoutMainBranch(repo, 'master');
    })
    .catch(errorHandler);
}
