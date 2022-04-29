#!/usr/bin/env node
////////////////////////////////////////////////////////////////////////////
//
// Copyright 2022 Realm Inc.
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

import Realm from "realm";
import { parse } from "ts-command-line-args";
import * as fs from "fs";

interface Relationship {
  from: string;
  to: string;
}

interface IExtractSchemaArgs {
  inputFileName?: string;
  outputFileName?: string;
  format?: string;
  help?: boolean;
}

type FormatterFunction = (r: Realm) => void;
type Formatters = {
  [key: string]: FormatterFunction;
};

const mermaid: FormatterFunction = (realm: Realm) => {
  writer("classDiagram");

  const relationships: Array<Relationship> = [];
  realm.schema.forEach((objectSchema) => {
    const name = objectSchema.name;
    writer(`class ${name} {`);
    Object.keys(objectSchema.properties).forEach((propertyName) => {
      const prop = objectSchema.properties[propertyName] as Realm.ObjectSchemaProperty;
      if (["object", "list", "dictionary", "set"].includes(prop.type)) {
        relationships.push({ from: name, to: prop.objectType ?? "__unknown__" });
        writer(`  +${prop.objectType} ${propertyName}`);
      } else {
        writer(`  +${prop.type} ${propertyName}`);
      }
    });
    writer("}");
  });
  relationships.forEach((relationship) => {
    writer(`${relationship.to} <|-- ${relationship.from}`);
  });
};

const json: FormatterFunction = (realm: Realm) => {
  writer(JSON.stringify(realm.schema));
};

const formatters: Formatters = {
  mermaid,
  json,
};

const args = parse<IExtractSchemaArgs>(
  {
    inputFileName: {
      alias: "i",
      type: String,
      multiple: false,
      optional: true,
      defaultValue: "default.realm",
      description: "Input file name",
    },
    outputFileName: {
      alias: "o",
      type: String,
      multiple: false,
      optional: true,
      defaultValue: "-",
      description: "Output file name",
    },
    format: {
      alias: "f",
      type: String,
      multiple: false,
      optional: true,
      defaultValue: "mermaid",
      description: `Output format (${Object.keys(formatters).join(", ")})`,
    },
    help: { alias: "h", type: Boolean, optional: true, description: "Prints this usage guide" },
  },
  {
    helpArg: "help",
    headerContentSections: [
      { header: "Extract the schema from a Realm file", content: "The schema is persisted in the Realm file." },
    ],
  },
);

let fd = 0;
if (args.outputFileName && args.outputFileName !== "-") {
  fd = fs.openSync(args.outputFileName, "w");
}

const writer = (line: string) => {
  if (fd) {
    fs.writeSync(fd, line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }
};

if (args.format) {
  if (formatters[args.format]) {
    const realm = new Realm({ path: args.inputFileName });
    formatters[args.format](realm);
    realm.close();
  } else {
    console.error(`Formatter '${args.format} is not supported.`);
  }
} else {
  console.error(`You must specify a formatter: ${Object.keys(formatters).join(", ")}`);
}
