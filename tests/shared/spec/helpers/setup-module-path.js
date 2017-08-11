'use strict';

const mock_helper = require('./mock_realm')
const path = require('path');

mock_helper(require.resolve("realm"))
