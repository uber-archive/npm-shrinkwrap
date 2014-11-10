var TypedError = require('error/typed');

var EmptyFile = TypedError({
    message: 'npm-shrinkwrap must not be empty',
    type: 'npm-shrinkwrap.missing'
});

var InvalidNPMVersion = TypedError({
    type: 'npm-shrinkwrap.invalid_version',
    message: 'Using an older version of npm-shrinkwrap.\n' +
        'Expected version {existing} but found {current}.\n' +
        'To fix: please run `npm install npm-shrinkwrap@{existing}`\n'
});

var NPMError = TypedError({
    type: 'npm-shrinkwrap.npm-error',
    message: 'Problems were encountered\n' +
        'Please correct and try again.\n' +
        '{problemsText}',
    pkginfo: null,
    problemsText: null
});

var InvalidVersionsNPMError = TypedError({
    type: 'npm-shrinkwrap.npm-error.invalid-version',
    message: 'Problems were encountered\n' +
        'Please correct and try again\n' +
        'invalid: {name}@{actual} {dirname}/node_modules/{name}',
    errors: null,
    name: null,
    actual: null,
    dirname: null
});

var NoTagError = TypedError({
    type: 'missing.gitlink.tag',
    message: 'Expected the git dependency {name} to have a ' +
        'tag;\n instead I found {gitLink}'
});

var NonSemverTag = TypedError({
    type: 'gitlink.tag.notsemver',
    message: 'Expected the git dependency {name} to have a ' +
        'valid version tag;\n instead I found {tag} for the ' +
        'dependency {gitLink}'
});

var InvalidPackage = TypedError({
    type: 'invalid.packagejson',
    message: 'The package.json for module {name} in your ' +
        'node_modules tree is malformed.\n Expected JSON with ' +
        'a version field and instead got {json}'
});

var InvalidVersion = TypedError({
    type: 'invalid.git.version',
    message: 'The version of {name} installed is invalid.\n ' +
        'Expected {expected} to be installed but instead ' +
        '{actual} is installed.'
});

var MissingPackage = TypedError({
    type: 'missing.package',
    message: 'The version of {name} installed is missing.\n' +
        'Expected {expected} to be installed but instead ' +
            'found nothing installed.\n'
});

module.exports = {
    EmptyFile: EmptyFile,
    InvalidNPMVersion: InvalidNPMVersion,
    NPMError: NPMError,
    InvalidVersionsNPMError: InvalidVersionsNPMError,
    NoTagError: NoTagError,
    NonSemverTag: NonSemverTag,
    InvalidPackage: InvalidPackage,
    InvalidVersion: InvalidVersion,
    MissingPackage: MissingPackage
};
