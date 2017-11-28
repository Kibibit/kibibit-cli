var pkginfo = require('pkginfo')(module);
var shell = require('shelljs');
var clc = require('cli-color');
var program = require('gitlike-cli');
var Confirm = require('prompt-confirm');
var Git = require("nodegit");
var currentFolder = process.cwd();
var msg = clc.xterm(45).bgXterm(236);
var header = clc.bgXterm(0);
var warning = clc.xterm(184);
var error = clc.xterm(196);
var info = clc.xterm(39);
var success = clc.xterm(42);
var white = clc.xterm(15);
var ohNo = clc.bgXterm(9).xterm(15);
var Q = require('q');

if (!shell.which('git')) {
  shell.echo('Sorry, kibibit requires git');
  shell.exit(1);
}

program
  .version(module.exports.version)
  .description(header(parseString(
      success('~= '), kibibit(),
      ' cli tool for development using hubflow(gitflow) ', success('=~'))) +
    parseString('\n',
      bodyLine('this cli should eventually be used to work on '),
      bodyLine('different kibibit projects. read more about gitflow here:'),
      bodyLine(info('https://datasift.github.io/gitflow/IntroducingGitFlow.html'))));

addSubCommandInit(program);
addSubCommandClone(program);
addSubCommandFeature(program);
addSubCommandHotfix(program);
addSubCommandFinish(program);
addSubCommandRelease(program);
addSubCommandUpdate(program);
addSubCommandPush(program);

program.parse(process.argv);

function addSubCommandClone(program) {
  program
    .command('clone <uri>')
    .description(info('clone a remote repository'))
    .action(clone)
    .option('-v, --verbose', 'only show my features')
    .option('-S, --gpg-sign', 'GPG sign commit')
    .on('help', function(cmd) {
      cmd.outputIndented('Examples', [
        parseString(
          success('$ '),
          kibibit(),
          success(' commit '),
          clc.cyan('search-db')
        ),
        parseString(
          success('$ '),
          kibibit(),
          success(' commit')
        ),
        parseString(
          success('$ '),
          kibibit(),
          success(' commit '),
          '-v'
        )
      ]);
    }).parent;
}

function addSubCommandFeature(program) {
  program
    .command('feature [featureName]')
    .description(
      info('start or continue a feature ') + warning('(will be prompted)' + info('. If no featureName is given, returns all ongoing features'))
    )
    .action(feature)
    .option('-m, --mine', 'only show my features')
    .on('help', function(cmd) {
      cmd.outputIndented('Examples', [
        parseString(
          success('$ '),
          kibibit(),
          success(' feature '),
          clc.cyan('search-db')
        ),
        parseString(
          success('$ '),
          kibibit(),
          success(' feature')
        ),
        parseString(
          success('$ '),
          kibibit(),
          success(' feature '),
          '-m'
        )
      ]);
    }).parent;
}

function addSubCommandHotfix(program) {
  program
    .command('hotfix [hotfixName]')
    .description(
      info('start or continue a hotfix ') + warning('(will be prompted)' + info('. If no hotfixName is given, returns all ongoing hotfixes'))
    )
    .action(hotfix)
    .option('-m, --mine', 'only show my hotfixes')
    .on('help', function(cmd) {
      cmd.outputIndented('Examples', [
        parseString(
          success('$ '),
          kibibit(),
          success(' hotfix '),
          clc.cyan('search-db-edge-case-no-query')
        ),
        parseString(
          success('$ '),
          kibibit(),
          success(' hotfix')
        ),
        parseString(
          success('$ '),
          kibibit(),
          success(' hotfix '),
          '-m'
        )
      ]);
    }).parent;
}

function addSubCommandFinish(program) {
  program
    .command('finish <featureName>')
    .description(
      info('use GitHub to issue a pull request to origin/develop.')
    )
    .action(finish)
    .on('help', function(cmd) {
      cmd.outputIndented('Examples', [
        parseString(
          success('$ '),
          kibibit(),
          success(' finish '),
          clc.cyan('search-db')
        )
      ]);
    }).parent;
}

function addSubCommandRelease(program) {
  program
    .command('release <action>')
    .description(parseString(
      info('When you have enough completed features in origin/develop, '),
      info('create a release branch, test it and fix it, '),
      info('and then merge it into origin/master')
    ))
    .action(release)
    .on('help', function(cmd) {
      cmd.outputIndented('Examples', [
        parseString(
          success('$ '),
          kibibit(),
          success(' release '),
          clc.cyan('start')
        ),
        success('<test + fix cycle>'),
        parseString(
          success('$ '),
          kibibit(),
          success(' release '),
          clc.cyan('finish')
        )
      ]);
    }).parent;
}

function addSubCommandUpdate(program) {
  program
    .command('update')
    .description(
      info('keep up-to-date with completed features on GitHub')
    )
    .action(update)
    .on('help', function(cmd) {
      cmd.outputIndented('Examples', [
        parseString(
          success('$ '),
          kibibit(),
          success(' update')
        )
      ]);
    }).parent;
}

function addSubCommandPush(program) {
  program
    .command('push')
    .description(
      info('push your feature branch back to GitHub as you make progress ' +
        'and want to save your work')
    )
    .action(push)
    .on('help', function(cmd) {
      cmd.outputIndented('Examples', [
        parseString(
          success('$ '),
          kibibit(),
          success(' push')
        )
      ]);
    }).parent;
}

function addSubCommandInit(program) {
  program
    .command('init')
    .description(
      info('initialize the gitflow tools for the current repo. ') +
      warning('(GitHub login, etc.)')
    )
    .option('-f, --force', 'force setting of hubflow branches, even if already configured (default: false)')
    .option('-a, --ask', 'ask for branch naming conventions (default: false)')
    .action(init)
    .on('help', function(cmd) {
      cmd.outputIndented('Examples', [
        parseString(
          success('$ '),
          kibibit(),
          success(' init ')
        ),
        parseString(
          success('$ '),
          kibibit(),
          success(' init '),
          '-f'
        ),
        parseString(
          success('$ '),
          kibibit(),
          success(' init '),
          '--ask'
        )
      ]);
    }).parent;
}

function init(args, options) {
  console.log('args: ', args);
  console.log('options: ', options);
}

function clone(args, options) {
  console.error('clone!');
}

function release(args, options) {
  if (['start', 'finish'].indexOf(args.action) < 0) {
    console.error(ohNo('[ERROR]: ' + kibibit() + success(' release ') + 'expects either start or finish'));
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

  doesBranchExists('hotfix/' + args.hotfixName).then(function(reference) {
    console.log(parseString(
      clc.greenBright('hotfix already exists. '),
      msg('checking out branch: ' + args.hotfixName)
    ));
    kbExec('git hf hotfix checkout ' + args.hotfixName);
  }, function(error) {
    if (error.errno === -3) {
      console.log(clc.greenBright('hotfix not found.'));
      var prompt = new Confirm(parseString(
        'Create hotfix ', args.hotfixName, '?'
      ));
      prompt.run()
        .then(function(answer) {
          if (answer) {
            kbExec('git hf hotfix start ' + args.hotfixName);
            process.exit(0);
          } else {
            console.log(msg('aborting. carry on...'));
            process.exit(1);
          }
        });
    }
  });

  // kbExec('git hf hotfix ' + args.hotfixName);
  // process.exit(0);
}

function feature(args, options) {
  if (!args.featureName) {
    kbExec('git hf feature -v')
    process.exit(0);
  }
  doesBranchExists('feature/' + args.featureName).then(function(reference) {
    console.log(parseString(
      clc.greenBright('feature already exists. '),
      msg('checking out branch: ' + args.featureName)
    ));
    kbExec('git hf feature checkout ' + args.featureName);
  }, function(error) {
    if (error.errno === -3) {
      console.log(clc.greenBright('feature not found.'));
      var prompt = new Confirm(parseString(
        'Create feature ', args.featureName, '?'
      ));
      prompt.run()
        .then(function(answer) {
          if (answer) {
            msg('creating branch: ' + args.featureName)
            kbExec('git hf feature start ' + args.featureName);
            process.exit(0);
          } else {
            console.log(msg('aborting. carry on...'));
            process.exit(1);
          }
        });

    }
    // console.error('failed to find branch', error);
    // process.exit(1);
  });
}

function parseString() {
  var args = Array.prototype.slice.call(arguments, 0);
  return args.join('');
}

function bodyLine(str) {
  return '    ' + str + '\n';
}

function kbExec(command) {
  if (shell.exec(command).code !== 0) {
    shell.echo('Error: ' + error(command) + ' failed');
    shell.exit(1);
  }
}

function kibibit() {
  return parseString(white('k'), error('i'), white('b'), info('i'), white('b'), warning('i'), white('t'));
}

function doesBranchExists(branch) {
  var deferred = Q.defer();

  Git.Repository.open(currentFolder).then(function(repo) {
    Git.Branch.lookup(repo, branch, 0)
      .then(ref => deferred.resolve(ref), error => deferred.reject(error));
  });

  return deferred.promise;
}
