var errorHandler = require('../errors/error-handler')('[STATUS-FLOW]');
var kbString = require('../kb-string');
var Table = require('cli-table');
var _ = require('lodash');
var kbRepo = require('../services/kb-repo');

var STAGED_HEADER = kbString.build([
  '\n================\n',
  '= ', kbString.info('STAGED FILES'), ' =\n',
  '================'
]);
var UNSTAGED_HEADER = kbString.build([
  '\n==================\n',
  '= ', kbString.warning('UNSTAGED FILES'), ' =\n',
  '=================='
]);
var STATUS_TABLE_OPTIONS = {
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
};

var initGitflow = {};

initGitflow.status = status;

module.exports = initGitflow;

function status() {
  var data = {};

  return kbRepo.openGit()
    .then(function(repo) {
      data.repo = repo;

      data.stagedTable = new Table(STATUS_TABLE_OPTIONS);

      data.unstagedTable = new Table(STATUS_TABLE_OPTIONS);

      return kbRepo.getCurrentGitFilesStatus(data.repo);
    })
    .then(function(statuses) {
      console.log(kbString.success(
        'BRANCH NAME: [',
        kbString.white(statuses.branchName),
        ']'
      ));

      addFilesStatusToTable(statuses.staged, data.stagedTable);
      addFilesStatusToTable(statuses.unstaged, data.unstagedTable);

      console.log(STAGED_HEADER);
      console.log(renderTable(data.stagedTable));
      console.log(UNSTAGED_HEADER);
      console.log(renderTable(data.unstagedTable));

      process.exit(0);
    })
    .catch(errorHandler);
}

function renderTable(viewTable) {
  return viewTable.length ?
    viewTable.toString() :
    kbString.info('nothing to show here');
}

function addFilesStatusToTable(fileStatusArray, viewTable) {
  var seenFolderStaged = false;
  _.forEach(fileStatusArray, function(file) {
    seenFolderStaged = seenFolderStaged || file.isFolder;
    var colored = file.isFolder ? kbString.success : kbString.info;
    viewTable.push([
      colored(!file.isFolder && seenFolderStaged ? '  ' : '', file.path),
      file.statusStr,
      file.changes ? kbString.build([
        kbString.success('++', file.changes[0]),
        ' | ',
        kbString.error('--', file.changes[1])
      ]) : ''
    ]);
  });
}
