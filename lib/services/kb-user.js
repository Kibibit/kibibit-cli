var KbError = require('../errors/KbError');
var globalBitConfig = require('home-config').load('.kibibit-bit');
var keytar = require('keytar');
var _ = require('lodash');
var Q = require('q');
var inquirer = require('inquirer');
var kbGithub = require('../services/kb-github');

var kbUser = {};

kbUser.getExistingBitUsers = getExistingBitUsers;
kbUser.getBitUserToken = getBitUserToken;
kbUser.addBitUser = addBitUser;

kbUser.questions = {};
kbUser.questions.selectOrCreateUser = selectOrCreateUser;
kbUser.questions.loginNewUser = loginNewUser;

initBitUsersArray();

module.exports = kbUser;

function initBitUsersArray() {
  if (!_.isArray(globalBitConfig.users)) {
    globalBitConfig.users = [];

    globalBitConfig.save();
  }
}

function loginNewUser() {
  return kbGithub.questions.userQuestionsGithubLogin()
    .then(function(newUser) {
      console.log('user logged in', newUser);

      return addBitUser(newUser.username, newUser.token);
    });
}

function selectOrCreateUser() {
  if (!globalBitConfig.users.length) {
    return Q.fcall(function() {
      return kbUser.questions.loginNewUser();
    });
  }

  var username, isSelectedExistingUser;

  return inquirer.prompt([ {
    type: 'list',
    name: 'selectUser',
    message: 'Found registered users. Select a user for this repo',
    choices: globalBitConfig.users.concat([
      new inquirer.Separator(),
      'Add a new user'
    ])
  } ])
    .then(function(answers) {
      isSelectedExistingUser =
        globalBitConfig.users.indexOf(answers.selectUser) > -1;
      console.log('isSelectedExistingUser?', isSelectedExistingUser);
      username = answers.selectUser;
      return isSelectedExistingUser ?
        getBitUserToken(username) :
        kbUser.questions.loginNewUser();
    })
    .then(function(data) {
      return isSelectedExistingUser ? {
        username: username,
        token: data
      } : data;
    })
    .then(function(user) {
      return kbGithub.getGitHubUserData(user.username, user.token);
    });
}

function getExistingBitUsers() {
  return Q.fcall(function() {
    return globalBitConfig.users;
  });
}

function getBitUserToken(username) {
  return keytar.getPassword('kibibit-cli', username);
}

function addBitUser(gitHubUsername, token) {
  if (globalBitConfig.users.indexOf(gitHubUsername) === -1) {
    globalBitConfig.users.push(gitHubUsername);
  }

  return keytar.setPassword('kibibit-cli', gitHubUsername, token)
    .then(function() {
      return globalBitConfig.save();
    })
    .then(function() {
      return gitHubUsername;
    })
    .catch(function() {
      throw new KbError('something went wrong', 1);
    });
}
