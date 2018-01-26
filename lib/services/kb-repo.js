/*eslint-env es6*/
var KbError = require('../errors/KbError');
var gitRoot = require('../kb-git-root');
var NodeGit = require('nodegit-flow');
var inquirer = require('inquirer');
var colorize = require('json-colorizer');
var kbString = require('../kb-string');
var kbGithub = require('./kb-github');
var _ = require('lodash');
var writeFile = require('write-file-promise');
var readFile = require('fs-readfile-promise');
var Q = require('q');
var path = require('path');

Q.longStackSupport = true;

var kbRepo = {};

kbRepo.getCurrentGitFilesStatus = getStatus;
kbRepo.commitFilesByPath = commitFilesByPath;
kbRepo.getBitConfig = getBitConfig;
kbRepo.saveBitConfig = saveBitConfig;
kbRepo.openGit = openGit;
kbRepo.initGit = initGit;
kbRepo.ensureGitFlowNotInitialized = ensureGitFlowNotInitialized;
kbRepo.ensureBasicGitFlowDetails = ensureBasicGitFlowDetails;
kbRepo.setGitConfigUser = setGitConfigUser;

kbRepo.questions = {};
kbRepo.questions.masterBranch = askNameOfMasterBranch();
kbRepo.questions.developBranch = askNameOfDevelopBranch();
kbRepo.questions.featureBranchPrefix = askPrefixOfFeatureBranches();
kbRepo.questions.hotfixBranchPrefix = askPrefixOfHotfixBranches();
kbRepo.questions.releaseBranchPrefix = askPrefixOfReleaseBranches();
kbRepo.questions.shouldSaveBitConfig = askIfShouldSaveBitConfig();
kbRepo.questions.createRepoOrigin = createRepoOrigin;

module.exports = kbRepo;

function getBitConfig(rootFolder) {
  console.log('trying to read file', rootFolder + '/.bit.json');
  return readFile(rootFolder + '/.bit.json', 'utf8');
}

function saveBitConfig(rootFolder, config) {
  var configStr = JSON.stringify(config, null, 2);
  return writeFile(rootFolder + '/.bit.json', configStr)
    .catch(function(error) {
      console.error('something went wrong!', error);
    });
}

function setGitConfigUser(repo, user) {
  var data = {};
  return repo.config()
    .then(function(config) {
      data.config = config;
      return data.config.setString('user.name', user.username);
    })
    .then(function() {
      return data.config.setString('user.email', user.email);
    });
}

function ensureBasicGitFlowDetails(rootFolder, repo, user) {
  var data = {};
  console.log('getting bitconfig');
  // check if bit config exists. if so, use it. else, ask user for details
  // and check if he wants to save those details globally for all users
  return kbRepo.getBitConfig(rootFolder)
    .then(function(repoBitConfig) {
      console.log('found config file', repoBitConfig);
      console.log('checking validity...');

      return checkConfigSchema(repoBitConfig);
    })
    .then(function(config) {
      data.userOptions = config;
    })
    .catch(function() {
      console.log('valid bit config not found');
      return inquirer.prompt([
        kbRepo.questions.masterBranch,
        kbRepo.questions.developBranch,
        kbRepo.questions.featureBranchPrefix,
        kbRepo.questions.hotfixBranchPrefix,
        kbRepo.questions.releaseBranchPrefix,
        kbRepo.questions.shouldSaveBitConfig
      ])
        .then(function(answers) {

          answers.featureBranchesPrefix =
          ensureSlash(answers.featureBranchesPrefix);
          answers.releaseBranchesPrefix =
          ensureSlash(answers.releaseBranchesPrefix);
          answers.hotfixBranchesPrefix =
          ensureSlash(answers.hotfixBranchesPrefix);

          console.log(kbString.build([
            '\nnew ', kbString.kibibitLogo(), ' gitflow repo will be ',
            'initialized with these settings:'
          ]));
          console.log(colorize(JSON.stringify(answers, null, '  ')));

          data.userOptions = {
            'gitflow.branch.master': answers.masterBranch,
            'gitflow.branch.develop': answers.developBranch,
            'gitflow.prefix.feature': answers.featureBranchesPrefix,
            'gitflow.prefix.release': answers.releaseBranchesPrefix,
            'gitflow.prefix.hotfix': answers.hotfixBranchesPrefix,
            'gitflow.prefix.versiontag': ''
          };

          // console.log('should save?', answers.shouldSaveBitConfig);
          data.shouldSaveBitConfig = answers.shouldSaveBitConfig;
          data.configPath = rootFolder + '/.bit.json';

          return data.shouldSaveBitConfig &&
          kbRepo.saveBitConfig(rootFolder, data.userOptions);
        });
    })
    .then(function() {

      // here, we need to make sure that master branch exists
      // and have an initial commit
      return repo.getBranchCommit('master')
        // no initial commit?
        // no problem. make one!
        .catch(makeInitialCommit(repo,
          user, data.shouldSaveBitConfig, data.configPath));
    })
    .then(function(commit) {
      commit = commit.commit || commit;
      if (data.userOptions['gitflow.branch.master'] !== 'master') {
        return repo.createBranch(
          data.userOptions['gitflow.branch.master'], commit);
      }

      return commit;
    })
    .then(function(/* commit */) {
      // we now have all the user preferences and we can
      // initialize git-flow into the repo
      return NodeGit.Flow.init(repo, data.userOptions);
    })
    .then(function() {
      return repo.checkoutBranch(data.userOptions['gitflow.branch.master'])
        .then(function() {
          if (data.userOptions['gitflow.branch.master'] !== 'master') {
            return repo.getBranch('master');
          }

          return;
        })
        .then(function(oldMasterBranch) {
          if (!oldMasterBranch) { return; }
          var result = NodeGit.Branch.delete(oldMasterBranch);
          console.log('deleted old master branch', result);
        });
    });
}

function createRepoOrigin(repo, user) {
  var data = {};
  return inquirer.prompt([{
    type: 'list',
    name: 'whereToCreate',
    message: 'Where should repo be created?',
    choices: [
      user.username,
      new inquirer.Separator()
    ].concat(user.orgs)
  },
  {
    type: 'input',
    name: 'repoName',
    message: 'what do you want to name the repo?',
  },
  {
    type: 'input',
    name: 'repoDescription',
    message: 'give the repo a short description (optional)',
  }])
    .then(function(answers) {
      data.repoName = answers.repoName;
      data.repoDescription = answers.repoDescription;

      if (answers.whereToCreate === user.username) {
        return kbGithub.createRepoUser(user,
          data.repoName, data.repoDescription);
      } else {
        return kbGithub.createRepoOrg(user, answers.whereToCreate,
          data.repoName, data.repoDescription);
      }
    })
    .then(function(body) {
      console.log('created repo', body.clone_url);

      // OR ORIGIN!!!!!! INSTEAD OF NAME
      return NodeGit.Remote
        .create(repo, 'origin', body.clone_url);
    })
    .then(function(remote) {
      data.remote = remote;
      // console.log('successfully added a new remote!', data.remote.name());

      return NodeGit.Flow.getConfig(repo);
    })
    .then(function(config) {
      var master = config['gitflow.branch.master'];
      var develop = config['gitflow.branch.develop'];
      return data.remote.push([
        `refs/heads/${master}:refs/heads/${master}`,
        `refs/heads/${develop}:refs/heads/${develop}`
      ], {
        callbacks: {
          certificateCheck: function() {
            return 1;
          },
          credentials: function() {
            // console.log('asked for credentials', user.token);
            return NodeGit.Cred
              .userpassPlaintextNew(user.token, 'x-oauth-basic');
          }
        }
      });
    });
}

function commitFilesByPath(repo, options) {
  var index, parents;
  var returnData = {};
  return repo.refreshIndex()
    .then(function(idx) {
      index = idx;

      return options.filesToCommit ?
        addFilesToIndex(index, options.filesToCommit) :
        true;
    })
    .then(function() {
      return index.write();
    })
    .then(function() {
      return repo.getCurrentBranch()
        .catch(function() {
          return 'refs/heads/master';
        });
    })
    .then(function(currentBranchRef) {
      returnData.branch = currentBranchRef.name ?
        currentBranchRef.name() :
        currentBranchRef;
      return repo.getHeadCommit()
        .then(function(commitId) {
          return commitId ? [ commitId ] : [];
        })
        .catch(function() {
          // wasn't able to get the last commit.
          // this means this is the first commit.
          return [];
        });
    })
    .then(function(parentArray) {
      parents = parentArray;
      // console.log('file added to index?');
      return index.writeTree();
    })
    .then(function(oid) {
      var signature = options.user ?
        NodeGit.Signature.now(options.user.username, options.user.email) :
        NodeGit.Signature.default(repo);

      returnData.oid = oid;
      returnData.parents = _.map(parents, (branch) => { return branch.id(); });
      returnData.commitMessage = options.commitMessage || 'initial commit';
      returnData.authorName = signature.name();
      returnData.authorEmail = signature.email();
      returnData.branch = _.replace(returnData.branch, 'refs/heads/', '');

      return repo.createCommit('HEAD',
        signature,
        signature,
        options.commitMessage || 'initial commit',
        oid,
        parents);
    })
    .then(function(newCommit) {
      returnData.commit = newCommit;
      return returnData;
    });
}

function addFilesToIndex(index, filesToCommit) {
  filesToCommit = _.isString(filesToCommit) ? [ filesToCommit ] : filesToCommit;
  var fName = arguments.callee.toString().match(/function ([^\(]+)/)[1];
  if (!index) { return Q.reject(fName + ' expects an index arg'); }
  // add files
  return Q
    .allSettled(_.map(filesToCommit, function(file) {
      return index.addByPath(file);
    }));
}

function makeInitialCommit(repo, user, shouldSaveBitConfig) {
  var filesToCommit = shouldSaveBitConfig ? '.bit.json' : undefined;
  return function() {
    return kbRepo.commitFilesByPath(repo, {
      filesToCommit: filesToCommit,
      user: user
    });
  };
}

function checkConfigSchema(configStr) {
  var parsedConfig = JSON.parse(configStr);
  if (notEmptyString(parsedConfig['gitflow.branch.master']) &&
        notEmptyString(parsedConfig['gitflow.branch.develop']) &&
        notEmptyString(parsedConfig['gitflow.prefix.feature']) &&
        notEmptyString(parsedConfig['gitflow.prefix.release']) &&
        notEmptyString(parsedConfig['gitflow.prefix.hotfix'])) {
    return parsedConfig;
  } else {
    throw new KbError('bit config file is messed up', 0);
  }
}

function notEmptyString(str) {
  return !_.isEmpty(str) && _.isString(str);
}

function askIfShouldSaveBitConfig() {
  return {
    type: 'confirm',
    name: 'shouldSaveBitConfig',
    message: 'should we save this setting globaly so everyone will use it?',
    default: true
  };
}

function askPrefixOfReleaseBranches() {
  return {
    type: 'input',
    name: 'releaseBranchesPrefix',
    message: 'Release branches?',
    default: 'release/'
  };
}

function askPrefixOfHotfixBranches() {
  return {
    type: 'input',
    name: 'hotfixBranchesPrefix',
    message: 'Hotfix branches?',
    default: 'hotfix/'
  };
}

function askPrefixOfFeatureBranches() {
  return {
    // when: writeBefore('How to name your supporting branch prefixes?'),
    type: 'input',
    name: 'featureBranchesPrefix',
    message: 'Feature branches?',
    default: 'feature/'
  };
}

function askNameOfDevelopBranch() {
  return {
    type: 'input',
    name: 'developBranch',
    message: 'Branch name for "next release" development?',
    default: 'develop'
  };
}

function askNameOfMasterBranch() {
  return {
    type: 'input',
    name: 'masterBranch',
    message: 'Branch name for production releases?',
    default: 'master'
  };
}

function ensureGitFlowNotInitialized(repo) {
  return NodeGit.Flow.isInitialized(repo)
    .then(function(isInit) {
      if (isInit) {
        throw new KbError('repo is already a git flow repo', 1, true);
      }

      return isInit;
    });
}

function initGit(currentFolder) {
  return NodeGit.Repository.init(currentFolder, 0);
}

function openGit() {
  return gitRoot.getGitRoot()
    .then(function(root) {
      return NodeGit.Repository.open(root);
    });
}

function ensureSlash(prefix) {
  return _.endsWith(prefix, '/') ? prefix : prefix + '/';
}

function getStatus(repo, shouldAddFolderEntries, shouldGroupBy) {
  shouldGroupBy = shouldGroupBy || 'isStaged';

  // GLOBAL PROCESS VARIALBES
  var currentBranchName, currentBranchStatuses, diff;

  var files = [];
  return Q.all([
    repo.getStatus(),
    repo.getCurrentBranch(),
    getDiff(repo)
  ])
    .then(function(result) {
      currentBranchStatuses = result[0];
      diff = result[2];
      return NodeGit.Branch.name(result[1]);
    })
    .then(function(currBranchName) {
      var statuses = currentBranchStatuses;
      currentBranchName = currBranchName;

      statuses.forEach(function(file) {
        files.push({
          path: file.path(),
          status: statusToArray(file),
          statusStr: statusToText(file),
          folder: path.dirname(file.path()),
          isStaged: file.status()[0].indexOf('INDEX') >= 0,
          changes: diff[file.path()]
        });
      });

      // sort files alphabetically
      var sortedFiles = _.sortBy(files, [ 'path' ]);

      // separate to staged vs unstaged
      if (shouldGroupBy) {
        var separatedByStage = _.groupBy(sortedFiles, shouldGroupBy);
      }

      // should we show folders as well?
      /* TODO(thatkookooguy): update according
         to https://github.com/nodegit/nodegit/issues/1416 */
      if (shouldAddFolderEntries) {
        separatedByStage.true = addFolderEntries(separatedByStage.true);
        separatedByStage.false = addFolderEntries(separatedByStage.false);
      }

      var data = {};
      data.staged = separatedByStage.true;
      data.unstaged = separatedByStage.false;
      data.branchName = currentBranchName;
      // data.all = _.groupBy(data.staged.concat(data.unstaged), 'folder');

      // console.log('this is what I got!', data);

      //if no changes
      if (!data.staged && !data.unstaged) {
        throw new KbError(kbString.build([
          'no changes were found.\n',
          'change some files in order to commit them.'
        ]), 1, true);
      }

      return data;
    });
}

function getDiff(repo) {
  var data = {};

  return NodeGit.Diff.indexToWorkdir(repo)
    .then(function(diff) {
      return diff.patches();
    })
    .then(function(patches) {
      _.forEach(patches, function(patch) {
        var lineStats = patch.lineStats();

        data[patch.newFile().path()] = [
          lineStats.total_additions,
          lineStats.total_deletions
        ];
      });

      return data;
    });
}

function statusToArray(status) {
  var words = [];
  if (status.isNew()) {
    words.push('NEW');
  }
  if (status.isModified()) {
    words.push('MODIFIED');
  }
  if (status.isTypechange()) {
    words.push('TYPECHANGE');
  }
  if (status.isRenamed()) {
    words.push('RENAMED');
  }
  if (status.isIgnored()) {
    words.push('IGNORED');
  }

  return words;
}

function statusToText(status) {
  var words = [];
  if (status.isNew()) {
    words.push(kbString.build(
      kbString.white('['),
      kbString.info('NEW'),
      kbString.white(']')
    ));
  }
  if (status.isModified()) {
    words.push(kbString.build(
      kbString.white('['),
      kbString.warning('MODIFIED'),
      kbString.white(']')
    ));
  }
  if (status.isTypechange()) {
    words.push(kbString.build(
      kbString.white('['),
      kbString.warning('TYPECHANGE'),
      kbString.white(']')
    ));
  }
  if (status.isRenamed()) {
    words.push(kbString.build(
      kbString.white('['),
      kbString.error('RENAMED'),
      kbString.white(']')
    ));
  }
  if (status.isIgnored()) {
    words.push(kbString.build(
      kbString.white('['),
      kbString.white('IGNORED'),
      kbString.white(']')
    ));
  }

  return words.join(' ');
}

function addFolderEntries(files) {
  files = _.sortBy(files, [ 'path' ]);

  var filesWithFolders = [];
  var currentFolder = '.';
  _.forEach(files, function(file) {
    if (file.folder === currentFolder || file.folder === currentFolder + '/') {
      filesWithFolders.push(file);
    } else {
      filesWithFolders.push({
        path: file.folder + '/',
        status: '',
        statusStr: '',
        isFolder: true
      });
      currentFolder = file.folder;
      filesWithFolders.push(file);
    }
  });

  return filesWithFolders;
}
