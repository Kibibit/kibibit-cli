var kbString = require('../kb-string');
var _ = require('lodash');
var Q = require('q');
var NodeGit = require('nodegit-flow')(require('nodegit'));
var moment = require('moment');
var gitRoot = require('../kb-git-root');

var GLOBAL = {
  repo: null,
  releaseBranches: null
};

var releaseGitflow = {};

releaseGitflow.release = release;

module.exports = releaseGitflow;

function startRelease(args) {
  return NodeGit.Flow.startRelease(
    GLOBAL.repo,
    args.releaseName
  )
    .then(function(branch) {
      console
        .log('creating release named', args.releaseName);
      return branch;
    })
    .catch(function(/*error*/) {
      // console.trace(error);
      return NodeGit.Flow.getConfig(GLOBAL.repo)
        .then(function(config) {
          // console.log(config);
          GLOBAL.currReleaseBranch =
            config['gitflow.prefix.release'] + args.releaseName;
          console
            .log('checking out existing release ', GLOBAL.currReleaseBranch);
          return GLOBAL.repo.checkoutBranch(GLOBAL.currReleaseBranch);
        // process.exit(1);
        })
        .then(function() {
          return GLOBAL.repo.getBranch(GLOBAL.currReleaseBranch);
        });
    });
}

function release(args, options) {

  gitRoot.getGitRoot()
    .then(function(_gitRoot) {
      if (!_gitRoot) {
        console.info(kbString.error('git repo not found'));
        process.exit(1);
      } else {
        GLOBAL.gitRoot = _gitRoot;
        // open the git repo if it exists
        return NodeGit.Repository.open(GLOBAL.gitRoot);
      }
    })
    .then(function(repo) {
      GLOBAL.repo = repo;

      return NodeGit.Tag.list(GLOBAL.repo).then(function(array) {
        console.log('all tags!', array);
        var releaseTags = _.filter(array, function(tag) {
          return /^v\d+\.\d+\.\d+$/gi.test(tag);
        });
        console.log('only release tags', releaseTags);
        process.exit(1);
        return NodeGit.Tag.lookupPrefix(GLOBAL.repo, 'v', 1);
      });
    })
    .then(function() {

      if (!args.releaseName) {
        return GLOBAL.repo.getReferenceNames(NodeGit.Reference.TYPE.LISTALL);
      } else {
        return startRelease(args)
          .then(function(/* releaseBranch */) {
            // upload branch to github
            // (either empty or with an empty init commit)
            // console.log(releaseBranch.shorthand()); // => release/my-release
            process.exit(0);
          });
      }
    })
    .then(function(allBranches) {
      var regexItem = options.remote ?
        /^refs\/remotes\/.*?\/release\// :
        /^refs\/heads\/release\//;

      allBranches = _.filter(allBranches, function(branch) {
        return regexItem.test(branch); // release\/
      });

      var releaseBranches = _.map(allBranches, function(branch) {
        return branch.replace(regexItem, '');
      });

      GLOBAL.releaseBranches = releaseBranches;

      console.log(kbString.success([
        'Found ',
        releaseBranches.length, ' ',
        kbString.important(options.remote ? 'remote' : 'local'),
        ' releases:\n',
        '======================'
      ]));

      // todo(thatkookooguy): simplify this!
      return Q.all(_.map(allBranches, function(branch) {
        return GLOBAL.repo.getBranchCommit(branch)
          .then(function(result) {
            return result;
          }, function(error) {
            var deferred = Q.defer();
            deferred.resolve(error);

            return deferred.promise;
          });
      }));
    })
    .then(function(allLastCommits) {
      _.forEach(allLastCommits, function(commit, index) {
        if (commit.errno) {
          console.log(kbString.build([
            kbString.info([
              '[',
              'release/',
              GLOBAL.releaseBranches[index],
              ']'
            ]),
            ' ',
            kbString.error('no commits yet...'),
            ' ---ERROR: ', commit.message
          ]));
          return;
        }
        console.log(kbString.build([
          kbString.info('[', 'release/', GLOBAL.releaseBranches[index], ']'),
          ' ',
          kbString.white('(', commit.author(), ')'),
          kbString.error(' > '),
          kbString.success(commit.message().trim().split('\n', 1)[0]),
          kbString.warning(' (', moment(commit.date()).fromNow(), ')')
        ]));
      });
      process.exit(0);
    })
    .catch(function(error) {
      console.trace('oops.... something went wrong...', error);
      process.exit(1);
    });
}
