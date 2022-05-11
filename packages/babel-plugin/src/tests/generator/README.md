# Test Generator for the `@realm/babel-plugin` package

```mermaid
flowchart TD

classDef data text-align:left;

subgraph Generate
  nodePropertyTest["
    <code>type: string;
      objectType: string[];
      default: ({ source: string } | undefined | unknown)[];
      optional: boolean[];
    </code>
  "]
  nodePropertySchema["
    <code>type: string;
      objectType?: string;
      default?: { source: string } | unknown;
      optional?: true;
    </code>
  "]
  nodePropertyVariant["
    <code>type?: string;
      typeArgument?: string;
      initializer?: string;
      questionMark: boolean;
    </code>
  "]
  nodePropertyAST["
    Abstract syntax tree of generated class property
  "]
  nodeSourceCode["
    <code>import Realm, { Object, ... } from #quot;realm#quot;;
    class Foo {
    #nbsp;#nbsp;{{ property source code }}
    }
    </code>
  "]

  nodePropertyTest -->|Generate combinations of elements in arrays| nodePropertySchema
  nodePropertySchema -->|Generate variations of expressing the property schema| nodePropertyVariant
  nodePropertyVariant -->|Generate property AST| nodePropertyAST
  nodePropertyAST -->|Babel generate source code| nodeSourceCode

  class nodePropertyTest,nodePropertySchema,nodePropertyVariant,nodeSourceCode data;
end

nodeSourceCode -->|Babel transform| nodeTransformedCode

subgraph Verify
  nodeTransformedCode["
    <code>import Realm, { Object, ... } from #quot;realm#quot;;
    class Foo {
    #nbsp;#nbsp;static schema = { ... };
    }
    </code>
  "]

  nodeSchemaStatic["
    Parsed static schema property
  "]

  nodeTransformedCode -->|Extract & parse| nodeSchemaStatic

  nodeAssert{Assert equals?}
  nodeSchemaStatic --> nodeAssert
  nodePropertySchema --> nodeAssert

  class nodeTransformedCode data;
end

```
