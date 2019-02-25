var kbString = require('../kb-string');
var _ = require('lodash');
var Q = require('q');
var NodeGit = require('nodegit-flow')(require('nodegit'));
var moment = require('moment');
var gitRoot = require('../kb-git-root');

var GLOBAL = {
  repo: null,
  featureBranches: null
};

var featureGitflow = {};

featureGitflow.feature = feature;

module.exports = featureGitflow;

function startFeature(args) {
  return NodeGit.Flow.startFeature(
    GLOBAL.repo,
    args.featureName
  )
    .then(function(branch) {
      console
        .log('creating feature named', args.featureName);
      return branch;
    })
    .catch(function(/*error*/) {
      // console.trace(error);
      return NodeGit.Flow.getConfig(GLOBAL.repo)
        .then(function(config) {
          // console.log(config);
          GLOBAL.currFeatureBranch =
            config['gitflow.prefix.feature'] + args.featureName;
          console
            .log('checking out existing feature ', GLOBAL.currFeatureBranch);
          return GLOBAL.repo.checkoutBranch(GLOBAL.currFeatureBranch);
        // process.exit(1);
        })
        .then(function() {
          return GLOBAL.repo.getBranch(GLOBAL.currFeatureBranch);
        });
    });
}

function feature(args, options) {

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

      if (!args.featureName) {
        return GLOBAL.repo.getReferenceNames(NodeGit.Reference.TYPE.LISTALL);
      } else {
        return startFeature(args)
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
        /^refs\/remotes\/.*?\/feature\// :
        /^refs\/heads\/feature\//;

      allBranches = _.filter(allBranches, function(branch) {
        return regexItem.test(branch); // feature\/
      });

      var featureBranches = _.map(allBranches, function(branch) {
        return branch.replace(regexItem, '');
      });

      GLOBAL.featureBranches = featureBranches;

      console.log(kbString.success([
        'Found ',
        featureBranches.length, ' ',
        kbString.important(options.remote ? 'remote' : 'local'),
        ' features:\n',
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
              'feature/',
              GLOBAL.featureBranches[index],
              ']'
            ]),
            ' ',
            kbString.error('no commits yet...'),
            ' ---ERROR: ', commit.message
          ]));
          return;
        }
        console.log(kbString.build([
          kbString.info('[', 'feature/', GLOBAL.featureBranches[index], ']'),
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
