# kibibit-cli (aka bit)
#### a git-flow + GitHub replacement for `git` and `git flow`

##### installation
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
