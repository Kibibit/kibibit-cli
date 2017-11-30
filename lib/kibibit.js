var pkginfo = require('pkginfo')(module);
var shell = require('shelljs');
var program = require('gitlike-cli');
var Confirm = require('prompt-confirm');
var currentFolder = process.cwd();
var kbString = require('./kb-string');
var commandDefinitions = require('./commandDefinitions');

if (!shell.which('git')) {
  shell.echo('Sorry, kibibit requires git');
  shell.exit(1);
}

program
  .version(module.exports.version)
  .description(kbString.build(
    kbString.header([
      kbString.success('~= '),
      kbString.kibibitLogo(),
      ' cli tool for development using hubflow(gitflow) ',
      kbString.success('=~')
    ]),
    kbString.build([
      '\n',
      bodyLine('this cli should eventually be used to work on '),
      bodyLine('different kibibit projects. read more about gitflow here:'),
      bodyLine(kbString.info('https://datasift.github.io/gitflow/IntroducingGitFlow.html'))
    ])
  ));

commandDefinitions.attach(program);

program.parse(process.argv);

function bodyLine(str) {
  return '    ' + str + '\n';
}
