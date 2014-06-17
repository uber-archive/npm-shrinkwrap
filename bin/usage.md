# `{cmd} [options]`

Verifies your `package.json` and `node_modules` are in sync.
  Then runs `npm shrinkwrap` and cleans up the
  `npm-shrinkwrap.json` file to be consistent.

Basically like `npm shrinkwrap` but better

Options:
    --dirname   sets the directory location of the package.json

 - `--dirname` defaults to `process.cwd()`

## `{cmd} --help`

Prints this message

## `{cmd} sync`

Syncs your `npm-shrinkwrap.json` file into the `node_modules`
  directory.

This will ensure that your local `node_modules` matches the
  `npm-shrinkwrap.json` file verbatim. Any excess modules in
  your node_modules folder will be removed if they are not in
  the `npm-shrinkwrap.json` file.

Options:
    --dirname   sets the directory of the npm-shrinkwrap.json

 - `--dirname` defaults to `process.cwd()`

## `{cmd} install`

Will write a `shrinkwrap` script to your `package.json` file.

```json
{
    "scripts": {
        "shrinkwrap": "{cmd}"
    }
}
```

Options:
    --dirname   sets the directory location of the package.json

## `{cmd} diff [OldShaOrFile] [NewShaOrfile]`

This will show a human readable for the shrinkwrap file.

You can pass it either a path to a file or a git shaism.

Example:

`{cmd} diff HEAD npm-shrinkwrap.json`
`{cmd} diff origin/master HEAD`

Options:
    --depth     configure the depth at which it prints
    --short     when set it will print add/remove tersely
    --dirname   configure which folder to run within

 - `--depth` defaults to `0`
 - `--short` defaults to `false`
 - `--dirname` defaults to `process.cwd()`
