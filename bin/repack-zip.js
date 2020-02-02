#!/usr/bin/env node

'use strict';

const console = require('console');
const { pack } = require('../index');

var args = process.argv.slice(2);

if (args.length <= 2) {
    let source = args.length >= 1 ? { source: args[0] } : {};
    let destination = args.length >= 2 ? { destination: args[1] } : {};
    pack(Object.assign(source, destination))
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
} else {
    console.log('USAGE: repack-zip [source] [destination]');
    process.exit(1);
}