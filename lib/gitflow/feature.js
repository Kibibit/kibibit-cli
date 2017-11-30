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

var GLOBAL = {
  shouldAskForOTPCode: false,
  OTPMethod: 'default',
  token: null
};

var featureGitflow = {};

featureGitflow.feature = feature;

module.exports = featureGitflow;

function feature(args, options) {
  console.log('feature sub-command called. these are the params: ', {
    args: args,
    options: options
  });
  if (!args.featureName) {
    console.log('should show all feature branches');
    process.exit(0);
  }

  NodeGit.Repository.open(currentFolder).then(function(repo) {
    NodeGit.Flow.startFeature(
        repo,
        args.featureName
      )
      .then((featureBranch) => {
        console.log(featureBranch.shorthand()); // => feautre/my-feature
      }, (error) => { console.error(error); });
  }, function(error) {
    console.error(error);
    process.exit(1);
  });
}
