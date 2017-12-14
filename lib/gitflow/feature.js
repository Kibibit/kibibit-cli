var os = require('os');
var path = require('path');
var kbString = require('../kb-string');
var inquirer = require('inquirer');
var _ = require('lodash');
var github = require('octonode');
var Q = require('q');
var colorize = require('json-colorizer');
var currentFolder = process.cwd();
var NodeGit = require('nodegit-flow');
var moment = require('moment');

var GLOBAL = {
  repo: null,
  featureBranches: null
};

var featureGitflow = {};

featureGitflow.feature = feature;

module.exports = featureGitflow;

function feature(args, options) {
  // no specific feature was given. Just show a list of all
  // local features (and maybe remote ones?)
  if (!args.featureName) {
    NodeGit.Repository.open(currentFolder).then(function(repo) {
        GLOBAL.repo = repo;
        return repo.getReferenceNames(NodeGit.Reference.TYPE.LISTALL);
      })
      .then(function(allBranches) {
        var regexItem = options.remote ?
          /^refs\/remotes\/.*?\/feature\// :
          /^refs\/heads\/feature\//;

        allBranches = _.filter(allBranches, function(branch) {
            return regexItem.test(branch); // feature\/
          });

        var featureBranches = _.map(allBranches, function(branch) {
          return branch.replace(regexItem, '');
        }); //test test

        GLOBAL.featureBranches = featureBranches;

        console.log(kbString.success([
          'Found ',
          featureBranches.length, ' ',
          kbString.white(kbString.important(options.remote ? 'remote' : 'local')),
          ' features:\n',
          '======================'
        ]));

        return Q.all(_.map(allBranches, function(branch) {
          return GLOBAL.repo.getBranchCommit(branch)
            .then( result => result, function(error) {
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
              kbString.info('[', 'feature/', GLOBAL.featureBranches[index], ']'), ' ',
              kbString.error('no commits yet...'),
              ' ---ERROR: ', commit.message
            ]));
            return;
          }
          console.log(kbString.build([
            kbString.info('[', 'feature/', GLOBAL.featureBranches[index], ']'), ' ',
            kbString.white('(', commit.author(), ')'),
            kbString.error(' > '), kbString.success(commit.message().trim().split('\n', 1)[0]),
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
    NodeGit.Repository.open(currentFolder).then(function(repo) {
      NodeGit.Flow.startFeature(
          repo,
          args.featureName
        )
        .then((featureBranch) => {
          // upload branch to github (either empty or with an empty init commit)
          console.log(featureBranch.shorthand()); // => feautre/my-feature
          process.exit(0);
        }, (error) => {
          console.error(error);
          process.exit(1);
        });
    }, function(error) {
      console.error(error);
      process.exit(1);
    });
  }
}
