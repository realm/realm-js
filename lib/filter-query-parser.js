////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
////////////////////////////////////////////////////////////////////////////

const { parse } = require("acorn");
const util = require("util");

const FN_MAP = {
  startsWith: "BEGINSWITH",
  endsWidth: "ENDSWITH",
  contains: "CONTAINS",
  like: "LIKE",
};

const getValue = (v) => {
  return typeof v === "string" ? `"${v}"` : v;
};

const getPropertyName = (node) => {
  // TODO this only handles one level of parent, should be recursive/loop
  if (node.object.property) return `${node.object.property.name}.${node.property.name}`;
  if (node.object.callee && node.object.callee.object.property)
    return `${node.object.callee.object.property.name}.${node.property.name}`;

  return `${node.property.name}`;
};

const recurse = (node, parent, args) => {
  console.log(util.inspect(node, { depth: null, colors: true }), node.left, node.right);

  if (!node.left && !node.right) {
    if (node.type === "Literal") {
      return getValue(node.value);
    } else if (node.type === "MemberExpression") {
      // TODO member expression on right should be handled differently
      let str = "";

      if (node.object.callee && node.object.callee.property.name === "any") {
        str += "ANY ";
      }

      // Handle case of a single "truthy" property without `=== true` on the other side
      str += parent.type === "BinaryExpression" ? getPropertyName(node) : `${getPropertyName(node)} == true`;

      return str;
    } else if (node.type === "UnaryExpression") {
      // TODO should test operator, this just assumes it is `!`
      return `${getPropertyName(node.argument)} == false`;
    } else if (node.type === "CallExpression") {
      if (node.callee.property.name === "count") {
        return `${getPropertyName(node.callee.object)}.@count`;
      }

      return `(${getPropertyName(node.callee.object)} ${FN_MAP[node.callee.property.name]}${
        node.arguments[1] && node.arguments[1].value === true ? "[c]" : ""
      } ${getValue(node.arguments[0].value)})`;
    } else if (node.type === "Identifier") {
      return args[node.name];
    }
  }

  let operator = node.operator;
  if (operator === "===") {
    operator = "==";
  }

  return `(${recurse(node.left, node, args)} ${operator} ${recurse(node.right, node, args)})`;
};

const getArgs = (argsJs, argsFn) => {
  const ast = parse(argsJs);
  const names = ast.body[0].expression.body.elements;
  const values = argsFn();

  return names.reduce((acc, curr, index) => {
    acc[curr.name] = values[index];
    return acc;
  }, {});
};

module.exports = {
  parseFilter: (js, depsJs, depsFn) => {
    const args = depsFn ? getArgs(depsJs, depsFn) : {};
    const ast = parse(js, { ecmaVersion: 2020 });
    return recurse(ast.body[0].expression.body, undefined, args);
  },
};
