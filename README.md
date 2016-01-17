# karma-junit-sonarqube-reporter

> Reporter for the JUnit XML format which is also Sonarqube (a.k.a. Sonar) friendly. This plugin is a modification of the existing `karma-junit-reporter` plugin.     

## Installation

The easiest way is to keep `karma-junit-sonarqube-reporter` as a devDependency in your `package.json`.
```json
{
  "devDependencies": {
    "karma": "~0.10",
    "karma-junit-sonarqube-reporter2": "~0.0.1"
  }
}
```

You can simple do it by:
```bash
npm install karma-junit-sonarqube-reporter2 --save-dev
```

## Configuration
```js
// karma.conf.js
module.exports = function(config) {
  config.set({
    reporters: ['progress', 'junit'],

    // the default configuration
    junitReporter: {
      outputFile: 'test-results.xml',
      suite: ''
    }
  });
};
```

You can pass list of reporters as a CLI argument too:
```bash
karma start --reporters junit,dots
```

----

For more information on Karma see the [homepage].


[homepage]: http://karma-runner.github.com
