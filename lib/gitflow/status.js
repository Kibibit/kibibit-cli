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

var initGitflow = {};

initGitflow.status = status;
initGitflow.getStatusAsArray = getStatus;

module.exports = initGitflow;

function status() {
  if (!gitRoot) {
    console.info(kbString.error('git repo not found'));
    process.exit(1);
  }

  var stagedTable = new Table({
    chars: {
      'top': '═',
      'top-mid': '╤',
      'top-left': '╔',
      'top-right': '╗',
      'bottom': '═',
      'bottom-mid': '╧',
      'bottom-left': '╚',
      'bottom-right': '╝',
      'left': '║',
      'left-mid': '╟',
      'mid': '─',
      'mid-mid': '┼',
      'right': '║',
      'right-mid': '╢',
      'middle': '│'
    },
    head: ['filename', 'state']
  });

  var unstagedTable = new Table({
    chars: {
      'top': '═',
      'top-mid': '╤',
      'top-left': '╔',
      'top-right': '╗',
      'bottom': '═',
      'bottom-mid': '╧',
      'bottom-left': '╚',
      'bottom-right': '╝',
      'left': '║',
      'left-mid': '╟',
      'mid': '─',
      'mid-mid': '┼',
      'right': '║',
      'right-mid': '╢',
      'middle': '│'
    },
    head: ['filename', 'state']
  });
  getStatus().then(function(statuses) {
    console.log(kbString.success(
      'BRANCH NAME: [',
      kbString.white(statuses.branchName),
      ']'
    ));
    var seenFolderStaged = false;
    _.forEach(statuses.staged, function(file) {
      seenFolderStaged = seenFolderStaged || file.isFolder;
      var colored = file.isFolder ? kbString.success : kbString.info;
      stagedTable.push([
        colored(!file.isFolder && seenFolderStaged ? '  ' : '', file.path),
        file.statusStr
      ]);
    });

    var seenFolderUnstaged = false;
    _.forEach(statuses.unstaged, function(file) {
      seenFolderUnstaged = seenFolderUnstaged || file.isFolder;
      var colored = file.isFolder ? kbString.success : kbString.info;
      unstagedTable.push([
        colored(!file.isFolder && seenFolderUnstaged ? '  ' : '', file.path),
        file.statusStr
      ]);
    });

    console.log(kbString.build([
      '\n================\n',
      '= ', kbString.info('STAGED FILES'), ' =\n',
      '================'
    ]));
    console.log(stagedTable.length ?
      stagedTable.toString() :
      kbString.info('nothing to show here'));
    console.log(kbString.build([
      '\n==================\n',
      '= ', kbString.warning('UNSTAGED FILES'), ' =\n',
      '=================='
    ]));
    console.log(unstagedTable.length ?
      unstagedTable.toString() :
      kbString.info('nothing to show here'));

    process.exit(0);
  }, function(error) {
    console.log(error);
    throw err;
  });
}

function getStatus(shouldAddFolderEntries, shouldGroupBy) {
  shouldGroupBy = shouldGroupBy || 'isStaged';
  var deferred = Q.defer();

  // GLOBAL PROCESS VARIALBES
  var currentBranchName = '';
  var currentBranchStatuses;

  var files = [];
  NodeGit.Repository.open(gitRoot)
    .then(function(repo) {
      return Q.all([repo.getStatus(), repo.getCurrentBranch()]);
    })
    .then(function (result) {
      currentBranchStatuses = result[0];
      return NodeGit.Branch.name(result[1]);
    })
    .then(function(currBranchName) {
      var statuses = currentBranchStatuses;
      currentBranchName = currBranchName;

      statuses.forEach(function(file) {
        files.push({
          path: file.path(),
          status: statusToArray(file),
          statusStr: statusToText(file),
          folder: path.dirname(file.path()),
          isStaged: file.status()[0].indexOf('INDEX') >= 0
        });
      });

      var sortedFiles = _.sortBy(files, [ 'path' ]);

      // separate to staged vs unstaged
      if (shouldGroupBy) {
        var separatedByStage = _.groupBy(sortedFiles, shouldGroupBy);
      }

      if (shouldAddFolderEntries) {
        separatedByStage.true = addFolderEntries(separatedByStage.true);
        separatedByStage.false = addFolderEntries(separatedByStage.false);
      }

      deferred.resolve({
        staged: separatedByStage.true,
        unstaged: separatedByStage.false,
        branchName: currentBranchName
      });
    })
  .catch(function(err) {
    console.error('couldn\'t open repo', err);
    throw err;
    deferred.reject(err);
  });

  return deferred.promise;
}

function addFolderEntries(files) {
  files = _.sortBy(files, [ 'path' ]);

  var filesWithFolders = [];
  var currentFolder = '.';
  _.forEach(files, function(file) {
    if (file.folder === currentFolder || file.folder === currentFolder + '/') {
      filesWithFolders.push(file);
    } else {
      filesWithFolders.push({
        path: file.folder + '/',
        status: '',
        statusStr: '',
        isFolder: true
      });
      currentFolder = file.folder;
      filesWithFolders.push(file);
    }
  });

  return filesWithFolders;
}

function statusToArray(status) {
  var words = [];
  if (status.isNew()) {
    words.push('NEW');
  }
  if (status.isModified()) {
    words.push('MODIFIED');
  }
  if (status.isTypechange()) {
    words.push('TYPECHANGE');
  }
  if (status.isRenamed()) {
    words.push('RENAMED');
  }
  if (status.isIgnored()) {
    words.push('IGNORED');
  }

  return words;
}

function statusToText(status) {
  var words = [];
  if (status.isNew()) {
    words.push(kbString.build(
      kbString.white('['),
      kbString.info('NEW'),
      kbString.white(']')
    ));
  }
  if (status.isModified()) {
    words.push(kbString.build(
      kbString.white('['),
      kbString.warning('MODIFIED'),
      kbString.white(']')
    ));
  }
  if (status.isTypechange()) {
    words.push(kbString.build(
      kbString.white('['),
      kbString.warning('TYPECHANGE'),
      kbString.white(']')
    ));
  }
  if (status.isRenamed()) {
    words.push(kbString.build(
      kbString.white('['),
      kbString.error('RENAMED'),
      kbString.white(']')
    ));
  }
  if (status.isIgnored()) {
    words.push(kbString.build(
      kbString.white('['),
      kbString.white('IGNORED'),
      kbString.white(']')
    ));
  }

  return words.join(' ');
}
