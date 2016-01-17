var os = require('os');
var path = require('path');
var fs = require('fs');
var builder = require('xmlbuilder');

var jsFileSuffix = ".js";
var specNaming =  "The spec name should map to the file structure: describe(\"test.com.company.BarTest\") → test/com/company/BarTest.js"

var JUnitReporter = function(baseReporterDecorator, config, logger, helper, formatError) {
  var log = logger.create('reporter.junit');
  var reporterConfig = config.junitReporter || {};
  var pkgName = reporterConfig.suite || '';
  var outputFile = helper.normalizeWinPath(path.resolve(config.basePath, reporterConfig.outputFile
      || 'test-results.xml'));

  var xml;
  var suites;
  var pendingFileWritings = 0;
  var fileWritingFinished = function() {};
  var allMessages = [];
  var specNamingWrong = false;

  baseReporterDecorator(this);

  this.adapters = [function(msg) {
    allMessages.push(msg);
  }];

  var initializeXmlForBrowser = function(browser) {
    var timestamp = (new Date()).toISOString().substr(0, 19);
    var suite = suites[browser.id] = xml.ele('testsuite', {
      name: browser.name, 
      'package': pkgName, 
      timestamp: timestamp, 
      id: 0, 
      hostname: os.hostname()
    });

    suite.ele('properties').ele('property', { 
      name: 'browser.fullName',
      value: browser.fullName
    });
  };

  this.onRunStart = function(browsers) {
    suites = Object.create(null);
    xml = builder.create('testsuites');

    // TODO(vojta): remove once we don't care about Karma 0.10
    browsers.forEach(initializeXmlForBrowser);
  };

  this.onBrowserStart = function(browser) {
    initializeXmlForBrowser(browser);
  };

  this.onBrowserComplete = function(browser) {
    var suite = suites[browser.id];

    if (!suite) {
      // This browser did not signal `onBrowserStart`. That happens
      // if the browser timed out during the start phase.
      return;
    }

    var result = browser.lastResult;

    suite.att('tests', result.total);
    suite.att('errors', result.disconnected || result.error ? 1 : 0);
    suite.att('failures', result.failed);
    suite.att('time', (result.netTime || 0) / 1000);

    suite.ele('system-out').dat(allMessages.join() + '\n');
    suite.ele('system-err');

    if (specNamingWrong) {
      log.warn(specNaming);
    }
  };

  this.onRunComplete = function() {
    var xmlToOutput = xml;

    pendingFileWritings++;
    helper.mkdirIfNotExists(path.dirname(outputFile), function() {
      fs.writeFile(outputFile, xmlToOutput.end({pretty: true}), function(err) {
        if (err) {
          log.warn('Cannot write JUnit xml\n\t' + err.message);
        } else {
          log.debug('JUnit results written to "%s".', outputFile);
        }

        if (!--pendingFileWritings) {
          fileWritingFinished();
        }
      });
    });

    suites = xml = null;
    allMessages.length = 0;
  };

  function checkSuiteName(suite) {
    var suiteFilename = suite.replace(/\./g, '/');
    suiteFilename += jsFileSuffix;
    var normalizedFilename = helper.normalizeWinPath(path.resolve(config.basePath, reporterConfig.specsRoot, suiteFilename));
    var result = fs.exists(normalizedFilename, function (exists) {
      if (!exists) {
        var message = "Sonarqube may fail to parse this report since the test file was not found at " + normalizedFilename;
        allMessages.push(message);
        log.warn(message);
        specNamingWrong = true;
      }
      return exists;
    });
    return result;
  }

  // classname format: <browser>.<package>.<suite>
  // ex.: Firefox_210_Mac_OS.com.company.BarTest
  // the classname should map to the file structure: com.company.BarTest → com/company/BarTest.js
  this.specSuccess = this.specSkipped = this.specFailure = function(browser, result) {
    var classname = browser.name.replace(/\s/g, '_').replace(/\./g, '');
    classname += pkgName ? pkgName + ' ' : '';
    classname += '.' + result.suite[0];
    checkSuiteName(result.suite[0]);

    var spec = suites[browser.id].ele('testcase', {
      name: result.description,
      time: ((result.time || 0) / 1000),
      classname: classname
    });

    if (result.skipped) {
      spec.ele('skipped');
    }

    if (!result.success) {
      result.log.forEach(function(err) {
        spec.ele('failure', {type: ''}, formatError(err));
      });
    }
  };

  // wait for writing all the xml files, before exiting
  this.onExit = function(done) {
    if (pendingFileWritings) {
      fileWritingFinished = done;
    } else {
      done();
    }
  };
};

JUnitReporter.$inject = ['baseReporterDecorator', 'config', 'logger', 'helper', 'formatError'];

// PUBLISH DI MODULE
module.exports = {
  'reporter:junit': ['type', JUnitReporter]
};
