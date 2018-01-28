var errorHandler = require('../errors/error-handler')('[SYNC-FLOW]');
var NodeGit = require('nodegit-flow');
var gitRoot = require('../kb-git-root');
var keytar = require('keytar');
var kbUser = require('../services/kb-user');
var kbRepo = require('../services/kb-repo');
// var kbString = require('../kb-string');

var syncGitflow = {};
var token;

syncGitflow.syncBLAH = sync;
syncGitflow.sync = syncNew;

module.exports = syncGitflow;

var cloneOptions = {
  fetchOpts: {
    callbacks: {
      certificateCheck: function() {
        return 1;
      },
      credentials: function() {
        console.log('asked for credentials', token);
        return NodeGit.Cred.userpassPlaintextNew(token, 'x-oauth-basic');
      }
    }
  }
};

function syncNew() {
  var data = {};

  return kbRepo.openGit()
    .then(function(repo) {
      data.repo = repo;

      console.log('repo opened');

      return kbRepo.getGitConfigUser(data.repo);
    })
    .then(function(user) {
      data.user = user;

      console.log('repo user', data.user);

      return kbRepo.getGitConfig(data.repo);
    })
    .then(function(config) {

      data.config = config;

      console.log('repo user', data.config);

      return kbUser.getBitUserToken(data.user.name);
    })
    .then(function(_token) {
      console.log('WOW! user token!', _token);
      token = _token;
      return data.repo.fetchAll(cloneOptions.fetchOpts);
    })
    .then(function() {
      return data.repo.mergeBranches(
        data.config['gitflow.branch.master'],
        'origin/' + data.config['gitflow.branch.master']);
    })
    .then(function() {
      return data.repo.mergeBranches(
        data.config['gitflow.branch.develop'],
        'origin/' + data.config['gitflow.branch.develop']);
    })
    .then(function() {
      console.log('synced successfully');
      process.exit(0);
    })
    .catch(errorHandler);
}

function sync() {
  console.log('get started!');
  gitRoot.getGitRoot()
    .then(function(_gitRoot) {
      console.log('gitRoot passed');
      if (!_gitRoot) {
        console.info('git repo not found');
        process.exit(1);
      } else {
        GLOBAL.gitRoot = _gitRoot;
        // open the git repo if it exists
        console.log('opened repo');
        return NodeGit.Repository.open(GLOBAL.gitRoot);
      }
    })
    .then(function(repo) {
      GLOBAL.repo = repo;
      console.log('found repo. trying to fetch');
      return NodeGit.Remote.list(GLOBAL.repo);
    })
    .then(function(remoteList) {
      console.log('here are all the remotes:', remoteList);

      if (!remoteList.length) {
        console.log('no remotes found. need to add one to update');
        process.exit(1);
      }

      return GLOBAL.repo.config()
        .then(function(config) {
          return config.getString('kibibit.user');
        });
      // process.exit(0);

      // return GLOBAL.repo.fetch('origin', cloneOptions.fetchOpts);
    })
    .then(function(userToUse) {
      GLOBAL.username = userToUse;
      console.log('user to use', GLOBAL.username);
      return keytar.getPassword('kibibit-cli', GLOBAL.username);
    })
    .then(function(token) {
      GLOBAL.token = token;

      console.log('your token', token);
      return GLOBAL.repo.fetchAll(cloneOptions.fetchOpts);
      process.exit(1);
    })
    .then(function() {
      return NodeGit.Flow.getConfig(GLOBAL.repo);
    })
    .then(function(config) {
      GLOBAL.gitflowConfig = config;
      return GLOBAL.repo.mergeBranches(
        GLOBAL.gitflowConfig['gitflow.branch.master'],
        'origin/' + GLOBAL.gitflowConfig['gitflow.branch.master']);
    })
    .then(function() {
      return GLOBAL.repo.mergeBranches(
        GLOBAL.gitflowConfig['gitflow.branch.develop'],
        'origin/' + GLOBAL.gitflowConfig['gitflow.branch.develop']);
    })
    // TODO(thatkookooguy): also update current branch!
    // .done(function() {
    //   console.log('all done!');
    //   process.exit(0);
    // })
    .then(function(result) {
      console.log('the result?', result);
      process.exit(0);
    })
    .catch(function(error) {
      console.trace(error);
      process.exit(1);
    });
}
