/*eslint-env es6*/
var errorHandler = require('../errors/error-handler')('[RELEASE-FLOW]');
var NodeGit = require('nodegit-flow');
var kbRepo = require('../services/kb-repo');
var kbRender = require('../services/kb-render');

var releaseGitflow = {};

releaseGitflow.release = release;

module.exports = releaseGitflow;

function startRelease(repo, args) {
  var data = {};

  return NodeGit.Flow.startRelease(
    repo,
    args.releaseName
  )
    // .then(function(branch) {
    //   return branch;
    // })
    .catch(function() {
      console.log('found existing branch. checking out...');
      return NodeGit.Flow.getConfig(repo)
        .then(function(config) {
          data.currReleaseBranch =
            config['gitflow.prefix.release'] + args.releaseName;
          return kbRepo.checkoutMainBranch(repo, data.currReleaseBranch);
        });
    });
}

function release(args, options) {
  var data = {};

  return kbRepo.openGit()
    .then(function(repo) {
      data.repo = repo;

      if (!args.releaseName) {
        return kbRender.
          listAllBranchesOfType(data.repo, 'release', options.remote);
      } else {
        return startRelease(data.repo, args);
      }
    })
    .then(function() {
      process.exit(0);
    })
    .catch(errorHandler);
}
