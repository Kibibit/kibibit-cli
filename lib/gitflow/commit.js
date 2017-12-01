var initGitflow = {};

initGitflow.commit = commit;

initGitflow.questions = [];

module.exports = initGitflow;

function commit(args, options) {
  consol.log(args, options);
}
