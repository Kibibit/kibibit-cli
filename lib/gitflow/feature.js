/*eslint-env es6*/
var errorHandler = require('../errors/error-handler')('[FEATURE-FLOW]');
var NodeGit = require('nodegit-flow');
var kbRepo = require('../services/kb-repo');
var kbRender = require('../services/kb-render');

var featureGitflow = {};

featureGitflow.feature = feature;

module.exports = featureGitflow;

function startFeature(repo, args) {
  var data = {};

  return NodeGit.Flow.startFeature(
    repo,
    args.featureName
  )
    // .then(function(branch) {
    //   return branch;
    // })
    .catch(function() {
      console.log('found existing branch. checking out...');
      return NodeGit.Flow.getConfig(repo)
        .then(function(config) {
          data.currFeatureBranch =
            config['gitflow.prefix.feature'] + args.featureName;
          return kbRepo.checkoutMainBranch(repo, data.currFeatureBranch);
        });
    });
}

function feature(args, options) {
  var data = {};

  return kbRepo.openGit()
    .then(function(repo) {
      data.repo = repo;

      if (!args.featureName) {
        return kbRender.
          listAllBranchesOfType(data.repo, 'feature', options.remote);
      } else {
        return startFeature(data.repo, args);
      }
    })
    .then(function() {
      process.exit(0);
    })
    .catch(errorHandler);
}
