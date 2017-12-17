var kbString = require('../kb-string');
var _ = require('lodash');
var Q = require('q');
var colorize = require('json-colorizer');

var util = {};

util.addFilesToIndex = addFilesToIndex;
util.openIndex = openIndex;
util.writeFilesInIndex = writeFilesInIndex;
util.writeIndexTree = writeIndexTree;
util.getRootCommit = getRootCommit;

module.exports = util;

function addFilesToIndex(index, filesToCommit) {
  var fName = arguments.callee.toString().match(/function ([^\(]+)/)[1];
  report(fName);
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
  report(fName);
  if (!repository) { return Q.reject(fName + ' expects a repository arg'); }

  return repository.refreshIndex();
}

// this will write all files to the index
function writeFilesInIndex(index) {
  var fName = arguments.callee.toString().match(/function ([^\(]+)/)[1];
  report(fName);
  if (!index) { return Q.reject(fName + ' expects an index arg'); }
  if (!index.write) { report(index); }

  return index.write();
}

function writeIndexTree(index) {
  var fName = arguments.callee.toString().match(/function ([^\(]+)/)[1];
  report(fName);
  if (!index) { return Q.reject(fName + ' expects an index arg'); }

  return index.writeTree();
}

function getRootCommit(repo, head) {
  var fName = arguments.callee.toString().match(/function ([^\(]+)/)[1];
  report(fName);

  if (!repo || !head) {
    return Q.reject(fName + ' expects a repo and an index arg');
  }

  return repo.getCommit(head);
}

function report(what, vars) {
  console.error(kbString.error(what),
    vars ? colorize(JSON.stringify(vars, null, 2)) : '');
}
