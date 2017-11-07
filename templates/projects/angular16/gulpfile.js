/// <binding Clean='clean' />
"use strict";

var gulp = require("gulp"),
  rimraf = require("rimraf"),
  concat = require("gulp-concat"),
  cssmin = require("gulp-cssmin"),
  uglify = require("gulp-uglify"),
  sass = require("gulp-sass"),
  webpack = require("webpack-stream"),
  CommonsChunkPlugin = require("webpack/lib/optimize/CommonsChunkPlugin"),
  AggressiveMergingPlugin = require("webpack/lib/optimize/AggressiveMergingPlugin"),
  OccurrenceOrderPlugin = require("webpack/lib/optimize/OccurrenceOrderPlugin"),
  DedupePlugin = require("webpack/lib/optimize/DedupePlugin"),
  UglifyJsPlugin = require("webpack/lib/optimize/UglifyJsPlugin"),
  IgnorePlugin = require("webpack/lib/IgnorePlugin"),
  removeUseStrict = require("gulp-remove-use-strict");
var NormalModuleReplacementPlugin = require("webpack/lib/NormalModuleReplacementPlugin");


var paths = {
    webroot: "./Resources/"
};
paths.baseJs = paths.webroot + "js";
paths.js = paths.webroot + "js/src/main/main.js";
paths.distJs = paths.webroot + "js/dist";
//paths.js = paths.webroot + "js/src/main/*.js";
paths.singularJs = paths.webroot + "js/src/singular/*.js";
paths.servicesJs = paths.webroot + "js/src/services/*.js";
paths.ensureJsSrc = paths.webroot + "js/src/singular/ensure-scripts.js";
paths.fedFile = paths.webroot + "js/src/singular/bartel.js"
paths.myRssFeeds = paths.webroot + "js/src/singular/my-rss-feeds.js"

paths.minJs = paths.webroot + "js/**/*.min.js";
paths.css = paths.webroot + "css/*.css";
paths.minCss = paths.webroot + "css/*.min.css";
paths.concatJsDest = paths.webroot + "js/main.min.js";
paths.ensureScriptDest = paths.webroot + "js/ensure-scripts.min.js";
paths.concatCssDest = paths.webroot + "css/main.min.css";
paths.scss = paths.webroot + "css/sass/*.scss";

gulp.task("1-compile", ["sass", "clean", "min" ]);

gulp.task('sass', false, function () {
    gulp.src(paths.scss)
      .pipe(sass())
      .pipe(gulp.dest(paths.webroot + "css"));
});
gulp.task('watch-sass', function () {
    gulp.watch(paths.scss, ['sass']);
})

gulp.task("clean:js", function (cb) {
    rimraf(paths.concatJsDest, cb);
});

gulp.task("clean:css", ['sass'], function (cb) {
    rimraf(paths.concatCssDest, cb);
});
gulp.task("clean", ["clean:js", "clean:css"]);

/*
gulp.task("min:js", function () {
    return gulp.src([paths.js, '!' + paths.minJs, '!' + paths.ensureScriptDest], { base: "." })
        .pipe(webpack({
            output: {
                filename: 'main.min.js'
            },
            module: {
                loaders: [
                    {
                        test: /\.js$/,
                        loader: 'babel-loader',
                        query: {
                            presets: ['es2015']
                        }
                    }
                ]
            }
        }))
        .pipe(uglify())
        .pipe(gulp.dest(paths.baseJs));
      
});
gulp.task("min:singular", function () {
    return gulp.src([paths.singularJs], { base: "." })
        .pipe(webpack({
            entry: {
                'ensureScripts': paths.webroot + "./js/src/singular/ensure-scripts.js",
                'fed': paths.webroot + "./js/src/singular/bartel.js",
                'my-rss-feeds': paths.webroot + "./js/src/singular/my-rss-feeds.js"
            },
            output: {
                filename: '[name].min.js'
            },
            module: {
                loaders: [
                    {
                        test: /\.js$/,
                        loader: 'babel-loader',
                        query: {
                            presets: ['es2015']
                        }
                    }
                ]
            }
            
        })).on('error', (err) => {
            console.log("webpack error");
            console.log(err);
        })
        .pipe(uglify()).on('error', (err) => {
            console.log("ugly");
            console.log(err);
        })
        .pipe(gulp.dest(paths.baseJs));
});
*/
gulp.task("min:js", function () {
    return gulp.src([paths.js], { base: "." })        
        .pipe(webpack({
            //devtool: 'source-map',
            module: {
                loaders: [
                    {
                        test: /\.js$/,
                        loader: 'babel-loader',
                        query: {
                            presets: ['es2015']
                        },
                        exclude: /^node_modules$/
                    },
                    { test: /\.html$/, loader: "html" },
                    { test: /\.json$/, loader: "json-loader" }
                ]
            },
            //target: 'node',
            output: {
                filename: 'main.min.js'
            },
            node: {
                fs: "empty"
            },
            externals: {
                "moment": "moment"
            },
            
            
            plugins: [
                /*
                new NormalModuleReplacementPlugin(/\/iconv-loader$/, 'node-noop'),
                
                new AggressiveMergingPlugin(),
                new OccurrenceOrderPlugin(),
                new DedupePlugin(),                
                new UglifyJsPlugin({
                    mangle: true,
                    compress: {
                        warnings: false, // Suppress uglification warnings
                        pure_getters: true,
                        unsafe: true,
                        unsafe_comps: true,
                        screw_ie8: true,
                        conditionals: true,
                        unused: true,
                        comparisons: true,
                        sequences: true,
                        dead_code: true,
                        evaluate: true,
                        if_return: true,
                        join_vars: true,
                        keep_fnames: true
                    },
                    output: {
                        comments: false,
                    },
                    //exclude: [/\.min\.js$/gi] // skip pre-minified libs
                }),               
                new IgnorePlugin(/^\.\/locale$/, [/moment$/])
                */
            ],
            
            babelrc: false,
            exclude: /(node_modules|bower_components)/

        })).on('error', function(err) {
            console.log("webpack error");
            console.log(err);
        })
        .pipe(gulp.dest(paths.distJs));
});

/*
gulp.task("min:js", function () {
    return rollup({
        entry: 'main.min.js',
        plugins: [
          babel({
              presets: [
                [
                  "es2015", {
                      "modules": false
                  }
                ]
              ],
              babelrc: false,
              exclude: 'node_modules|bower_components'
          })
        ]
    })
  .then(bundle => {
      return bundle.generate({
          format: 'umd',
          moduleName: 'myModuleName'      
      })})
  .then(gen => {
      return file('app.js', gen.code, {src: true})
        .pipe(gulp.dest('dist/'))
  });
});
*/
gulp.task("min:css", ['clean:css'], function () {
    return gulp.src([paths.css, "!" + paths.minCss])
      .pipe(concat(paths.concatCssDest))
      .pipe(cssmin())
      .pipe(gulp.dest("."));
});

//gulp.task("min", ["min:js", "min:singular", "min:services", "min:css"]);
gulp.task("min", ["min:js", "min:css"]);
