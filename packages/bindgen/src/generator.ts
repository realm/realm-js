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

import { Spec } from "./spec";
import { Template } from "./templates";
import { TemplateContext } from "./context";
import { createOutputDirectory } from "./files";

type GenerateOptions = {
  spec: Spec;
  template: Template;
  outputPath: string;
};

export function generate({ spec, template, outputPath }: GenerateOptions): void {
  const ourputDirectory = createOutputDirectory(outputPath);
  const context: TemplateContext = {
    spec,
    file(filePath: string) {
      return ourputDirectory.file(filePath);
    },
  };
  // Apply the template
  try {
    template(context);
  } finally {
    ourputDirectory.close();
  }
}
