#!/bin/bash
set -e

rm -f npm-shrinkwrap.json;

rm -rf ./node_modules && \
    npm cache clear && \
    npm --registry=http://{{private registry}} install && \
    npm shrinkwrap --depth 100 --dev

node scripts/clean-shrinkwrap.js
