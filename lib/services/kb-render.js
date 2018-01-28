/*eslint-env es6*/

var kbString = require('../kb-string');
var _ = require('lodash');
var Q = require('q');
var NodeGit = require('nodegit-flow');
var moment = require('moment');

var renderService = {};

renderService.listAllBranchesOfType = listAllBranchesOfType;

module.exports = renderService;

function listAllBranchesOfType(repo, branchType, showRemotes) {
  var data = {};

  return NodeGit.Flow.getConfig(repo)
    .then(function(config) {
      data.config = config;
      data.branchPrefix = _.trim(config[`gitflow.prefix.${branchType}`], '\\/');
      return repo.getReferenceNames(NodeGit.Reference.TYPE.LISTALL);
    })
    .then(function(allBranches) {

      return branchesRenderedArray(repo,
        allBranches, data.branchPrefix, showRemotes);
    })
    .then(function(renderedView) {
      console.log(renderedView);
    });
}

function branchesRenderedArray(repo, allBranches, branchPrefix, isRemote) {
  var data = {};

  var regexItem = isRemote ?
    '^refs\/remotes\/.*?\/' + branchPrefix + '\/' :
    '^refs\/heads\/' + branchPrefix + '\/';

  regexItem = new RegExp(regexItem);

  // only leave branches of branch type
  allBranches = _.filter(allBranches, function(branch) {
    return regexItem.test(branch);
  });

  // remove the prefix
  var featureBranches = _.map(allBranches, function(branch) {
    return branch.replace(regexItem, '');
  });

  data.featureBranches = featureBranches;

  return Q.all(_.map(allBranches, getBranchCommitAlwaysResolve(repo)))
    .then(function(allLastCommits) {
      var allBranchesView = [];

      allBranchesView.push(tableTitle(data.featureBranches,
        branchPrefix, isRemote));
      _.forEach(allLastCommits, function(commit, index) {
        if (commit.errno) {
          allBranchesView.push(errorEntry(commit, data.featureBranches[index]));
          return;
        }

        allBranchesView.push(tableEntry(commit,
          branchPrefix, data.featureBranches[index]));
      });

      return allBranchesView.join('\n');
    });
}

function tableEntry(commit, branchPrefix, branchName) {
  branchPrefix = _.trim(branchPrefix, '\\/');
  return kbString.build([
    kbString.info(`[${branchPrefix}/${branchName}]`),
    ' ',
    kbString.white('(', commit.author(), ')'),
    kbString.error(' > '),
    kbString.success(commit.message().trim().split('\n', 1)[0]),
    kbString.warning(' (', moment(commit.date()).fromNow(), ')')
  ]);
}

function errorEntry(commit, branchName) {
  return kbString.build([
    kbString.info(`[${branchPrefix}/${branchName}]`), ' ',
    kbString.error('no commits yet...'),
    ' ---ERROR: ', commit.message
  ]);
}

function tableTitle(featureBranches, branchPrefix, isRemote) {
  return kbString.success(`Found ${featureBranches.length} `,
    kbString.important(isRemote ? 'remote' : 'local'),
    ` ${branchPrefix} branches:\n`,
    '======================');
}

function getBranchCommitAlwaysResolve(repo) {
  return function _getBranchCommitAlwaysResolve(branch) {
    return repo.getBranchCommit(branch)
      .catch(function() {
        return;
      });
  };
}
