var errorHandler = require('../errors/error-handler')('[FINISH-FLOW]');
var kbRepo = require('../services/kb-repo');

var finishGitflow = {};

finishGitflow.finish = finish;

module.exports = finishGitflow;

function finish() {
  var data = {};

  return kbRepo.openGit()
    .then(function(repo) {
      data.repo = repo;

      return kbRepo.getGitConfig(data.repo);
    })
    .then(function(config) {
      data.config = config;
      return data.repo.getCurrentBranch();
    })
    .then(function(branchRef) {
      return branchRef.name();
    })
    .then(function(branchName) {
      console.log(branchName);
      var name = branchName.replace(/.*\//gi, '');
      var gitflowBranchType = getBranchType(branchName, data.config);

      // later, this should be happening on github and not locally
      // UNLESS!!!! no remote or origin was found
      return kbRepo.finishGitflowBranch(data.repo, gitflowBranchType, name);
    })
    .then(function(mergeCommit) {
      // => the sha of the newly created commit
      console.log('merge commit!', mergeCommit);
      process.exit(0);
    })
    .catch(errorHandler);
}

function getBranchType(branchName, gitflowConfig) {
  // change to regex
  if (branchName.indexOf(gitflowConfig['gitflow.prefix.feature']) >= 0) {
    return 'feature';
  } else
  if (branchName.indexOf(gitflowConfig['gitflow.prefix.hotfix']) >= 0) {
    return 'hotfix';
  } else
  if (branchName.indexOf(gitflowConfig['gitflow.prefix.release']) >= 0) {
    return 'release';
  }
}
