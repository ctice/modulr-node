var fs = require('fs'),
    path = require('path'),
    jsonFs = require('./lib/json-fs'),
    builder = require('./lib/builder'),
    moduleGrapher = require('module-grapher');

exports.build = build;
function build(main, config, callback) {
  if (!callback) {
    callback = config;
    config = {};
  }
  moduleGrapher.graph(main, config, function(err, result) {
    if (err) {
      callback(err)
    } else {
      builder.create(config).build(result, function(err, result) {
        if (config.verbose) {
          log(result);
        }
        callback(err, result);
      });
    }
  });
}

exports.buildFromPackage = function(p, configCallback, callback) {
  if (!callback) {
    callback = configCallback;
    configCallback = function() {};
  }
  fs.stat(p, function(err, stat) {
    if (err) {
      callback(err);
    } else {
      var packageFile, root;
      if (stat.isDirectory()) {
        root = p;
        packageFile = path.join(p, 'package.json');
      } else {
        root = path.dirname(p);
        packageFile = p;
      }
      jsonFs.readFile(packageFile, function(err, json) {
        if (err) {
          callback(err);
        } else {
          var config = json.modulr || {};
          config.paths = config.paths || [];
          config.paths.push('.');
          config.isPackageAware = true;
          config.root = root;
          configCallback(config);
          build(json.main, config, callback);
        }
      });
    }
  });
}

function log(result) {
  console.log('Successfully resolved dependencies for module "'+ result.main + '".');

  var d = result.resolvedAt - result.instantiatedAt;
  console.log('This took ' + d + ' ms.');

  var modCountText = 'Found ' + result.getModuleCount() + ' module(s)';
  if (result.getPackageCount) {
    console.log(modCountText + ' and '+ result.getPackageCount() + ' package(s).');
  } else {
    console.log(modCountText + '.');
  }

  if (result.lazyEval) {
    var modules = Object.keys(result.lazyEval).sort().join(', ');
    console.log('The following modules will be lazy-evaled: ' + modules + '.');
  }

  var size = Math.round((result.getSize() / 1024) * 10) / 10;
  console.log('The total size is ' + size + ' kb unminified.');

  console.log('There are', result.getLoc(), 'LOC and', result.getSloc(), 'SLOC.');
}