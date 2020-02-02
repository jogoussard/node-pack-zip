This package creates a .zip file containing your package and its dependencies, including
transitive dependencies.

The code was forked from [node-pack-zip](https://github.com/Merlin-Taylor/node-pack-zip)
which did not support transitive dependencies (see [issue#2](https://github.com/Merlin-Taylor/node-pack-zip/issues/2)).

It was mainly designed to help deploy nodejs packages in AWS lambdas.

The .zip file will contain by default
- All files not in `node_modules`
- All files in `node_modules` that are part of a package listed in the `dependencies`
, `bundledDependencies` fields of your `package.json` and all their transitives 
dependencies or [`_phantomChildren`](https://rushjs.io/pages/advanced/phantom_deps/).

## Installation

`npm install --save-dev repack-zip`

## Example

_my-lambda_ is an npm package I want to run as an AWS Lambda Function.

Install _repack-zip_ locally in _my-lambda_
```
npm install --save-dev repack-zip
```

Install any runtime dependencies of _my-lambda_.
```
npm install
```

Modify _my-lambda/package.json_:
```
"scripts": {
    "build-aws-lambda": "repack-zip"
    ...
}
```

Create the .zip file containing _my-lambda_ and all its dependencies, ready to be uploaded to AWS Lambda
```
npm run build-aws-lambda
```

## Configuration
You can customize included and excluded glob patterns using a `repackZipConfig`
section in your package.json

Ex:
```$xslt
"repackZipConfig": {
  "includes": [ ...list of include glob patterns...],
  "excludes": [ ...list of exclude glob patterns...]
```

## Release notes
0.2.8 - Added support for bundledDependencies.

0.2.7 - Added repackZipConfig support with excludes and includes.

0.2.6 - Do not stop on missing package.json in dependency and support scoped modules.
(contributions from [Enalmada](https://github.com/Enalmada) and [g00dnatur3](https://github.com/g00dnatur3)).

0.2.5 - Added support for root module _phantomChildren dependencies 
(contribution from [jasonfagan](https://github.com/jasonfagan)).

0.2.4 - Initial published release

