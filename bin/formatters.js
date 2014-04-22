module.exports = {
    'gitlink.tag.notsemver': notSemver,
    'invalid.git.version': invalidVersion,
    'default': printError
};

function notSemver(err) {
    return 'WARN: ' + err.message.replace(';', ';\n');
}

function invalidVersion(err) {
    return 'ERROR: ' + err.message.replace('.', '.\n');
}

function printError(err) {
    return err.message;
}
