var kbString = require('../kb-string');
var Prompt = require('prompt-checkbox');
var statusGitflow = require('./status');
var util = require('./utility');
// var colorize = require('json-colorizer');
var _ = require('lodash');
var stripAnsi = require('strip-ansi');
var NodeGit = require('nodegit-flow');
var gitRoot = require('../kb-git-root');
var inquirer = require('inquirer');
var Table = require('cli-table');
var marked = require('marked');
var sanitizeHtml = require('sanitize-html');
var decode = require('unescape');

var renderer = new marked.Renderer();

renderer.blockquote = function(quote) {
  return kbString.warning('- "', sanitizeHtml(quote, {
    allowedTags: []
  }).trim(), '"\n');
};

renderer.heading = function(text, level, raw) {
  return kbString.info('# ', raw) + '\n';
};

renderer.paragraph = function(text) {
  return kbString.build('' + decode(text) + '\n');
};

// make pictures in a single line since they are longer because of full URL
// + emoji is overlayed on top of row before
renderer.image = function(href, title, text) {
  var out = '\n🖼  ' + kbString.info(text);
  out += kbString.warning(' ( ', href, ' )\n');
  return out;
};

renderer.codespan = function(text) {
  return kbString.msg(' ', decode(text), ' ') + '\n';
};

renderer.code = function(code/* , lang, escaped */) {
  return kbString.msg(' ', decode(code), ' ') + '\n';
};

renderer.strong = function(text) {
  return kbString.white(kbString.important(text));
};

renderer.br = function() {
  return '\n';
};

renderer.list = function(body, ordered) {
  var parsed = body
    .replace(/<\/li>/gi, '')
    .trim()
    .split(/<li>/gi)
    .slice(1);
  return '\n' + _.map(parsed, function(item, index) {
    return kbString.build([
      '  ',
      kbString.warning(ordered ? (index + 1) + '. ' : '- '),
      item.trim(),
      '\n'
    ]);
  }).join('') + '\n';
};

renderer.link = function(href, title, text) {
  if (this.options.sanitize) {
    try {
      var prot = decodeURIComponent(unescape(href))
        .replace(/[^\w:]/g, '')
        .toLowerCase();
    } catch (e) {
      return '';
    }
    if (_.startsWith(prot, 'javascript:') ||
        _.startsWith(prot, 'vbscript:') ||
        _.startsWith(prot, 'data:')) {
      return '';
    }
  }
  var out = kbString.info('[' + text + ']');
  out += kbString.warning('(' + href + ')');
  return out;
};

renderer.table = function(header, body) {
  var header = header
    .replace(/(\<tr.*?\>)|(\<\/tr>)|(\<\/th\>)|\n/gi, '')
    .trim()
    .split(/<th.*?>/gi)
    .slice(1);

  var body = body
    .replace(/<\/tr>|<\/td>|\n/gi, '')
    .split(/<tr.*?>/gi)
    .slice(1)
    .map(function(row) {
      return row.split(/<td.*?>/gi);
    })
    .map(function(row) {
      return row.slice(1);
    });

  var markdownTable = new Table({
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
    },
    head: header
  });

  body.forEach(function(row) {
    markdownTable.push(row);
  });

  return markdownTable.toString() + '\n';
};

// var TerminalRenderer = require('../markdown-renderer');

marked.setOptions({
  renderer: renderer,
  gfm: true,
  tables: true,
  breaks: true,
  sanitize: false
});

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
  gitRoot.getGitRoot()
    .then(function(_gitRoot) {
      if (!_gitRoot) {
        console.info(kbString.error('git repo not found'));
        process.exit(1);
      }

      GLOBAL.gitRoot = _gitRoot;

      return statusGitflow.getStatusAsArray(false /* shouldAddFolderEntries */);
    })
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

      return prompt.run();
    })
    .then(function(answers) {
      filesToCommit = _.map(answers, function(answer) {
        return stripAnsi(answer).replace(/\s\[.*?\]/, '');
      });
      // console.log(colorize(JSON.stringify(filesToCommit, null, 2)));

      if (!filesToCommit.length) {
        console.log('no files were selected. aborting...');
        process.exit(0);
      }

      return NodeGit.Repository.open(GLOBAL.gitRoot);
    })
    .then(function(repo) {
      GLOB.REPO = repo;
      return util.openIndex(GLOB.REPO);
    })
    .then(function(indexResult) {
      GLOB.INDEX = indexResult;
      return GLOB.REPO.getCurrentBranch();
    })
    .then(function(currentBranch) {
      GLOB.BRANCH = currentBranch;
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
      return inquirer.prompt([
        askForCommitTitle(),
        editCommitMessageQuestion()
      ]);
    })
    .then(function(answers) {
      var defaultSignature = NodeGit.Signature.default(GLOB.REPO);

      var markedMessage;
      var completeMessage =
                    answers.commitTitle + '\n\n' + answers.commitMessage;
      try {
        markedMessage = '# ' + answers.commitTitle + '\n\n' +
                    marked(answers.commitMessage, {
                      renderer: renderer
                    });
      } catch (e) {
        console.error('MARKDOWN ERROR!', e);
      }

      commitSummaryTable.push([
        kbString.info('id'),
        kbString.white(GLOB.OID)
      ]);
      commitSummaryTable.push([
        kbString.info('push to branch'),
        kbString.success(_.replace(GLOB.BRANCH, 'refs/heads/', ''))
      ]);
      commitSummaryTable.push([
        kbString.info('author'),
        kbString.build([
          kbString.success(defaultSignature.name()),
          kbString.warning('<', defaultSignature.email(), '>')
        ])
      ]);
      commitSummaryTable.push([
        kbString.info('commit message'),
        markedMessage ||
                    (answers.commitTitle + '\n\n' + answers.commitMessage) ||
                    'error!'
      ]);
      commitSummaryTable.push([
        kbString.info('parent commit'),
        kbString.white(GLOB.PARENT.id())
      ]);

      return GLOB.REPO.createCommit('HEAD',
        defaultSignature,
        defaultSignature,
        completeMessage || 'error!',
        GLOB.OID,
        [ GLOB.PARENT ]);
    })
    .then(function() {
      console.log(kbString.success([
        '\n committed succesfully \n',
        '======================='
      ]));

      console.log(commitSummaryTable.toString());

      process.exit(0);
    })
    .catch(function(err) {
      console.log(err);
      process.exit(1);
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

function askForCommitTitle() {
  return {
    type: 'input',
    name: 'commitTitle',
    message: 'Please enter a title for your commit - ' +
      kbString.param('[', GLOB.BRANCH, ']: '),
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
