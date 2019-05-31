// Replace with mocha, chai, ...
function assert(condition, message = 'Expected something else') {
    if (!condition) {
        throw new Error(message.red);
    }
}

function toHexString(dec) {
    return '0x' + dec.toString(16);
}

function sleep(seconds = 1) {
    return new Promise(resolve => {
        setTimeout(resolve, seconds * 1000);
    });
}


module.exports = {
    assert,
    toHexString,
    sleep,
}