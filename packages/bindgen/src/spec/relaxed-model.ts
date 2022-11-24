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

// IMPORTANT: This file must not have any imports!
// If you really need to import something, you will need to update the cmake dependencies.
// But try not to add any imports. Since this file is used to generate the json-schema,
// it really should be self-contained.

/**
 * A mini-language for defining and wrapping types in this spec file.
 * NOTE: all type names must use the names from this spec NOT the C++ names (they are often but not always the same)!
 *
 * This is a brief description of the syntax, see parseTypeImpl() in type-parser.ts for full details.
 *
 * TYPE: TYPE_NAME | TEMPLATE | MODIFIED | FUNCTION
 *
 * TYPE_NAME: ID ( '::' ID )*
 *   ID: ( '_' | letter ) ( '_' | letter | number )*
 *
 * TEMPLATE: TYPE_NAME '<' TYPE ( ',' TYPE )* '>'
 *   Final comma is optional (recommend omitting).
 *
 * MODIFIED:
 *   TYPE 'const'
 *   'const' TYPE # const binds to the left, unless there is nothing to the left of it.
 *   TYPE '*'
 *   TYPE '&'     # no more modifiers may appear after &
 *   TYPE '&&'    # no more modifiers may appear after &&
 *
 * FUNCTION: '(' ( arg_name ':' TYPE ',' )* ')' FLAGS '->' TYPE
 *   FLAGS: zero or more of const, noexcept, or off_thread
 *   If RetType is void, the `-> RetType` part can be omitted.
 *   Final comma is optional (recommend omitting).
 *   WARNING: in yaml, strings containing a : followed by a space MUST be quoted!
 */
type SpecType = string; // TODO find some way to have this show up in hover docs.

export type RelaxedSpec = {
  /** Data used for converting the `Mixed` primitive type to and from C++ */
  mixedInfo: MixedInfo; // Not optional
  /** Headers that need to be included to use the types described in this spec. */
  headers?: string[];
  /**
   * Primitive types are concrete types that the binding generators must have specific knowledge of.
   * They are always eagerly converted between C++ and the native language, rather than establishing a binding.
   */
  primitives?: string[];
  /**
   * Templates are like primitives, but are parameterized.
   * The RHS is either the number of arguments that the template takes or `*` to indicate variadic templates.
   * For now, only type parameters are supported.
   */
  templates?: { [name: string]: number | "*" };
  /**
   * Opaque types are types that are only passed around by reference and that SDK code never needs to inspect or own.
   * This give reference semantics while everything else uses value semantics.
   * Therefore SDKs need to be careful when working with the lifetime of opaque references.
   *
   * TODO: consider getting rid of this, since I don't think it is currently used for anything useful.
   */
  opaqueTypes?: string[];
  /**
   * Enums are... enums. They are always eagerly converted.
   */
  enums?: { [name: string]: RelaxedEnumSpec };
  /**
   * Records are C++ structs[1] that are eagerly converted to language objects without establishing a long-term binding.
   *
   * Records can only expose public fields (although getters can be exposed via a `cppName` override hack).
   * Because no bindings are established, there is no way to call methods on a record, and they cannot be
   * passed to functions taking a pointer or mutable reference (rvalue references (Type&&) are ok).
   * For now, all records must have a public default constructor.
   *
   * If in doubt between exposing a class or record, rule of thumb: methods -> use a class, public fields -> record.
   *
   * [1] Note that in C++ there is no real difference between structs and classes, but this is using the
   * conventional meaning of types with public data members.
   */
  records?: { [name: string]: RelaxedRecordSpec };
  /**
   * Classes establish a long-term binding between some C++ class[1] and an in-language object.
   *
   * Classes can expose C++ methods, and can be passed to functions taking mutable references or pointers.
   * See optional settings for more information on what you can do with classes.
   *
   * Classes may NOT expose data members! In addition to lacking a syntax to do this, it is unclear how they should behave.
   *
   * If in doubt between exposing a class or record, rule of thumb: methods -> use a class, public fields -> record.
   *
   * [1] Note that in C++ there is no real difference between structs and classes, but this is using the
   */
  classes?: { [name: string]: RelaxedClassSpec };
  /** TODO: These are unused, use them or remove them */
  constants?: { [name: string]: RelaxedConstantSpec };
  /**
   * Type aliases allow simplifying the spec by assigning a short name to a potenially complex type.
   * They can also be used to make it easier to change the type of many things at once.
   * They only exist in the spec file and do not need to exist in the C++ code.
   * NOTE: Currently the are resolved and erased during spec parsing so they never show up in the generated APIs.
   */
  typeAliases?: { [name: string]: SpecType };
  /** Special handling for perf-sensitve "FooKey" types. RHS is underlying type. */
  keyTypes?: { [name: string]: string };
  /**
   * For now, interfaces are basically identical to classes, but implicitly sharedPtrWrapped.
   * The intent was that this would be for C++ types with virtual methods intended to be implemented by the SDK.
   * But this use case has been handled by functions on Helpers instead for now.
   * TODO: Consider removing this distiction.
   * If we instead decide to actually implement it, need some way to mark pure virtual, plain virtual,
   * and non-virtual methods. Also may need to handle private virtual methods.
   */
  interfaces?: { [name: string]: RelaxedInterfaceSpec };
};

export type MixedInfo = {
  /** Map from a DataType enumerator to info on how to use it */
  dataTypes: {
    [dataType: string]: {
      /**
       * The spec type corresponding to this DataType.
       * Must be the return type of the getter and something that can be passed to Mixed constructor.
       */
      type: SpecType;
      /** The getter method to call to extract data for this DataType. */
      getter: string;
    };
  };
  /** DataType values that are not used by the binding generator (because they never show up in a Mixed). */
  unusedDataTypes: string[];
  /** Constructors that don't have a matching getter. */
  extraCtors: SpecType[];
};

type SupportsCppName = {
  /**
   * Allows overiding the C++ name used when generating a binding.
   * By default we will use the same name in the spec for the cppName, so you don't need to specify this when they match.
   * This can be used both to simply change the name, or because the C++ entity can't be identifed by a simple identifier.
   * Examples:
   *  - Can provide explicit template arguments for types and methods.
   *  - For types, this must be used types in namespaces or defined inside of classes.
   *  - For record fields, this can be used to expose a C++ getter as a field (a bit of a hack, but works).
   *  - For methods, Can be used to chain accesses (a bit of a hack, but works).
   */
  cppName?: string;
};

export type RelaxedEnumSpec = SupportsCppName & {
  /**
   * The values in the enum, either as a list or map from name to value.
   * The list form implicitly starts at 0 and assigns numbers to remaining entries.
   * We automatically validate that the names map to the correct values in C++.
   *
   * TODO: remove the isFlag and flagMask fields. The are unused.
   */
  values: string[] | { [key: string]: number };
} & (
    | { isFlag?: false }
    | {
        isFlag: true;
        flagMask: number;
      }
  );

export type RelaxedRecordSpec = SupportsCppName & {
  fields: { [name: string]: RelaxedFieldSpec };
};

/**
 * Description of a public field in a record.
 * If a string is specified rather than an object, it is equivalent to specifying just the type.
 */
export type RelaxedFieldSpec =
  | SpecType
  | (SupportsCppName & {
      /** NOTE: this is the spec type name, not the C++ type name (they are often but not always the same) */
      type: SpecType;
      /**
       * Allows specifying a default value for this field.
       * Fields that are top-level Nullable or Optional have an implicit default value of nullptr/nullopt.
       * Fields with an implicit or explicit default value are considered optional, those without are considered required.
       */
      default?: unknown;
    });

export type RelaxedClassSpec = SupportsCppName & {
  /**
   * Marks the class as iterable using begin()/end() in C++.
   * Automatically mapped to whatever the "normal" iteration API is in the SDK language.
   * Value is the type yeidled by the iterator (not the iterator type!).
   */
  iterable?: SpecType;
  /**
   * Use this for types that need to be dereferenced in order to access their methods.
   * In this case, the methods are really on whatever operator* returns, and NOT on this type!
   * This is currently only used for TableRef/ConstTableRef (unless this comment is stale...)
   */
  needsDeref?: boolean;
  /**
   * Marks types that are passed around inside of a std::shared_ptr.
   * Injects a typeAlias with this name for std::shared_ptr<ThisClass>.
   * When provided, objects bound to this type will hold a shared_ptr<T> rather than a unique by-value copy of this class.
   */
  sharedPtrWrapped?: string;
  /** When true, the bindings will never try to bind directly to values of this type. */
  abstract?: boolean;
  /** The base class of this class. If omitted, this is treated as a root type. */
  base?: string;
  /**
   * Map of unique names to function types describing constructors of this class.
   * The function type should omit a return type because it is implicitly ThisClass.
   * For languages that don't support overloading, these will be named static methods instead of constructors.
   */
  constructors?: { [name: string]: string };
  /** Instance methods on this class. */
  methods?: { [name: string]: OverloadSet };
  /** Static methods attached to this class. */
  staticMethods?: { [name: string]: OverloadSet };
  /**
   * These are like instance methods, but for languages that support computed properties, they will be exposed like that.
   * Note that these still call methods in C++. There is no way to expose fields on a class (unlike a record)!
   */
  properties?: { [name: string]: SpecType };
};

/** TODO merge interface and classes since the distinction was never implemented */
export type RelaxedInterfaceSpec = SupportsCppName & {
  /** The base class of this class. If omitted, this is treated as a root type. */
  base?: string;
  /**
   * Marks types that are passed around inside of a std::shared_ptr.
   * Injects a typeAlias with this name for std::shared_ptr<ThisClass>.
   * When provided, objects bound to this type will hold a shared_ptr<T> rather than a unique by-value copy of this class.
   */
  sharedPtrWrapped?: string;
  /** Static methods attached to this class. */
  staticMethods?: { [name: string]: OverloadSet };
  /** Instance methods on this class. (They were intended to be overridable by the SDK, but that isn't implemented) */
  methods?: { [name: string]: OverloadSet };
};

/**
 * Either a single method or a list of methods in an overload set.
 * If providing a list, at most one entry may omit the suffix field to ensure that unique names are unique.
 *
 * Function syntax: (arg_name: ArgType) FLAGS -> RetType
 *   FLAGS: zero or more of const, noexcept, or off_thread
 *   If RetType is void, the `-> RetType` part can be omitted.
 *   Final comma is optional (recommend omitting).
 *   WARNING: in yaml, strings containing a : followed by a space MUST be quoted!
 */
type OverloadSet = RelaxedMethodSpec | RelaxedMethodSpec[];

/**
 * If a string is specified rather than an object, it is equivalent to specifying just the sig.
 *
 * Function syntax: (arg_name: ArgType) FLAGS -> RetType
 *   FLAGS: zero or more of const, noexcept, or off_thread
 *   If RetType is void, the `-> RetType` part can be omitted.
 *   Final comma is optional (recommend omitting).
 *   WARNING: in yaml, strings containing a : followed by a space MUST be quoted!
 */
export type RelaxedMethodSpec =
  | string
  | (SupportsCppName & {
      /** The signature of this method. */
      sig: string;
      /**
       * Appended to the name of the method (with a `_` separator) to form a unique name for this overload.
       * This is used among other things as the method name in languages that don't support overloading.
       */
      suffix?: string;
    });

/** TODO remove. This is unused */
export type RelaxedConstantSpec = {
  type: string;
  value: string;
};
