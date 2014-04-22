# npm-shrinkwrap

A consistent shrinkwrap tool

## Usage

`$ npm-shinkwrap`

This runs shrinkwrap, which verifies your package.json & 
  node_modules tree are in sync. If they are it runs shrinkwrap
  then fixes the resolved fields and trims from fields

## Motivation

### Verify local correct ness

We need to verify that `package.json`, `npm-shrinkwrap.json` and
  `node_modules` all have the same content.

Currently npm verifies most things but doesn't verify git 
  completely. 

The edge case npm doesn't handle is if you change the tag in 
  your package.json. npm happily says that the dependency in
  your node_modules tree is valid irregardless of what tag it
  is.

### Consistently set a `resolved` field.

NPM shrinkwrap serializes your node_modules folder. Depending
  on whether you installed a module from cache or not it will
  either have or not have a resolved field.

`npm-shrinkwrap` will put a `resolved` field in for everything
  in your shrinkwrap.

### Reduce diff churn

There are a few tricks to ensuring there is no unneeded churn
  in the output of `npm shrinkwrap`.

This first is to ensure you install with `npm cache clear` so
  that an `npm ls` output is going to consistently give you the
  `resolved` and `from` fields.

The second is to just delete all `from` fields from the 
  generated shrinkwrap file since they change a lot but are 
  never used. However you can only delete some `from` fields, 
  not all.

### Human readable `diff`

When you run shrinkwrap and check it into git you have an
  unreadable git diff.

`npm-shrinkwrap` comes with an `npm-shrinkwrap diff` command.

```sh
npm-shrinkwrap diff master HEAD
npm-shrinkwrap diff HEAD npm-shrinkwrap.json --short
```

You can use this command to print out a readable context 
  specific diff of your shrinkwrap changes.

### Custom shrinkwrap validators

`npm-shrinkwrap` can be programmatically configured with an
  array of `validators`.

These `validators` run over every node in the shrinkwrap file
  and can do assertions.

Useful assertions are things like assertion all dependencies
  point at your private registry instead of the public one.

## Example

```js
var npmShrinkwrap = require("npm-shrinkwrap");

npmShrinkwrap({
    dirname: process.cwd()
}, function (err, optionalWarnings) {
    if (err) {
        throw err;
    }

    optionalWarnings.forEach(function (err) {
        console.warn(err.message)
    })

    console.log("wrote npm-shrinkwrap.json")
})
```

## Installation

`npm install npm-shrinkwrap`

## Tests

`npm test`

## Contributors

 - Raynos
