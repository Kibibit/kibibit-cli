// var os = require('os');
// var path = require('path');
var kbString = require('../kb-string');
// var inquirer = require('inquirer');
var _ = require('lodash');
// var github = require('octonode');
var Q = require('q');
// var colorize = require('json-colorizer');
// var currentFolder = process.cwd();
var gitRoot = require('../kb-git-root');
var NodeGit = require('nodegit-flow');
var moment = require('moment');

var GLOBAL = {
  repo: null,
  featureBranches: null
};

var hotfixGitflow = {};

hotfixGitflow.hotfix = hotfix;

module.exports = hotfixGitflow;

function hotfix(args, options) {

  // no specific feature was given. Just show a list of all
  // local features (and maybe remote ones?)
  if (!args.hotfixName) {
    console.log('inside no name given');
    NodeGit.Repository.open(gitRoot).then(function(repo) {
      GLOBAL.repo = repo;
      return repo.getReferenceNames(NodeGit.Reference.TYPE.LISTALL);
    })
      .then(function(allBranches) {
        var regexItem = options.remote ?
          /^refs\/remotes\/.*?\/hotfix\// :
          /^refs\/heads\/hotfix\//;

        allBranches = _.filter(allBranches, function(branch) {
          return regexItem.test(branch); // feature\/
        });

        var featureBranches = _.map(allBranches, function(branch) {
          return branch.replace(regexItem, '');
        });

        GLOBAL.featureBranches = featureBranches;

        console.log(kbString.success([
          'Found ',
          featureBranches.length, ' ',
          kbString.important(options.remote ? 'remote' : 'local'),
          ' hotfixes:\n',
          '======================'
        ]));

        return Q.all(_.map(allBranches, function(branch) {
          return GLOBAL.repo.getBranchCommit(branch)
            .then(function(result) {
              return result;
            }, function(error) {
              var deferred = Q.defer();
              deferred.resolve(error);

              return deferred.promise;
            });
        }));
      })
      .then(function(allLastCommits) {
        _.forEach(allLastCommits, function(commit, index) {
          if (commit.errno) {
            console.log(kbString.build([
              kbString.info('[', GLOBAL.featureBranches[index], ']'), ' ',
              kbString.error('no commits yet...'),
              ' ---ERROR: ', commit.message
            ]));
            return;
          }
          console.log(kbString.build([
            kbString.info('[', 'hotfix/', GLOBAL.featureBranches[index], ']'),
            ' ',
            kbString.white('(', commit.author(), ')'),
            kbString.error(' > '),
            kbString.success(commit.message().trim().split('\n', 1)[0]),
            kbString.warning(' (', moment(commit.date()).fromNow(), ')')
          ]));
        });
        process.exit(0);
      })
      .catch(function(error) {
        console.error('oops.... something went wrong...', error);
        process.exit(1);
      });
  } else {
    NodeGit.Repository.open(gitRoot).then(function(repo) {
      NodeGit.Flow.startHotfix(
        repo,
        args.hotfixName
      )
        .then(function(featureBranch) {
          console.log(featureBranch.shorthand()); // => feautre/my-feature
          process.exit(0);
        }, function(error) {
          console.error(error);
          process.exit(1);
        });
    }, function(error) {
      console.error(error);
      process.exit(1);
    });
  }
}
