var kbString = require('../kb-string');
var Prompt = require('prompt-checkbox');
var statusGitflow = require('./status');
var colorize = require('json-colorizer');
var _ = require('lodash');

var commitGitflow = {};

commitGitflow.commit = commitit;

commitGitflow.questions = [];

module.exports = commitGitflow;

function commitit(args, options) {
  try {
    statusGitflow.getStatusAsArray(false /* shouldAddFolderEntries */ )
      .then(function(statuses) {
          var stagedChoices = _.map(statuses.staged, function(status) {
            return {
              name: ' ' + kbString.warning(status.path) + ' ' + status.statusStr,
              checked: true,
              folder: status.folder + '/',
              value: status.path
            };
          });

          var unstagedChoices = _.map(statuses.unstaged, function(status) {
            return {
              name: ' ' + kbString.warning(status.path) + ' ' + status.statusStr,
              checked: false,
              folder: status.folder + '/',
              value: status.path
            };
          });

          var allOptions = _.groupBy(stagedChoices.concat(unstagedChoices), 'folder');

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

        prompt.run()
        .then(function(answers) {
          console.log(colorize(JSON.stringify(answers, null, 2)));
          // console.log(answers);
          process.exit(0);
        })
        .catch(function(err) {
          console.log(err);
          process.exit(1);
        })
      },
      function(error) {
        console.error('somehting broke!', error);
      });
} catch (error) {
  console.error('somehting broke!', error);
}
}
