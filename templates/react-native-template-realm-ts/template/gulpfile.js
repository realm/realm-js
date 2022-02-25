var gulp = require('gulp');
var ts = require("gulp-typescript");
var preserveWhitespace = require('gulp-preserve-typescript-whitespace');
const prettier = require('gulp-prettier');

var tsProject = ts.createProject('tsconfig.json', { removeComments: false });

gulp.task("compile-ts", function () {
    return gulp.src('src/**/*.ts*')
        .pipe(preserveWhitespace.saveWhitespace())    // Encodes whitespaces/newlines so TypeScript compiler won't remove them
        // .pipe(ts({ removeComments: false}))          // TypeScript compiler must be run with "removeComments: false" option
        .pipe(tsProject())
        .on("error", () => { /* Ignore compiler errors */})
        .js
        .pipe(prettier({  }))
        .pipe(preserveWhitespace.restoreWhitespace()) // Restores encoded whitespaces/newlines
        .pipe(gulp.dest("../../react-native-template-realm-js/template"))
});