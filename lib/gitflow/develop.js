// var kbString = require('../kb-string');
var gitRoot = require('../kb-git-root');
// var fs = require('fs');
// var currentFolder = process.cwd();
var NodeGit = require('nodegit-flow');
// var Table = require('cli-table');
// var _ = require('lodash');
// var path = require('path');
// var colorize = require('json-colorizer');
// var Q = require('q');
// var findRoot = require('find-root');
// var countFiles = require('count-files');

var developGitFlow = {};

developGitFlow.develop = develop;

module.exports = developGitFlow;

var gRepo;


function develop() {
  gitRoot.getGitRoot()
    .then(function(_gitRoot) {
      return NodeGit.Repository.open(_gitRoot);
    })
    .then(function(repo) {
      gRepo = repo;
      return NodeGit.Flow.getConfig(repo);
    })
    .then(function(config) {
      return repo.getBranch(config['gitflow.branch.develop'] || 'develop');
    })
    .then(function(reference) {
      //checkout branch
      return gRepo.checkoutRef(reference);
    })
    .then(function() {
      process.exit(0);
    })
    .catch(function(error) {
      console.error(error);
      process.exit(1);
    });
}
