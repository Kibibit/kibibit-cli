var kbString = require('./kb-string');
var initGitflow = require('./gitflow/init');
var statusGitflow = require('./gitflow/status');
var commitGitflow = require('./gitflow/commit');
var featureGitflow = require('./gitflow/feature');
var hotfixGitflow = require('./gitflow/hotfix');
var developGitflow = require('./gitflow/develop');
var masterGitflow = require('./gitflow/master');
var inquirer = require('inquirer');
var shell = require('shelljs');
var Q = require('q');
var Git = require("nodegit");
var colorize = require('json-colorizer');
var _ = require('lodash');
var github = require('octonode');
var currentFolder = process.cwd();
var signingIn = [
  kbString.info(kbString.warning('/'), ' Signing in'),
  kbString.info(kbString.warning('|'), ' Signing in..'),
  kbString.info(kbString.warning('\\'), ' Signing in..'),
  kbString.info(kbString.warning('-'), ' Signing in...')
];
var signingInSteps = 4;

var client = github.client();

var commandDefinitions = {};

commandDefinitions.attach = function attachCommands(program) {
  addSubCommandCommit(program);
  addSubCommandStatus(program);
  addSubCommandInit(program);
  addSubCommandClone(program);
  addSubCommandFeature(program);
  addSubCommandHotfix(program);
  addSubCommandFinish(program);
  addSubCommandRelease(program);
  addSubCommandUpdate(program);
  addSubCommandPush(program);
  addSubCommandMaster(program);
  addSubCommandDevelop(program);
}

function addSubCommandMaster(program) {
  program
    .command('master')
    .description(kbString.info('checkout master branch'))
    .action(masterGitflow.develop)
    .on('help', function(cmd) {
      cmd.outputIndented('Examples', [
        kbString.build(
          kbString.success('$ '),
          kbString.kibibitLogo(),
          kbString.success(' master ')
        )
      ]);
    }).parent;
}

function addSubCommandDevelop(program) {
  program
    .command('develop')
    .description(kbString.info('checkout develop branch'))
    .action(developGitflow.develop)
    .on('help', function(cmd) {
      cmd.outputIndented('Examples', [
        kbString.build(
          kbString.success('$ '),
          kbString.kibibitLogo(),
          kbString.success(' develop ')
        )
      ]);
    }).parent;
}

function addSubCommandCommit(program) {
  program
    .command('commit')
    .description(kbString.info('clone a remote repository'))
    .action(commitGitflow.commit)
    .option('-v, --verbose', 'only show my features')
    .option('-S, --gpg-sign', 'GPG sign commit')
    .on('help', function(cmd) {
      cmd.outputIndented('Examples', [
        kbString.build(
          kbString.success('$ '),
          kbString.kibibitLogo(),
          kbString.success(' commit '),
          kbString.param('search-db')
        ),
        kbString.build(
          kbString.success('$ '),
          kbString.kibibitLogo(),
          kbString.success(' commit')
        ),
        kbString.build(
          kbString.success('$ '),
          kbString.kibibitLogo(),
          kbString.success(' commit '),
          '-v'
        )
      ]);
    }).parent;
}

function addSubCommandClone(program) {
  program
    .command('clone <uri>')
    .description(kbString.info('clone a remote repository'))
    .action(clone)
    .option('-v, --verbose', 'only show my features')
    .option('-S, --gpg-sign', 'GPG sign commit')
    .on('help', function(cmd) {
      cmd.outputIndented('Examples', [
        kbString.build(
          kbString.success('$ '),
          kbString.kibibitLogo(),
          kbString.success(' commit '),
          kbString.param('search-db')
        ),
        kbString.build(
          kbString.success('$ '),
          kbString.kibibitLogo(),
          kbString.success(' commit')
        ),
        kbString.build(
          kbString.success('$ '),
          kbString.kibibitLogo(),
          kbString.success(' commit '),
          '-v'
        )
      ]);
    }).parent;
}

function addSubCommandStatus(program) {
  program
    .command('status')
    .description(kbString.info('show current branch status'))
    .action(statusGitflow.status)
    .option('-v, --verbose', 'only show my features')
    .option('-S, --gpg-sign', 'GPG sign commit')
    .on('help', function(cmd) {
      cmd.outputIndented('Examples', [
        kbString.build(
          kbString.success('$ '),
          kbString.kibibitLogo(),
          kbString.success(' status ')
        ),
        kbString.build(
          kbString.success('$ '),
          kbString.kibibitLogo(),
          kbString.success(' status')
        ),
        kbString.build(
          kbString.success('$ '),
          kbString.kibibitLogo(),
          kbString.success(' status ')
        )
      ]);
    }).parent;
}

function addSubCommandFeature(program) {
  program
    .command('feature [featureName]')
    .description(
      kbString.info('start or continue a feature ') + kbString.warning('(will be prompted)' + kbString.info('. If no featureName is given, returns all ongoing features'))
    )
    .action(featureGitflow.feature)
    .option('-m, --mine', 'only show my features')
    .option('-r, --remote', 'only show remote features')
    .on('help', function(cmd) {
      cmd.outputIndented('Examples', [
        kbString.build(
          kbString.success('$ '),
          kbString.kibibitLogo(),
          kbString.success(' feature '),
          kbString.param('search-db')
        ),
        kbString.build(
          kbString.success('$ '),
          kbString.kibibitLogo(),
          kbString.success(' feature')
        ),
        kbString.build(
          kbString.success('$ '),
          kbString.kibibitLogo(),
          kbString.success(' feature '),
          '-m'
        )
      ]);
    }).parent;
}

function addSubCommandHotfix(program) {
  program
    .command('hotfix [hotfixName]')
    .description(
      kbString.info('start or continue a hotfix ') + kbString.warning('(will be prompted)' + kbString.info('. If no hotfixName is given, returns all ongoing hotfixes'))
    )
    .action(hotfixGitflow.hotfix)
    .option('-m, --mine', 'only show my hotfixes')
    .on('help', function(cmd) {
      cmd.outputIndented('Examples', [
        kbString.build(
          kbString.success('$ '),
          kbString.kibibitLogo(),
          kbString.success(' hotfix '),
          kbString.param('search-db-edge-case-no-query')
        ),
        kbString.build(
          kbString.success('$ '),
          kbString.kibibitLogo(),
          kbString.success(' hotfix')
        ),
        kbString.build(
          kbString.success('$ '),
          kbString.kibibitLogo(),
          kbString.success(' hotfix '),
          '-m'
        )
      ]);
    }).parent;
}

function addSubCommandFinish(program) {
  program
    .command('finish <featureName>')
    .description(
      kbString.info('use GitHub to issue a pull request to origin/develop.')
    )
    .action(finish)
    .on('help', function(cmd) {
      cmd.outputIndented('Examples', [
        kbString.build(
          kbString.success('$ '),
          kbString.kibibitLogo(),
          kbString.success(' finish '),
          kbString.param('search-db')
        )
      ]);
    }).parent;
}

function addSubCommandRelease(program) {
  program
    .command('release <action>')
    .description(kbString.build(
      kbString.info('When you have enough completed features in origin/develop, '),
      kbString.info('create a release branch, test it and fix it, '),
      kbString.info('and then merge it into origin/master')
    ))
    .action(release)
    .on('help', function(cmd) {
      cmd.outputIndented('Examples', [
        kbString.build(
          kbString.success('$ '),
          kbString.kibibitLogo(),
          kbString.success(' release '),
          kbString.param('start')
        ),
        kbString.success('<test + fix cycle>'),
        kbString.build(
          kbString.success('$ '),
          kbString.kibibitLogo(),
          kbString.success(' release '),
          kbString.param('finish')
        )
      ]);
    }).parent;
}

function addSubCommandUpdate(program) {
  program
    .command('update')
    .description(
      kbString.info('keep up-to-date with completed features on GitHub')
    )
    .action(update)
    .on('help', function(cmd) {
      cmd.outputIndented('Examples', [
        kbString.build(
          kbString.success('$ '),
          kbString.kibibitLogo(),
          kbString.success(' update')
        )
      ]);
    }).parent;
}

function addSubCommandPush(program) {
  program
    .command('push')
    .description(
      kbString.info('push your feature branch back to GitHub as you make progress ' +
        'and want to save your work')
    )
    .action(push)
    .on('help', function(cmd) {
      cmd.outputIndented('Examples', [
        kbString.build(
          kbString.success('$ '),
          kbString.kibibitLogo(),
          kbString.success(' push')
        )
      ]);
    }).parent;
}

function addSubCommandInit(program) {
  program
    .command('init')
    .description(
      kbString.info('initialize the gitflow tools for the current repo. ') +
      kbString.warning('(GitHub login, etc.)')
    )
    .option('-f, --force', 'force setting of hubflow branches, even if already configured (default: false)')
    .option('-a, --ask', 'ask for branch naming conventions (default: false)')
    .action(initGitflow.init)
    .on('help', function(cmd) {
      cmd.outputIndented('Examples', [
        kbString.build(
          kbString.success('$ '),
          kbString.kibibitLogo(),
          kbString.success(' init ')
        ),
        kbString.build(
          kbString.success('$ '),
          kbString.kibibitLogo(),
          kbString.success(' init '),
          '-f'
        ),
        kbString.build(
          kbString.success('$ '),
          kbString.kibibitLogo(),
          kbString.success(' init '),
          '--ask'
        )
      ]);
    }).parent;
}

module.exports = commandDefinitions;

function clone(args, options) {
  console.error('clone!');
}

function release(args, options) {
  if (['start', 'finish'].indexOf(args.action) < 0) {
    console.error(ohNo([
      '[ERROR]: ',
      kbString.kibibitLogo(),
      kbString.kbString.success(' release '),
      'expects either start or finish'
    ]));
    process.exit(1);
  }

  kbExec('git hf release ' + args.action);
}

function finish(args, options) {
  kbExec('git hf finish ' + args.featureName);
}

function push(args, options) {
  kbExec('git hf push');
}

function update(args, options) {
  kbExec('git hf update');
}

function hotfix(args, options) {
  if (!args.hotfixName) {
    kbExec('git hf hotfix -v');
    process.exit(0);
  }

  console.log('woof');

  doesBranchExists('hotfix/' + args.hotfixName).then(function(reference) {
    console.log(kbString.build(
      kbString.kbString.success('hotfix already exists. '),
      kbString.msg('checking out branch: ' + args.hotfixName)
    ));
    kbExec('git hf hotfix checkout ' + args.hotfixName);
  }, function(error) {
    if (error.errno === -3) {
      console.log(kbString.success('hotfix not found.'));
      var questions = [{
        type: 'confirm',
        name: 'createHotfix',
        message: kbString.build('Create hotfix ', args.hotfixName, '?'),
        default: true
      }];
      inquirer.prompt(questions).then(answers => {
        if (answers.createHotfix) {
          kbExec('git hf hotfix start ' + args.hotfixName);
          process.exit(0);
        } else {
          console.log(kbString.msg('aborting. carry on...'));
          process.exit(1);
        }
        console.log('\nOrder receipt:');
        console.log(JSON.stringify(answers, null, '  '));
      });
    } else {
      console.error(error);
    }
  });
}

function feature(args, options) {
  if (!args.featureName) {
    kbExec('git hf feature -v')
    process.exit(0);
  }
  doesBranchExists('feature/' + args.featureName).then(function(reference) {
    console.log(kbString.build(
      kbString.kbString.success('feature already exists. '),
      kbString.msg('checking out branch: ' + args.featureName)
    ));
    kbExec('git hf feature checkout ' + args.featureName);
  }, function(error) {
    if (error.errno === -3) {
      console.log(clc.greenBright('feature not found.'));
      var prompt = new Confirm(kbString.build(
        'Create feature ', args.featureName, '?'
      ));
      prompt.run()
        .then(function(answer) {
          if (answer) {
            kbString.msg('creating branch: ' + args.featureName)
            kbExec('git hf feature start ' + args.featureName);
            process.exit(0);
          } else {
            console.log(kbString.msg('aborting. carry on...'));
            process.exit(1);
          }
        });

    }
    // console.error('failed to find branch', error);
    // process.exit(1);
  });
}

function bodyLine(str) {
  return '    ' + str + '\n';
}

function kbExec(command) {
  if (shell.exec(command).code !== 0) {
    shell.echo('Error: ' + kbString.error(command) + ' failed');
    shell.exit(1);
  }
}

function doesBranchExists(branch) {
  var deferred = Q.defer();

  Git.Repository.open(currentFolder).then(function(repo) {
    Git.Branch.lookup(repo, branch, 0)
      .then(ref => deferred.resolve(ref), error => deferred.reject(error));
  });

  return deferred.promise;
}
