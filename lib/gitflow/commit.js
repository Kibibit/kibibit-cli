/*eslint-env es6*/
var KbError = require('../errors/KbError');
var errorHandler = require('../errors/error-handler')('[COMMIT-FLOW]');
var kbString = require('../kb-string');
var Prompt = require('prompt-checkbox');
var _ = require('lodash');
var kbRepo = require('../services/kb-repo');
var stripAnsi = require('strip-ansi');
var Table = require('cli-table');
var inquirer = require('inquirer');


var commitGitflow = {};

commitGitflow.commit = commit;

commitGitflow.questions = [];

module.exports = commitGitflow;

function commit() {
  var data = {};

  return kbRepo.openGit()
    .then(function(repo) {
      data.repo = repo;

      return kbRepo.getCurrentGitFilesStatus(data.repo,
        false /* shouldAddFolderEntries */);
    })
    .then(function(statuses) {

      return selectFilesToCommit(statuses);
    })
    .then(function(filesToCommit) {
      data.filesToCommit = filesToCommit;

      return askForCommitDetails();
    })
    .then(function(commitDetails) {
      data.commitDetails = commitDetails;
      return kbRepo.commitFilesByPath(data.repo, {
        filesToCommit: data.filesToCommit,
        commitMessage: commitDetails.commitMessage
      });
    })
    .then(function(commitDetails) {
      data.commitDetails = commitDetails;

      var commitSummaryTable = new Table({
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
        }
      });

      commitSummaryTable.push([
        kbString.info('id'),
        kbString.white(data.commitDetails.commit)
      ]);

      commitSummaryTable.push([
        kbString.info('push to branch'),
        kbString.success(data.commitDetails.branch)
      ]);

      commitSummaryTable.push([
        kbString.info('author'),
        kbString.build([
          kbString.success(data.commitDetails.authorName),
          kbString.warning('<', data.commitDetails.authorEmail, '>')
        ])
      ]);

      commitSummaryTable.push([
        kbString.info('commit message'),
        data.commitDetails.commitMessage
      ]);

      commitSummaryTable.push([
        kbString.info('parent commit'),
        kbString.white(data.commitDetails.parents[0])
      ]);

      return commitSummaryTable;
    })
    .then(function(commitSummaryTable) {
      console.log(kbString.success([
        '\n committed succesfully \n',
        '======================='
      ]));

      console.log(commitSummaryTable.toString());

      process.exit(0);
    })
    .catch(errorHandler);
}

function selectFilesToCommit(statuses) {
  var stagedChoices = _.map(statuses.staged, function(status) {
    return {
      name: kbString.warning(status.path) + ' ' + status.statusStr,
      checked: true,
      folder: status.folder + '/',
      value: kbString.warning(status.path) + ' ' + status.statusStr
    };
  });

  var unstagedChoices = _.map(statuses.unstaged, function(status) {
    return {
      name: kbString.warning(status.path) + ' ' + status.statusStr,
      checked: false,
      folder: status.folder + '/',
      value: kbString.warning(status.path) + ' ' + status.statusStr
    };
  });

  var allOptions =
        _.groupBy(stagedChoices.concat(unstagedChoices), 'folder');

  if (_.isEmpty(allOptions)) {
    console.log(kbString.error([
      'no changes were found.\n',
      'change some files in order to commit them.'
    ]));
    process.exit(126);
  }

  var prompt = new Prompt({
    name: 'commitFiles',
    message: kbString.info(
      '==================================================',
      kbString.param(' ?\n? '),
      'Which files do you want to include in this commit?',
      kbString.param(' ?\n? '),
      '==================================================',
      kbString.param(' ?\n'),
      kbString.warning(
        '\n- select files with ', kbString.important('space bar'),
        ', confirm selection with ', kbString.important('enter'), ' -\n'
      )
    ),
    radio: true,
    choices: allOptions
  });

  return prompt.run()
    .then(function(answers) {
      var filesToCommit = _.map(answers, function(answer) {
        return stripAnsi(answer).replace(/\s\[.*?\]/, '');
      });
      // console.log(colorize(JSON.stringify(filesToCommit, null, 2)));

      if (!filesToCommit.length) {
        throw new KbError('no files were selected', 0);
      }

      return filesToCommit;
    });
}

function askForCommitDetails(branch) {
  return inquirer.prompt([
    askForCommitTitle(branch),
    editCommitMessageQuestion()
  ])
    .then(function(answers) {
      var markedMessage;
      var completeMessage = [
        answers.commitTitle,
        '\n\n',
        answers.commitMessage
      ].join('');

      try {
        markedMessage = [
          '# ',
          answers.commitTitle,
          '\n\n',
          marked(answers.commitMessage, {
            renderer: renderer
          })
        ].join('');
      } catch (e) {
        console.error('MARKDOWN ERROR!', e);
      }

      return {
        commitMessage: completeMessage,
        markedCommitMessage: markedMessage
      };
    });
}

function editCommitMessageQuestion() {
  return {
    type: 'editor',
    name: 'commitMessage',
    message: 'Please write a short commit message',
    validate: function(text) {
      if (text && text.split('\n')[0].length > 72) {
        return kbString.build([
          'each line in the commit message must be ',
          'no more than 72 characters long.\n',
          'For more info: ',
          'http://tbaggery.com/2008/04/19/',
          'a-note-about-git-commit-messages.html\n\n'
        ]);
      }

      return true;
    },
    default: function() {
      return 'master';
    }
  };
}

function askForCommitTitle(branch) {
  return {
    type: 'input',
    name: 'commitTitle',
    message: 'Please enter a title for your commit - ' +
      kbString.param('[', branch || '', ']: '),
    validate: function(commitTitle) {
      var isTitleShortEnough = commitTitle.length <= 50;
      if (!_.isEmpty(commitTitle) && isTitleShortEnough) {
        return true;
      }

      if (!isTitleShortEnough) {
        return kbString.build([
          'The summary of your commit message must ',
          'be maximum 50 characters long.\n',
          'For more info: ',
          'http://tbaggery.com/2008/04/19/',
          'a-note-about-git-commit-messages.html\n\n'
        ]);
      }

      return 'no input detected. please try again';
    }
  };
}
