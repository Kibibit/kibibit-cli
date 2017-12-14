var kbString = require('../kb-string');
var Prompt = require('prompt-checkbox');
var statusGitflow = require('./status');
var colorize = require('json-colorizer');
var _ = require('lodash');
var stripAnsi = require('strip-ansi');
var NodeGit = require('nodegit-flow');
var gitRoot = require('../kb-git-root');

var commitGitflow = {};

commitGitflow.commit = commitit;

commitGitflow.questions = [];

module.exports = commitGitflow;

function commitit(args, options) {
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
          ]), allOptions);
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

            NodeGit.Repository.open(gitRoot)
              .then(function(repoResult) {
                console.log('also here!');
                repo = repoResult;
                return repo.refreshIndex();
              })
              .then(function(indexResult) {
                index = indexResult;
              })
              .then(function() {
                // add files
                return Q.all([ _.map(filesToCommit, function(file) {
                  return index.addByPath(file);
                }) ]);
              })
              .then(function() {
                // this will write all files to the index
                return index.write();
              })
              .then(function() {
                return index.writeTree();
              })
              .then(function(oidResult) {
                oid = oidResult;
                return nodegit.Reference.nameToId(repo, 'HEAD');
              })
              .then(function(head) {
                return repo.getCommit(head);
              })
              .then(function(parent) {
                var author = nodegit.Signature.create('Scott Chacon',
                  'schacon@gmail.com', 123456789, 60);
                var committer = nodegit.Signature.create('Scott A Chacon',
                  'scott@github.com', 987654321, 90);

                return repo.createCommit('HEAD', author, committer, 'message', oid, [ parent ]);
              })
              .done(function(commitId) {
                console.log('New Commit: ', commitId);
              });

            process.exit(0);
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
