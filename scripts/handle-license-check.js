#!/usr/bin/env node

process.stdin.resume();
process.stdin.setEncoding('utf8');

var licenseCheckerResult;

process.stdin.on('data', function(data) {
    licenseCheckerResult += data;
});

process.stdin.on('end', function() {
    if (!licenseCheckerResult) {
        console.log("All licenses are accepted");
    } else {
        console.error("Unknown license detected in dependency:");
        console.error(licenseCheckerResult);
    }
});