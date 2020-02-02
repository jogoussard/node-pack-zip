'use strict';

const archiver = require('archiver');
const console = require('console');
const fs = require('fs');
const globby = require('globby');
const path = require('path');
const Promise = require('bluebird');

const readFile = Promise.promisify(fs.readFile);

const DEFAULT_IGNORE_PATTERNS = [
];

const DEFAULT_INCLUDE_PATTERNS = [
    '**/*',
    '!node_modules/**'
];

let resolvePathRelativeTo = (() => {
    let pcwd = process.cwd();
    return cwd => path.resolve.bind(path, cwd || pcwd);
})();

let getFiles = ({ cwd }) => ({ include, ignore }) => globby(include, { cwd: cwd || process.cwd(), ignore, nodir: true });

function getPackageInfo(packageFile) {
    return readFile(packageFile, 'utf-8')
        .then(content => JSON.parse(content))
        .catch(error => {
            console.error(`Failed to read ${packageFile}`);
            return JSON.parse("{}");
        });
}

function getDefaultOuputFilename({ cwd }) {
    let at = resolvePathRelativeTo(cwd);
    let packageFile = at('package.json');
    return getPackageInfo(packageFile)
               .then(packageInfo => {
                   const filename = `${packageInfo.name}.zip`;
                   const idx = filename.indexOf('/');
                   return (idx !== -1) ? filename.substring(idx+1) : filename;
                });
}

function flatten(arr) {
  return arr.reduce(function (flat, toFlatten) {
    return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
  }, []);
}

function getTransitiveDependencies({ cwd }, dependencies, module) {
    let at = resolvePathRelativeTo(cwd);
    if (!dependencies.find(d => d === module)) {
        dependencies.push(module);
        return getPackageInfo(at('node_modules/'+module+'/package.json'))
            .then(modulePackage => Object.keys(modulePackage.dependencies || {})
                                    .concat(Object.keys(modulePackage._phantomChildren || {})))
            .then(deps => { 
            	return Promise.map(deps, (dep) => { 
               		return getTransitiveDependencies({ cwd }, dependencies, dep);
               	});
            })
            .then(flatten);
    } else {
      return Promise.resolve([]);
    }
}

function getPackageDependencies({ cwd }) {
    let at = resolvePathRelativeTo(cwd);
	
    return getPackageInfo(at('package.json'))
        .then(rootPackage => Object.keys(rootPackage.dependencies || {})
          .concat(Object.keys(rootPackage._phantomChildren || {}))
          .concat(Object.keys(rootPackage.bundledDependencies || {})))
        .then(rootDependencies => {
			let totalDependencies = [];            
        	return Promise.all(rootDependencies.map(dep => getTransitiveDependencies({ cwd }, totalDependencies, dep)))
        		.then(() => { return totalDependencies;} );
        })
        .then(flatten);
}

function getPackageGlobs({cwd}) {
  let at = resolvePathRelativeTo(cwd);
  return getPackageInfo(at('package.json'))
    .then(rootPackage => {
      let includes = rootPackage.repackZipConfig ? (rootPackage.repackZipConfig.includes || []) : [];
      let excludes = rootPackage.repackZipConfig ? (rootPackage.repackZipConfig.excludes || []) : [];
      return { includes: includes, excludes: excludes};
    });
}

function getGlobPatterns({ cwd }) {
    let at = resolvePathRelativeTo(cwd);

    return getPackageGlobs({cwd}).then( ({includes, excludes}) => {
      let includePatterns = getPackageDependencies({ cwd })
        .then(dependencies => dependencies.map(x => `node_modules/${x}/**`))
        .then(includePatterns => DEFAULT_INCLUDE_PATTERNS.concat(includePatterns).concat(includes));

      let ignorePatterns = readFile(at('.packignore'), 'utf-8') // For backward compatibility
        .then(txt => txt.split('\n').map(line => line.trim()).filter(line => line.length > 0))
        .catch(error => error.code === 'ENOENT' ? Promise.resolve([]) : Promise.reject(error))
        .then(ignorePatterns => DEFAULT_IGNORE_PATTERNS.concat(ignorePatterns).concat(excludes));

      return Promise.all([includePatterns, ignorePatterns])
        .then(([include, ignore]) => ({ include, ignore }));
    });
}

function zipFiles({ cwd, destination }) {
    let at = resolvePathRelativeTo(cwd);

    return files => new Promise((resolve, reject) => {
        let archive = archiver.create('zip');
        archive.on('error', error => reject(error));
        archive.pipe(fs.createWriteStream(destination)).on('end', () => resolve());
        files
            .filter(f => { return f !== destination })
            .forEach(file => archive.file(at(file), { name: file }));
        archive.finalize();
    });
}

function pack({ source, destination }) {
    let files = getGlobPatterns({ cwd: source })
        .then(getFiles({ cwd: source }));

    let outputFilename = destination
        ? Promise.resolve(destination)
        : getDefaultOuputFilename({ cwd: source })

    return Promise.all([outputFilename, files])
        .then(([destination, files]) => zipFiles({ cwd: source, destination })(files));
}

module.exports = {
    getFiles,
    getGlobPatterns,
    pack,
    zipFiles,
}
