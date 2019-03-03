<p align="center">
  <a href="https://github.com/Kibibit/kibibit-cli" target="blank"><img src="http://kibibit.io/kibibit-assets/bit-logo.png" width="250" ></a>
  <h2 align="center">
    kibibit-cli (aka bit)
  </h2>
</p>
<p align="center">
  <!--<a href="https://github.com/semantic-release/semantic-release"><img src="https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg"></a>
  <a href="https://greenkeeper.io/"><img src="https://img.shields.io/badge/greenkeeper-enabled-brightgreen.svg"></a>
  <a href="https://travis-ci.org/Kibibit/kibibit-cli"><img src="https://travis-ci.org/Kibibit/kibibit-cli.svg?branch=master"></a>
  <a href="https://coveralls.io/github/Kibibit/kibibit-cli?branch=master"><img src="https://coveralls.io/repos/github/Kibibit/kibibit-cli/badge.svg?branch=master"></a> -->
  <a href="https://salt.bountysource.com/teams/kibibit"><img src="https://img.shields.io/endpoint.svg?url=https://monthly-salt.now.sh/kibibit&style=flat-square"></a>
</p>
<p align="center">
  A git-flow + GitHub replacement for <code>git</code> and <code>git flow</code>
</p>
<hr>

### installation
run `npm install -g https://github.com/Kibibit/kibibit-cli.git`
`kibibit status`

This is intended to replace your `git` with `bit` (right now it's `kibibit`).

`bit` uses the git-flow methodology to optimize team work on GitHub.

- `git status` -> `bit status`
- `git checkout master` -> `bit master`
- `git checkout develop` -> `bit develop`

```
Usage: kibibit-cli.js [options] <command> [null]

Commands:

  commit   clone a remote repository
  status   show current branch status
  init     initialize the gitflow tools for the current repo. (GitHub login, etc.)
  clone    clone a remote repository
  feature  start or continue a feature (will be prompted). If no featureName is given, returns all ongoing features
  hotfix   start or continue a hotfix (will be prompted). If no hotfixName is given, returns all ongoing hotfixes
  finish   use GitHub to issue a pull request to origin/develop.
  release  When you have enough completed features in origin/develop, create a release branch, test it and fix it, and then merge it into origin/master
  update   keep up-to-date with completed features on GitHub
  push     push your feature branch back to GitHub as you make progress and want to save your work
  master   checkout master branch
  develop  checkout develop branch

Options:

  -h, --help     output help information
  -v, --version  output version information
```
