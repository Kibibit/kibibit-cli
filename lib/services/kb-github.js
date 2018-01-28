var github = require('octonode');
var _ = require('lodash');
var Q = require('q');
var inquirer = require('inquirer');
var os = require('os');

var kbGithub = {};

kbGithub.loginGitHub = loginGitHub;
kbGithub.getGitHubUserData = getGitHubUserData;
kbGithub.getGitHubBasicUserData = getGitHubBasicUserData;
kbGithub.getGitHubUserOrgs = getGitHubUserOrgs;
kbGithub.createRepoOrg = createRepoOrg;
kbGithub.createRepoUser = createRepoUser;
kbGithub.createPullRequest = createPullRequest;

kbGithub.questions = {};
kbGithub.questions.askForGitHubUser = askForGitHubUser;
kbGithub.questions.askForGitHubPassword = askForGitHubPassword;
kbGithub.questions.askForOTPCode = askForOTPCode;
kbGithub.questions.userQuestionsGithubLogin = userQuestionsGithubLogin;

module.exports = kbGithub;

function askForGitHubUser() {
  return {
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

function askForGitHubPassword(data) {
  return {
    type: 'password',
    name: 'GitHubPassword',
    message: 'GitHub password:',
    validate: function(currPassword, userAnswers) {
      var done = this.async();

      if (!_.isEmpty(currPassword)) {
        kbGithub.loginGitHub(userAnswers.GitHubUsername, currPassword)
          .then(function(loginObj) {
            data.shouldAskForOTPCode = loginObj.needOTP;
            data.OTPMethod = loginObj.OTPMethod;
            data.token = loginObj.token;
            done(null, true);
          }, function(err) {
            done(err, false);
          });
      }
    }
  };
}

function askForOTPCode(data) {
  return {
    when: function() {
      if (data.shouldAskForOTPCode) {
        ui.log.write(kbString.success([
          'OTP detected. You should recieve a temp code to authenticate[',
          data.OTPMethod,
          '].'
        ]));
      }
      return data.shouldAskForOTPCode;
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

      kbGithub.loginGitHub(
        userAnswers.GitHubUsername,
        userAnswers.GitHubPassword,
        currOTP)
        .then(function(loginObj) {
          data.token = loginObj.token;
          done(null, true);
        }, function(err) {
          done(err, false);
        });
    }
  };
}

function getGitHubUserData(username, token) {
  var user = {};
  return kbGithub.getGitHubBasicUserData(username, token)
    .then(function(githubUser) {
      user.email = githubUser.email;
      return kbGithub.getGitHubUserOrgs(username, token);
    })
    .then(function(userOrgs) {
      user.orgs = userOrgs;
      user.username = username;
      user.token = token;

      return user;
    });
}

function getGitHubBasicUserData(username, token) {
  var deferred = Q.defer();

  var githubUserClient = github.client(token);

  githubUserClient.get('/user', {}, function (err, status, body) {
    if (err) {
      // console.log('ERROR!', err);
      deferred.reject('can\'t get user data from github');
    } else {
      // console.log(body); //json object
      deferred.resolve(body);
    }
  });

  return deferred.promise;
}

function getGitHubUserOrgs(username, token) {
  var deferred = Q.defer();

  var githubUserClient = github.client(token);

  var ghme = githubUserClient.me();

  ghme.orgs(function(err, body) {
    if (err) {
      // console.log('ERROR!', err);
      deferred.reject('can\'t get organizations data from github');
    } else {
      var orgNames = _.map(body, function(org) {
        return org.login;
      });
      deferred.resolve(orgNames);
    }
  });

  return deferred.promise;
}

function userQuestionsGithubLogin() {
  var data = {};
  return inquirer.prompt([
    kbGithub.questions.askForGitHubUser(data),
    kbGithub.questions.askForGitHubPassword(data),
    kbGithub.questions.askForOTPCode(data)
  ])
    .then(function(answers) {
      data.user = {
        username: answers.GitHubUsername,
        token: data.token
      };

      return kbGithub.getGitHubUserData(data.user.username, data.user.token);
    });
}

function loginGitHub(username, password, otpCode) {
  var deferred = Q.defer();

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
      deferred.resolve({
        msg: null,
        needOTP: false,
        token: token
      });

      return deferred.promise;
    }
    if (err && err.indexOf('OTP code') > -1) {
      deferred.resolve({
        msg: 'OTP detected. You should recieve a temp code to authenticate.',
        needOTP: true,
        OTPMethod: headers['x-github-otp'].replace('required; ', '')
      });

      return deferred.promise;
    } else {
      deferred.reject(err);

      return deferred.promise;
    }
  });

  return deferred.promise;
}

function createRepoUser(user, name, description) {
  var deferred = Q.defer();

  var client = github.client(user.token);

  description = description || '';

  if (!name) {
    deferred.reject('name must be given');

    return deferred.promise;
  }

  var ghme = client.me();

  ghme.repo({
    'name': name,
    'description': description,
  }, function(err, body) {
    if (err) {
      // console.log('ERROR!', err);

      deferred.reject('can\'t create user repo');
    } else {
      deferred.resolve(body);
    }
  }); //repo

  return deferred.promise;
}

function createRepoOrg(user, orgName, name, description) {
  var deferred = Q.defer();

  var client = github.client(user.token);

  description = description || '';

  if (!name || !orgName) {
    deferred.reject('orgName & name must be given');

    return deferred.promise;
  }

  var ghorg = client.org(orgName);

  ghorg.repo({
    name: name,
    description: description
  }, function(err, body) {
    if (err) {
      // console.log('ERROR!', err);
      deferred.reject('can\'t create organization repo');
    } else {
      deferred.resolve(body);
    }
  });

  return deferred.promise;
}

function createPullRequest(user, repoName, baseBranchName, headName) {
  var deferred = Q.defer();

  var client = github.client(user.token);

  if (!repoName || !baseBranchName || !headName) {
    deferred.reject('repoName, baseBranchName & headName must be given');

    return deferred.promise;
  }

  var ghrepo = client.repo(repoName);

  ghrepo.pr({
    'title': 'Amazing new feature',
    'body': 'Please pull this in!',
    'head': headName, // make this better somehow
    'base': baseBranchName
  }, function(err, body) {
    if (err) {
      deferred.reject('can\'t create pull request');
    } else {
      deferred.resolve(body); // pull request
    }
  });

  return deferred.promise;
}
