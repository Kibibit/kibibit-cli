/*eslint-env es6*/
var errorHandler = require('../errors/error-handler')('[SYNC-FLOW]');
var NodeGit = require('nodegit-flow');
var kbUser = require('../services/kb-user');
var kbRepo = require('../services/kb-repo');
// var kbString = require('../kb-string');

var syncGitflow = {};
var token;

syncGitflow.sync = sync;

module.exports = syncGitflow;

var cloneOptions = {
  fetchOpts: {
    callbacks: {
      certificateCheck: function() {
        return 1;
      },
      credentials: function() {
        // console.log('asked for credentials', token);
        return NodeGit.Cred.userpassPlaintextNew(token, 'x-oauth-basic');
      }
    }
  }
};

function sync() {
  var data = {};

  return kbRepo.openGit()
    .then(function(repo) {
      data.repo = repo;

      return kbRepo.getGitConfigUser(data.repo);
    })
    .then(function(user) {
      data.user = user;

      return kbRepo.getGitConfig(data.repo);
    })
    .then(function(config) {
      data.config = config;

      return kbUser.getBitUserToken(data.user.name);
    })
    .then(function(_token) {
      token = _token;
      return data.repo.fetchAll(cloneOptions.fetchOpts);
    })
    .then(function() {
      return data.repo.mergeBranches(
        data.config['gitflow.branch.master'],
        'origin/' + data.config['gitflow.branch.master']);
    })
    .then(function() {
      console.log(`synced ${data.config['gitflow.branch.master']} branch`);
      return data.repo.mergeBranches(
        data.config['gitflow.branch.develop'],
        'origin/' + data.config['gitflow.branch.develop']);
    })
    .then(function() {
      console.log(`synced ${data.config['gitflow.branch.develop']} branch`);
      return data.repo.getCurrentBranch();
    })
    .then(function(currentBranchRef) {
      data.currBranchRef = currentBranchRef;
      data.currBranchName = data.currBranchRef.name()
        .replace('refs/heads/', '');;
      data.remoteBranchName = 'origin/' + data.currBranchName;
      return data.repo.mergeBranches(
        data.currBranchRef,
        data.remoteBranchName)
        .then(function() {
          console.log(`synced ${data.currBranchName} branch`);
        })
        .catch(function() {
          return;
        });
    })
    .then(function() {
      return NodeGit.Remote.lookup(data.repo, 'origin');
    })
    .then(function(originRef) {
      // push current branch to remote to save recent changes.
      return originRef.push([ `${data.currBranchRef}:${data.currBranchRef}` ],
        cloneOptions.fetchOpts)
        .then(function() {
          console.log(`pushed ${data.currBranchName} branch to origin`);
        });
    })
    .then(function() {
      console.log('synced successfully');
      process.exit(0);
    })
    .catch(errorHandler);
}
