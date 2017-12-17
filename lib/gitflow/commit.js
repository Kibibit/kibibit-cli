var kbString = require('../kb-string');
var Prompt = require('prompt-checkbox');
var statusGitflow = require('./status');
var util = require('./utility');
var colorize = require('json-colorizer');
var _ = require('lodash');
var stripAnsi = require('strip-ansi');
var NodeGit = require('nodegit-flow');
var gitRoot = require('../kb-git-root');
var inquirer = require('inquirer');

var GLOB = {
  INDEX: '',
  REPO: '',
  OID: '',
  PARENT: '',
};

var commitGitflow = {};

commitGitflow.commit = commitit;

commitGitflow.questions = [];

module.exports = commitGitflow;

function commitit(/* args, options */) {
  if (!gitRoot) {
    console.info(kbString.error('git repo not found'));
    process.exit(1);
  }

  try {
    statusGitflow.getStatusAsArray(false /* shouldAddFolderEntries */)
      .then(function(statuses) {
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

        prompt.run()
          .then(function(answers) {
            filesToCommit = _.map(answers, function(answer) {
              return stripAnsi(answer).replace(/\s\[.*?\]/, '');
            });
            console.log(colorize(JSON.stringify(filesToCommit, null, 2)));

            if (!filesToCommit.length) {
              console.log('no files were selected. aborting...');
              process.exit(0);
            }

            console.log('got here!', gitRoot);

            try {

              NodeGit.Repository.open(gitRoot)
                .then(function(repo) {
                  GLOB.REPO = repo;
                  return util.openIndex(GLOB.REPO);
                })
                .then(function(indexResult) {
                  GLOB.INDEX = indexResult;
                })
                .then(function() {
                  return util.addFilesToIndex(GLOB.INDEX, filesToCommit);
                })
                .then(function() {
                  return util.writeFilesInIndex(GLOB.INDEX);
                })
                .then(function() {
                  return util.writeIndexTree(GLOB.INDEX);
                })
                .then(function(oidResult) {
                  GLOB.OID = oidResult;
                  return NodeGit.Reference.nameToId(GLOB.REPO, 'HEAD');
                })
                .then(function(headIndex) {
                  return util.getRootCommit(GLOB.REPO, headIndex);
                })
                .then(function(parent) {
                  GLOB.PARENT = parent;
                  return inquirer.prompt([ editCommitMessageQuestion() ]);
                })
                .then(function(answers) {
                  var author = NodeGit.Signature.now('Neil Kalman',
                    'neilkalman@gmail.com');
                  var committer = NodeGit.Signature.now('Neil Kalman',
                    'neilkalman@github.com');

                  console.log(answers);

                  console.log('GOT HERE!!!',{
                    HEAD: 'HEAD',
                    AUTHOR: author,
                    COMMITER: committer,
                    MESSAGE: answers.commitMessage || 'error!',
                    OID: GLOB.OID,
                    ADDTO: [ GLOB.PARENT ]
                  });

                  return GLOB.REPO.createCommit('HEAD',
                    author,
                    committer,
                    answers.commitMessage || 'error!',
                    GLOB.OID,
                    [ GLOB.PARENT ]);
                })
                .catch(function(error) {
                  console.error(error);
                })
                .then(function(commitId) {
                  console.log('New Commit: ', commitId);
                });

            } catch (error) {
              console.log(error);
            }

            // process.exit(0);
          })
          .catch(function(err) {
            console.log(err);
            process.exit(1);
          });
      },
      function(error) {
        console.error('somehting broke!', error);
      });
  } catch (error) {
    console.error('somehting broke!', error);
  }
}

function editCommitMessageQuestion() {
  return {
    type: 'editor',
    name: 'commitMessage',
    message: 'Please write a short commit message',
    validate: function(text) {
      if (text.split('\n').length < 3) {
        return 'Must be at least 3 lines.';
      }

      return true;
    },
    default: function() {
      return 'master';
    }
  };
}
