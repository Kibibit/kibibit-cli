var kbString = require('../kb-string');
var gitRoot = require('../kb-git-root');
var kbUser = require('../services/kb-user');
var kbRepo = require('../services/kb-repo');
var errorHandler = require('../errors/error-handler')('[INIT-FLOW]');
var currentFolder = process.cwd();

var initGitflow = {};

initGitflow.init = init;

module.exports = initGitflow;

function init() {
  var GLOBAL = {};

  gitRoot.getGitRoot()
    .then(function(root) {
      GLOBAL.root = root;

      return kbRepo.openGit();
    })
    .catch(function() {
      console.info(kbString.error('git repo not found'));
      console.log('initializing...');

      GLOBAL.root = currentFolder;

      return kbRepo.initGit(GLOBAL.root);
    })
    .then(function(repo) {
      GLOBAL.repo = repo;

      return kbRepo.ensureGitFlowNotInitialized(GLOBAL.repo);
    })
    .then(kbString.printFlash)
    .then(kbUser.questions.selectOrCreateUser)
    .then(function(user) {
      GLOBAL.user = user;
      return kbRepo.setGitConfigUser(GLOBAL.repo, GLOBAL.user);
    })
    .then(function() {
      return kbRepo.ensureBasicGitFlowDetails(GLOBAL.root,
        GLOBAL.repo, GLOBAL.user);
    })
    .then(function() {
      return kbRepo.questions.createRepoOrigin(GLOBAL.repo, GLOBAL.user);
    })
    .then(function() {
      console.log('git flow repo initialized');
      process.exit(0);
    })
    .catch(errorHandler);
}
