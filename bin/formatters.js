module.exports = {
    'gitlink.tag.notsemver': notSemver,
    'invalid.git.version': invalidVersion,
    'default': printError
};

function notSemver(err) {
    return 'WARN: ' + err.message;
}

function invalidVersion(err) {
    return 'ERROR: ' + err.message;
}

function printError(err) {
    return err.message;
}
