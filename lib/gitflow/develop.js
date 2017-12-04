var kbString = require('../kb-string');
var gitRoot = require('../kb-git-root');
var fs = require('fs');
var currentFolder = process.cwd();
var NodeGit = require('nodegit-flow');
var Table = require('cli-table');
var _ = require('lodash');
var path = require('path');
var colorize = require('json-colorizer');
var Q = require('q');
var findRoot = require('find-root');
var countFiles = require('count-files');

var developGitFlow = {};

developGitFlow.develop = develop;

module.exports = developGitFlow;

var gRepo;


function develop() {
  NodeGit.Repository.open(gitRoot)
    .then(function(repo) {
      gRepo = repo;
      return repo.getBranch('develop')
    })
    .then(function(reference) {
        //checkout branch
        return gRepo.checkoutRef(reference);
    })
    .then(function(result) {
      process.exit(0);
    })
    .catch(function(error) {
      console.error(error);
      process.exit(1);
    });
}
