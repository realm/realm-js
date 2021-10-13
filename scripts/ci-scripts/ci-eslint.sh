#!/bin/bash

./node_modules/.bin/eslint -f checkstyle . > eslint.xml || true
