var NodeGit = require('nodegit-flow');
var gitRoot = require('../kb-git-root');

var GLOB = {
  config: {},
  repo: {}
};

var finishGitflow = {};

finishGitflow.finish = finish;

module.exports = finishGitflow;

function finish() {
  gitRoot.getGitRoot()
    .then(function(_gitRoot) {
      if (!_gitRoot) {
        console.info(kbString.error('git repo not found'));
        process.exit(1);
      }

      GLOB.gitRoot = _gitRoot;

      return NodeGit.Repository.open(GLOB.gitRoot);
    })
    .then(function(repo) {
      GLOB.repo = repo;
      return NodeGit.Flow.getConfig(repo);
    })
    .then(function(config) {
      GLOB.config = config;
      console.log(config);
      return GLOB.repo.getCurrentBranch();
    })
    .then(function(branchRef) {
      return branchRef.name();
    })
    .then(function(branchName) {
      console.log(branchName);
      if (branchName.indexOf(GLOB.config['gitflow.prefix.feature']) >= 0) {
        console.log('feature branch');
        var featureName = branchName.replace(/.*\//gi, '');
        return NodeGit.Flow.finishFeature(GLOB.repo, featureName);
      } else
      if (branchName.indexOf(GLOB.config['gitflow.prefix.hotfix']) >= 0) {
        console.log('hotfix branch');
        var hotfixName = branchName.replace(/.*\//gi, '');
        return NodeGit.Flow.finishHotfix(GLOB.repo, hotfixName);
      } else
      if (branchName.indexOf(GLOB.config['gitflow.prefix.release']) >= 0) {
        console.log('release branch');
        var releaseName = branchName.replace(/.*\//gi, '');
        return NodeGit.Flow.finishRelease(GLOB.repo, releaseName);
      } else {
        console.log('not a branch you can finish!');
      }
      process.exit(0);
    })
    .then(function(mergeCommit) {
      console.log(mergeCommit); // => the sha of the newly created commit
      process.exit(0);
    })
    .catch(function(error) {
      console.error(error);
      process.exit(1);
    });
}
