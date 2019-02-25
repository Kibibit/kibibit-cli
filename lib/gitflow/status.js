var kbString = require('../kb-string');
var gitRoot = require('../kb-git-root');
// var fs = require('fs');
// var currentFolder = process.cwd();
var NodeGit = require('nodegit-flow')(require('nodegit'));
var Table = require('cli-table');
var _ = require('lodash');
var path = require('path');
// var colorize = require('json-colorizer');
var Q = require('q');
// var findRoot = require('find-root');
// var countFiles = require('count-files');

var GLOBAL = {};

var initGitflow = {};

initGitflow.status = status;
initGitflow.getStatusAsArray = getStatus;

var globalRepo, globalDiff;

module.exports = initGitflow;

function status() {
  gitRoot.getGitRoot()
    .then(function(_gitRoot) {
      if (!_gitRoot) {
        console.info(kbString.error('git repo not found'));
        process.exit(1);
      }

      GLOBAL.gitRoot = _gitRoot;

      GLOBAL.stagedTable = new Table({
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
        head: ['filename', 'state', 'diff']
      });

      GLOBAL.unstagedTable = new Table({
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
        head: ['filename', 'state', 'diff']
      });

      return getStatus();
    })
    .then(function(statuses) {
      console.log(kbString.success(
        'BRANCH NAME: [',
        kbString.white(statuses.branchName),
        ']'
      ));

      var seenFolderStaged = false;
      _.forEach(statuses.staged, function(file) {
        seenFolderStaged = seenFolderStaged || file.isFolder;
        var colored = file.isFolder ? kbString.success : kbString.info;
        GLOBAL.stagedTable.push([
          colored(!file.isFolder && seenFolderStaged ? '  ' : '', file.path),
          file.statusStr,
          file.changes ? kbString.build([
            kbString.success('++', file.changes[0]),
            ' | ',
            kbString.error('++', file.changes[1])
          ]) : ''
        ]);
      });

      var seenFolderUnstaged = false;
      _.forEach(statuses.unstaged, function(file) {
        seenFolderUnstaged = seenFolderUnstaged || file.isFolder;
        var colored = file.isFolder ? kbString.success : kbString.info;
        GLOBAL.unstagedTable.push([
          colored(!file.isFolder && seenFolderUnstaged ? '  ' : '', file.path),
          file.statusStr,
          file.changes ? kbString.build([
            kbString.success('++', file.changes[0]),
            ' | ',
            kbString.error('--', file.changes[1])
          ]) : ''
        ]);
      });

      console.log(kbString.build([
        '\n================\n',
        '= ', kbString.info('STAGED FILES'), ' =\n',
        '================'
      ]));
      console.log(GLOBAL.stagedTable.length ?
        GLOBAL.stagedTable.toString() :
        kbString.info('nothing to show here'));
      console.log(kbString.build([
        '\n==================\n',
        '= ', kbString.warning('UNSTAGED FILES'), ' =\n',
        '=================='
      ]));
      console.log(GLOBAL.unstagedTable.length ?
        GLOBAL.unstagedTable.toString() :
        kbString.info('nothing to show here'));

      process.exit(0);
    })
    .catch(function(error) {
      console.log(error);
      process.exit(1);
    });
}

function getStatus(shouldAddFolderEntries, shouldGroupBy) {
  shouldGroupBy = shouldGroupBy || 'isStaged';
  var deferred = Q.defer();

  // GLOBAL PROCESS VARIALBES
  var currentBranchName = '';
  var currentBranchStatuses;

  var files = [];
  gitRoot.getGitRoot()
    .then(function(_gitRoot) {
      return NodeGit.Repository.open(_gitRoot);
    })
    .then(function(repo) {
      globalRepo = repo;

      return Q.all([
        globalRepo.getStatus(),
        globalRepo.getCurrentBranch(),
        getDiff(globalRepo)
      ]);
    })
    .then(function(result) {
      currentBranchStatuses = result[0];
      globalDiff = result[2];
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
          isStaged: file.status()[0].indexOf('INDEX') >= 0,
          changes: globalDiff[file.path()]
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

function getDiff(repo) {
  var deferred = Q.defer();

  var result = {};

  NodeGit.Diff.indexToWorkdir(repo)
    .then(function(diff) {
      return diff.patches();
    })
    .then(function(patches) {
      _.forEach(patches, function(patch) {
        var lineStats = patch.lineStats();

        result[patch.newFile().path()] = [
          lineStats.total_additions,
          lineStats.total_deletions
        ];
      });

      deferred.resolve(result);
    })
    .catch(function(error) {
      deferred.reject(error);
      console.error(error);
    });

  return deferred.promise;
}
