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
