var kbString = require('../kb-string');
var _ = require('lodash');
var Q = require('q');
var NodeGit = require('nodegit-flow');
var moment = require('moment');
var gitRoot = require('../kb-git-root');

var GLOBAL = {
  repo: null,
  featureBranches: null
};

var hotfixGitflow = {};

hotfixGitflow.hotfix = hotfix;

module.exports = hotfixGitflow;

function startHotfix(args) {
  return NodeGit.Flow.startHotfix(
    GLOBAL.repo,
    args.hotfixName
  )
    .then(function(branch) {
      console
        .log('creating hotfix named', args.hotfixName);
      return branch;
    })
    .catch(function(/*error*/) {
      // console.trace(error);
      return NodeGit.Flow.getConfig(GLOBAL.repo)
        .then(function(config) {
          // console.log(config);
          GLOBAL.currHotfixBranch =
            config['gitflow.prefix.hotfix'] + args.hotfixName;
          console
            .log('checking out existing hotfix ', GLOBAL.currHotfixBranch);
          return GLOBAL.repo.checkoutBranch(GLOBAL.currHotfixBranch);
        // process.exit(1);
        })
        .then(function() {
          return GLOBAL.repo.getBranch(GLOBAL.currHotfixBranch);
        });
    });
}

function hotfix(args, options) {

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

      if (!args.hotfixName) {
        return GLOBAL.repo.getReferenceNames(NodeGit.Reference.TYPE.LISTALL);
      } else {
        return startHotfix(args)
          .then(function(/* featureBranch */) {
            // upload branch to github
            // (either empty or with an empty init commit)
            // console.log(featureBranch.shorthand()); // => feautre/my-feature
            process.exit(0);
          });
      }
    })
    .then(function(allBranches) {
      var regexItem = options.remote ?
        /^refs\/remotes\/.*?\/hotfix\// :
        /^refs\/heads\/hotfix\//;

      allBranches = _.filter(allBranches, function(branch) {
        return regexItem.test(branch); // feature\/
      });

      var hotfixBranches = _.map(allBranches, function(branch) {
        return branch.replace(regexItem, '');
      });

      GLOBAL.hotfixBranches = hotfixBranches;

      console.log(kbString.success([
        'Found ',
        hotfixBranches.length, ' ',
        kbString.important(options.remote ? 'remote' : 'local'),
        ' hotfixes:\n',
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
              'hotfix/',
              GLOBAL.hotfixBranches[index],
              ']'
            ]),
            ' ',
            kbString.error('no commits yet...'),
            ' ---ERROR: ', commit.message
          ]));
          return;
        }
        console.log(kbString.build([
          kbString.info('[', 'hotfix/', GLOBAL.hotfixBranches[index], ']'),
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
