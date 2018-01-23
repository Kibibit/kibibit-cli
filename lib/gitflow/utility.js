var kbString = require('../kb-string');
var _ = require('lodash');
var Q = require('q');
var colorize = require('json-colorizer');
var github = require('octonode');

var util = {};

util.addFilesToIndex = addFilesToIndex;
util.openIndex = openIndex;
util.writeFilesInIndex = writeFilesInIndex;
util.writeIndexTree = writeIndexTree;
util.getRootCommit = getRootCommit;
util.getGitHubUserData = getGitHubUserData;
util.getOrgs = getOrgs;
util.createRepoUser = createRepoUser;
util.createRepoOrg = createRepoOrg;
util.signingInAnimation = [
  kbString.info(kbString.warning('/'), ' Signing in'),
  kbString.info(kbString.warning('|'), ' Signing in..'),
  kbString.info(kbString.warning('\\'), ' Signing in..'),
  kbString.info(kbString.warning('-'), ' Signing in...')
];
util.signingInSteps = 4;

module.exports = util;

var client;

function createRepoUser(name, description) {
  var deferred = Q.defer();

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

function createRepoOrg(orgName, name, description) {
  var deferred = Q.defer();

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
      deferred.reject('can\'t create organization repo')
    } else {
      deferred.resolve(body);
    }
  });

  return deferred.promise;
}

function getOrgs() {
  var deferred = Q.defer();

  var ghme = client.me();

  ghme.orgs(function(err, body) {
    if (err) {
      // console.log('ERROR!', err);
      deferred.reject('can\'t get organizations data from github');
    } else {
      deferred.resolve(body);
    }
  });

  return deferred.promise;
}

function getGitHubUserData(username, token) {
  console.log('trying to login to github', token);
  var deferred = Q.defer();

  client = github.client(token);

  client.get('/user', {}, function (err, status, body) {
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

function addFilesToIndex(index, filesToCommit) {
  var fName = arguments.callee.toString().match(/function ([^\(]+)/)[1];
  if (!index) { return Q.reject(fName + ' expects an index arg'); }
  // add files
  return Q
    .allSettled(_.map(filesToCommit, function(file) {
      return index.addByPath(file);
    }));
}

// Load up the repository index
function openIndex(repository) {
  var fName = arguments.callee.toString().match(/function ([^\(]+)/)[1];
  if (!repository) { return Q.reject(fName + ' expects a repository arg'); }

  return repository.refreshIndex();
}

// this will write all files to the index
function writeFilesInIndex(index) {
  var fName = arguments.callee.toString().match(/function ([^\(]+)/)[1];
  if (!index) { return Q.reject(fName + ' expects an index arg'); }
  if (!index.write) { report(index); }

  return index.write();
}

function writeIndexTree(index) {
  var fName = arguments.callee.toString().match(/function ([^\(]+)/)[1];
  if (!index) { return Q.reject(fName + ' expects an index arg'); }

  return index.writeTree();
}

function getRootCommit(repo, head) {
  var fName = arguments.callee.toString().match(/function ([^\(]+)/)[1];

  if (!repo || !head) {
    return Q.reject(fName + ' expects a repo and an index arg');
  }

  return repo.getCommit(head);
}

function report(what, vars) {
  console.error(kbString.error(what),
    vars ? colorize(JSON.stringify(vars, null, 2)) : '');
}
