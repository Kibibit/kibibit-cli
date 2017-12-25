var os = require('os');
// var path = require('path');
var kbString = require('../kb-string');
var gitRoot = require('../kb-git-root');
var inquirer = require('inquirer');
var _ = require('lodash');
var github = require('octonode');
var Q = require('q');
var colorize = require('json-colorizer');
var currentFolder = process.cwd();
var NodeGit = require('nodegit-flow');
var keytar = require('keytar');
var globalCfg = require('home-config').load('.kibibit-bit');
var utility = require('./utility');
// var findRoot = require('find-root');

var GLOBAL = {
  shouldAskForOTPCode: false,
  OTPMethod: 'default',
  token: null
};

var ui = new inquirer.ui.BottomBar();

var initGitflow = {};

initGitflow.init = init;
initGitflow.featureBranchesPrefixDefault = featureBranchesPrefixDefault;
initGitflow.hotfixBranchesPrefixDefault = hotfixBranchesPrefixDefault;
initGitflow.releaseBranchesPrefixDefault = releaseBranchesPrefixDefault;

initGitflow.questions = [
  askNameOfMasterBranch(),
  askNameOfDevelopBranch(),
  askPrefixOfFeatureBranches(),
  askPrefixOfHotfixBranches(),
  askPrefixOfReleaseBranches()
];

module.exports = initGitflow;

function printFlash() {
  console.log(kbString.kibibitLogo(true));
  console.log(kbString.success(' gitflow + github cli '));
  console.log('======================');
  console.log('');
}

function makeInitialCommit(branch) {
  return function() {
    console.log('make initial commit');
    return GLOBAL.repo.refreshIndex()
      .then(function(idx) {
        GLOBAL.index = idx;
        console.log(idx);
        return GLOBAL.index.write();
      })
      .then(function() {
        return GLOBAL.index.writeTree();
      })
      .then(function(oid) {
        var defaultSignature = NodeGit.Signature.default(GLOBAL.repo);
        return GLOBAL.repo.createCommit(branch || 'HEAD',
          defaultSignature,
          defaultSignature,
          'initial commit',
          oid,
          []);
      });
  };
}

function ensureGitInitialized(gitRoot) {
  if (!gitRoot) {
    console.info(kbString.error('git repo not found'));
    console.log('initializing...');
  }

  // initialize a git repo in this folder if it doesn't exist
  // open the git repo if it exists
  var action = gitRoot ?
    NodeGit.Repository.open(gitRoot) :
    NodeGit.Repository.init(currentFolder, 0);

  return action
    .then(function(repo) {
      GLOBAL.repo = repo;

      return repo;
    });
}

function ensureGitFlowNotInitialized() {
  return NodeGit.Flow.isInitialized(GLOBAL.repo)
    .then(function(isInit) {
      GLOBAL.isGitflow = isInit;

      if (GLOBAL.isGitflow) {
        console.log(kbString.error('repo is already a git flow repo'));
        process.exit(1);
      }

      return;
    });
}

function init(args, options) {
  gitRoot.getGitRoot()
    .then(ensureGitInitialized)
    .then(ensureGitFlowNotInitialized)
    // TODO(thatkookooguy): add a step to check remote repo
    // if exists already.
    .then(function() {
      // now we know we have a git repo that is not a git flow repo
      // ask the user what he wants to do
      printFlash();
      // for now, this does nothing...
      if (options.force) {
        console.log(kbString.warning('WARNING: force detected'));
        process.exit(1);
      }

      return associateUser();
    })
    .then(function() {
      console.log('user associated');
      return utility.getGitHubUserData(GLOBAL.username, GLOBAL.token);
    })
    .then(function(githubUser) {
      // console.log('github user', githubUser);
      console.log('github user email', githubUser.email);
      console.log('github user username', githubUser.login);

      return utility.getOrgs();
    })
    .then(function(orgs) {
      var orgNames = _.map(orgs, function(org) {
        return org.login;
      });
      GLOBAL.orgs = orgNames;
      console.log('user organizations', orgNames);
      // process.exit(0);
      // TODO(thatkookooguy): need to add a few questions
      // - check if any users registered with bit in keychain in GLOBAL setting:
      //   - select an existing user or create a user
      //   - store new user token in keychain if created
      // - create a remote repo (clone will connect to existing one)
      //   - name of repository?
      //   - create it for user or organization a user is a member of?
      //   - should include a readme.md?
      // - add global git flow config file called .bit.json
      //   it will hold names of branches and prefixes
      //   (later, if bit will be used in a repo with that file,
      //   it will init automatically with that config if not initialized)
      return inquirer.prompt([
        askNameOfMasterBranch(),
        askNameOfDevelopBranch(),
        askPrefixOfFeatureBranches(),
        askPrefixOfHotfixBranches(),
        askPrefixOfReleaseBranches()
      ]);
    })
    .then(function(answers) {
      delete answers.GitHubPassword;
      delete answers.GitHubOTP;

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

      GLOBAL.userOptions = {
        'gitflow.branch.master': answers.masterBranch,
        'gitflow.branch.develop': answers.developBranch,
        'gitflow.prefix.feature': answers.featureBranchesPrefix,
        'gitflow.prefix.release': answers.releaseBranchesPrefix,
        'gitflow.prefix.hotfix': answers.hotfixBranchesPrefix,
        'gitflow.prefix.versiontag': ''
      };

      GLOBAL.masterName = answers.masterBranch;
      GLOBAL.developName = answers.developBranch;
      GLOBAL.featurePrefix = answers.featureBranchesPrefix;
      GLOBAL.releasePrefix = answers.releaseBranchesPrefix;
      GLOBAL.hotfixPrefix = answers.hotfixBranchesPrefix;

      // here, we need to make sure that master branch exists
      // and have an initial commit
      return GLOBAL.repo.getBranchCommit('master')
        // no initial commit?
        // no problem. make one!
        .catch(makeInitialCommit());

      // process.exit(0);
    })
    .then(function(commit) {
      if (GLOBAL.masterName !== 'master') {
        return GLOBAL.repo.createBranch(GLOBAL.masterName, commit);
      }

      return commit;
    })
    // now we have all user settings and the master commit
    .then(function(/* commit */) {
      // we now have all the user preferences and we can
      // initialize git-flow into the repo
      return NodeGit.Flow.init(GLOBAL.repo, GLOBAL.userOptions);
    })
    .then(function() {
      return GLOBAL.repo.checkoutBranch(GLOBAL.masterName)
        .then(function() {
          if (GLOBAL.masterName !== 'master') {
            return GLOBAL.repo.getBranch('master');
          }

          return;
        })
        .then(function(oldMasterBranch) {
          if (!oldMasterBranch) { return; }
          var result = NodeGit.Branch.delete(oldMasterBranch);
          console.log('deleted old master branch', result);
        });
    })
    .then(function() {
      console.log('git flow repo initialized');
      return createOrigin();
      //process.exit(0);
    })
    .catch(function(error) {
      console.error('something went wrong: ', error);
      process.exit(1);
    });
}

function createOrigin() {
  return inquirer.prompt([{
    type: 'list',
    name: 'whereToCreate',
    message: 'Where should repo be created?',
    choices: [
      GLOBAL.username,
      new inquirer.Separator()
    ].concat(GLOBAL.orgs)
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
      console.log('answers', answers);

      GLOBAL.repoName = answers.repoName;
      GLOBAL.repoDescription = answers.repoDescription;

      if (answers.whereToCreate === GLOBAL.username) {
        return utility.createRepoUser(GLOBAL.repoName, GLOBAL.repoDescription);
      } else {
        console.log('ORGANIZATION REPOOOOO!!!');
        return utility.createRepoOrg(answers.whereToCreate,
          GLOBAL.repoName, GLOBAL.repoDescription);
        //process.exit(1);
      }
    })
    .then(function(body) {
      console.log('created repo', body.clone_url);

      // OR ORIGIN!!!!!! INSTEAD OF NAME
      return NodeGit.Remote
        .create(GLOBAL.repo, 'origin', body.clone_url);
    })
    .then(function(remote) {
      GLOBAL.remote = remote;
      console.log('successfully added a new remote!', GLOBAL.remote.name());

      return NodeGit.Flow.getConfig(GLOBAL.repo);
    })
    .then(function(config) {
      return GLOBAL.remote.push([
        'refs/heads/master:refs/heads/master'
      ], {
        callbacks: {
          certificateCheck: function() {
            return 1;
          },
          credentials: function() {
            console.log('asked for credentials', GLOBAL.token);
            return NodeGit.Cred
              .userpassPlaintextNew(GLOBAL.token, 'x-oauth-basic');
          }
        }
      });
    });
}

function selectExistingUser() {
  return inquirer.prompt([ {
    type: 'list',
    name: 'selectUser',
    message: 'Found registered users. Select a user for this repo',
    choices: globalCfg.users.concat([
      new inquirer.Separator(),
      'Add a new user'
    ])
  } ])
    .then(function(answers) {
      if (globalCfg.users.indexOf(answers.selectUser) > -1) {
        console.log('existing user selected');

        GLOBAL.username = answers.selectUser;

        console.log('global username', GLOBAL.username);

        return GLOBAL.repo.config()
          .then(function(config) {
            return config.setString('kibibit.user', GLOBAL.username);
          })
          .then(function() {
            return keytar.getPassword('kibibit-cli', GLOBAL.username);
          })
          .then(function(value) {
            console.log('got token from keychain', value);

            GLOBAL.token = value;
            // process.exit(0);
            return;
          });
      } else {
        console.log('create a new user');

        return loginNewUser();
      }
    });
}

function loginNewUser() {
  return inquirer.prompt([
    askForGitHubUser(),
    askForGitHubPassword(),
    askForOTPCode(GLOBAL)
  ])
    .then(function(answers) {
      console.log('user logged in', answers);
      //save token in keychain
      globalCfg.users.push(answers.GitHubUsername);

      GLOBAL.username = answers.GitHubUsername;

      globalCfg.save();

      return keytar
        .setPassword('kibibit-cli', answers.GitHubUsername, GLOBAL.token);
    })
    .then(function() {
      console.log('wrote token to keychain');

      return GLOBAL.repo.config()
        .then(function(config) {
          return config.setString('user.name', GLOBAL.username);
        });
    })
    .then(function() {
      return keytar.getPassword('kibibit-cli', GLOBAL.username);
    })
    .then(function(cred) {
      console.log('all kibibit-cli creds: ', cred);
      GLOBAL.token = cred;
      return utility.getGitHubUserData(GLOBAL.username, GLOBAL.token);
      // process.exit(0);
    })
    .then(function(githubUser) {
      return config.setString('user.email', githubUser.email);
    });
}

function associateUser() {
  if (globalCfg.users && globalCfg.users.length > 0) {
    console.log('found users');

    return selectExistingUser();
  } else {
    console.log('no registered users found');

    globalCfg.users = [];

    return loginNewUser();
  }
}

function ensureSlash(prefix) {
  return _.endsWith(prefix, '/') ? prefix : prefix + '/';
}

function gitflowIsInitialized() {
  var deferred = Q.defer();

  NodeGit.Repository.open(gitRoot).then(function(repo) {
    NodeGit.Flow.isInitialized(repo)
      .then(function(isInitialized) {
        deferred.resolve(isInitialized);
      }, function(err) {
        deferred.reject(err);
      });
  }, function(err) {
    deferred.reject(err);
  });

  return deferred.promise;
}

function releaseBranchesPrefixDefault() {
  return 'release/';
}

function hotfixBranchesPrefixDefault() {
  return 'hotfix/';
}

function featureBranchesPrefixDefault() {
  return 'feature/';
}

function writeBefore(header) {
  return function() {
    ui.log.write(kbString.success(header));
    return true;
  };
}

function shouldInitRepo() {
  return {
    when: function() {
      var done = this.async();

      gitflowIsInitialized()
        .then(function(isInitialized) {
          var msgStr = isInitialized ?
            kbString.warning('[ WARNING ]: this repo is already initialized.') :
            kbString.success('Initializing new project');
          ui.log.write(msgStr);
          done(null, isInitialized);
        }, function(err) {
          done(err, false);
        });
    },
    type: 'confirm',
    name: 'overrideSettings',
    message: 'override existing settings?',
    default: false
  };
}

function shouldCopyGlobalSettings() {
  return {
    when: function(userAnswers) {
      if (!_.isNil(userAnswers.overrideSettings) &&
      !userAnswers.overrideSettings) {
        console.log(kbString.error('aborting...'));
        process.exit(1);
      }
      var done = this.async();
      NodeGit.Config.openDefault().then(function(config) {
        config.getString('kibibit.githubUsername').then(function(value) {
          console.log('default config:', value);
          done(null, true);
        }, function(error) {
          console.error('no global was found', error.Error);
          done(null, false);
        });
      });
    },
    type: 'confirm',
    name: 'takeGlobalGitHubUser',
    message: 'should this repo copy the global GitHub user?',
    default: false
  };
}

function askForGitHubUser() {
  return {
    when: function(userAnswers) {
      return !userAnswers.takeGlobalGitHubUser;
    },
    type: 'input',
    name: 'GitHubUsername',
    message: 'GitHub username:',
    validate: function(currUsername) {
      if (!_.isEmpty(currUsername)) {
        return true;
      }

      return 'no input detected. please try again';
    }
  };
}

function askForGitHubPassword() {
  return {
    type: 'password',
    name: 'GitHubPassword',
    message: 'GitHub password:',
    validate: function(currPassword, userAnswers) {
      var done = this.async();

      if (!_.isEmpty(currPassword)) {
        loginGitHub(userAnswers.GitHubUsername, currPassword)
          .then(function(loginObj) {
            GLOBAL.shouldAskForOTPCode = loginObj.needOTP;
            GLOBAL.OTPMethod = loginObj.OTPMethod;
            GLOBAL.token = loginObj.token;
            done(null, true);
          }, function(err) {
            done(err, false);
          });
      }
    }
  };
}

function askForOTPCode(GLOBAL) {
  return {
    when: function() {
      if (GLOBAL.shouldAskForOTPCode) {
        ui.log.write(kbString.success([
          'OTP detected. You should recieve a temp code to authenticate[',
          GLOBAL.OTPMethod,
          '].'
        ]));
      }
      return GLOBAL.shouldAskForOTPCode;
    },
    type: 'password',
    name: 'GitHubOTP',
    message: 'enter two-factor code:',
    validate: function(currOTP, userAnswers) {
      var done = this.async();
      var pass = currOTP.match(/^\d+$/);

      if (_.isEmpty(currOTP)) {
        done('OTP should not be empty', false);
        return;
      }

      if (!pass) {
        done('OTP should contain only numbers', false);
        return;
      }

      loginGitHub(
        userAnswers.GitHubUsername,
        userAnswers.GitHubPassword,
        currOTP)
        .then(function(loginObj) {
          GLOBAL.token = loginObj.token;
          done(null, true);
        }, function(err) {
          done(err, false);
        });
    }
  };
}

function askIfRebaseOrMerge() {
  return {
    type: 'list',
    name: 'rebaseOrMerge',
    message: 'should use merge or rebase on branch merging?',
    choices: ['rebase', 'merge'],
    filter: function(val) {
      return val.toLowerCase();
    }
  };
}

function askNameOfMasterBranch() {
  return {
    when: function() {
      if (true) {
        ui.log.write(kbString.success(
          'No branches exist yet. Base branches must be created now.'
        ));
      }
      return true;
    },
    type: 'input',
    name: 'masterBranch',
    message: 'Branch name for production releases?',
    default: function() {
      return 'master';
    }
  };
}

function askNameOfDevelopBranch() {
  return {
    when: function(/* response */) {
      return true;
    },
    type: 'input',
    name: 'developBranch',
    message: 'Branch name for "next release" development?',
    default: function() {
      return 'develop';
    }
  };
}

function askPrefixOfFeatureBranches() {
  return {
    when: writeBefore('How to name your supporting branch prefixes?'),
    type: 'input',
    name: 'featureBranchesPrefix',
    message: 'Feature branches?',
    default: initGitflow.featureBranchesPrefixDefault
  };
}

function askPrefixOfReleaseBranches() {
  return {
    type: 'input',
    name: 'releaseBranchesPrefix',
    message: 'Release branches?',
    default: initGitflow.releaseBranchesPrefixDefault
  };
}

function askPrefixOfHotfixBranches() {
  return {
    type: 'input',
    name: 'hotfixBranchesPrefix',
    message: 'Hotfix branches?',
    default: initGitflow.hotfixBranchesPrefixDefault
  };
}

function loginGitHub(username, password, otpCode) {
  var deferred = Q.defer();

  var loaderId = setInterval(function() {
    if (loaderId) {
      ui.updateBottomBar(util.signingInAnimation[util.signingInSteps++ % 4]);
    }
  }, 300);

  var scopes = {
    'scopes': ['user', 'repo', 'gist', 'read:org'],
    'note': [
      'kibibit cli','@',
      os.hostname(),
      ' on ', os.type()
    ].join('')
  };

  var data = {
    username: username,
    password: password
  };

  if (otpCode) {
    data.otp = otpCode;
  }

  github.auth.config(data).login(scopes, function(err, id, token, headers) {
    var err = _.get(err, 'message');
    if (_.isEmpty(err)) {
      clearInterval(loaderId);
      ui.updateBottomBar('');
      deferred.resolve({
        msg: null,
        needOTP: false,
        token: token
      });

      return deferred.promise;
    }
    if (err && err.indexOf('OTP code') > -1) {
      clearInterval(loaderId);
      ui.updateBottomBar('');
      deferred.resolve({
        msg: 'OTP detected. You should recieve a temp code to authenticate.',
        needOTP: true,
        OTPMethod: headers['x-github-otp'].replace('required; ', '')
      });

      return deferred.promise;
    } else {
      clearInterval(loaderId);
      ui.updateBottomBar('');
      deferred.reject(err);

      return deferred.promise;
    }
  });

  return deferred.promise;
}

function checkRepoStatus() {
  NodeGit.Flow.isInitialized(GLOBAL.repo)
    .then(function(isInit) {
      GLOBAL.isGitflow = isInit;

      return GLOBAL.isGitflow;
    })
    .catch(function(error) {
      console.error('test', error);
      process.exit(1);
    });
}
