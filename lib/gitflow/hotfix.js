/*eslint-env es6*/
var errorHandler = require('../errors/error-handler')('[HOTFIX-FLOW]');
var NodeGit = require('nodegit-flow');
var kbRepo = require('../services/kb-repo');
var kbRender = require('../services/kb-render');

var hotfixGitflow = {};

hotfixGitflow.hotfix = hotfix;

module.exports = hotfixGitflow;

function startHotfix(repo, args) {
  var data = {};

  return NodeGit.Flow.startHotfix(
    repo,
    args.hotfixName
  )
    // .then(function(branch) {
    //   return branch;
    // })
    .catch(function() {
      console.log('found existing branch. checking out...');
      return NodeGit.Flow.getConfig(repo)
        .then(function(config) {
          data.currHotfixBranch =
            config['gitflow.prefix.hotfix'] + args.hotfixName;
          return kbRepo.checkoutMainBranch(repo, data.currHotfixBranch);
        });
    });
}

function hotfix(args, options) {
  var data = {};

  return kbRepo.openGit()
    .then(function(repo) {
      data.repo = repo;

      if (!args.hotfixName) {
        return kbRender.
          listAllBranchesOfType(data.repo, 'hotfix', options.remote);
      } else {
        return startHotfix(data.repo, args);
      }
    })
    .then(function() {
      process.exit(0);
    })
    .catch(errorHandler);
}
