require('reflect-extension');
const { SpecReporter } = require('jasmine-spec-reporter');
const { register } = require('ts-node/dist');

jasmine.getEnv().clearReporters();
jasmine.getEnv().addReporter(new SpecReporter());
register(require('./tsconfig.spec.json'));
