#!/bin/bash

npm ci --ignore-scripts
./node_modules/.bin/eslint -f checkstyle . > eslint.xml || true