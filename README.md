# npm-shrinkwrap

A consistent shrinkwrap tool

## Usage

`$ npm-shinkwrap`

This will run shrinkwrap and then purge your shrinkwrap file
  of any `from` fields that are not needed.

`$ npm-shrinkwrap --fresh`

This deletes the shrinkwrap & node_modules folders, then runs
  `npm install` and then runs `npm-shrinkwrap`

`$ npm-shrinkwrap --warn`

Checks your git staging area and complains if `package.json`
  is edited but `npm-shrinkwrap.json` is not edited.

This is great to run in a pre-commit hook

## Motivation

There are a few tricks to ensuring there is no unneeded churn
  in the output of `npm shrinkwrap`.

This first is to ensure you install with `npm cache clear` so
  that an `npm ls` output is going to consistently give you the
  `resolved` and `from` fields.

The second is to just delete all `from` fields from the 
  generated shrinkwrap file since they change a lot but are 
  never used. However you can only delete some `from` fields, 
  not all.

## Example

```js
var npmShrinkwrap = require("npm-shrinkwrap");

npmShrinkwrap({
    fresh: true
}, function (err, shrinkwrap) {
    // all done
})
```

## Installation

`npm install npm-shrinkwrap`

## Tests

`npm test`

## Contributors

 - Raynos
