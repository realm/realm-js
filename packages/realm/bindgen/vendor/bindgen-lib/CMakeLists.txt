file(GLOB_RECURSE BINDGEN_LIB_TS_FILES
    LIST_DIRECTORIES false
    CONFIGURE_DEPENDS
    ${CMAKE_CURRENT_SOURCE_DIR}/src/*.ts
)
list(FILTER BINDGEN_LIB_TS_FILES EXCLUDE REGEX "tests/[^/]*\.ts$")

# Ninja buffers output so we need to tell tools to use colors even though stdout isn't a tty.
if(CMAKE_GENERATOR MATCHES "^Ninja")
    set(NODE_FORCE_COLOR ${CMAKE_COMMAND} -E env FORCE_COLOR=1)
endif()
set(NPX ${NODE_FORCE_COLOR} npx --prefix .) # without a prefix, npx changes the current directory and that is really confusing and hard to debug

# This path is hard coded in the reader, and referred to in the specs to inform yaml-language-server of the schema
set(SCHEMA_FILE ${CMAKE_CURRENT_SOURCE_DIR}/generated/spec.schema.json)
add_custom_command(
    OUTPUT ${SCHEMA_FILE}
    COMMAND ${NPX} typescript-json-schema ${CMAKE_CURRENT_SOURCE_DIR}/tsconfig.json RelaxedSpec --include ${CMAKE_CURRENT_SOURCE_DIR}/src/spec/relaxed-model.ts --out ${SCHEMA_FILE} --required --noExtraProps --aliasRefs
    VERBATIM
    MAIN_DEPENDENCY src/spec/relaxed-model.ts
    DEPENDS
        # Note: The json-schema generation task is extremely slow so we don't want to rerun it any time any TS file is modified.
        # Instead we assume that it will only transitively import the listed files.
        # (Right now there are no imports)
)

add_custom_target(BindgenSpecJsonSchema DEPENDS ${SCHEMA_FILE})

# Stash these variables as properties so they can be read from the bindgen() function.
# Using the BindgenSpecJsonSchema target for scoping, not because it actually has anything to do with that.
set_property(TARGET BindgenSpecJsonSchema PROPERTY BINDGEN_LIB_TS_FILES "${BINDGEN_LIB_TS_FILES}")
set_property(TARGET BindgenSpecJsonSchema PROPERTY NPX "${NPX}")

function(bindgen)
    set(options)
    set(oneValueArgs TEMPLATE OUTDIR)
    set(multiValueArgs OUTPUTS SPECS SOURCES)
    cmake_parse_arguments(PARSE_ARGV 0 BINDGEN "${options}" "${oneValueArgs}" "${multiValueArgs}")

    if(BINDGEN_UNPARSED_ARGUMENTS)
        message(FATAL_ERROR "Unexpected arguemnts to bindgen()" ${BINDGEN_UNPARSED_ARGUMENTS})
    endif()

    foreach(ARG TEMPLATE OUTDIR OUTPUTS) # SOURCES and SPECS are optional.
        if (NOT BINDGEN_${ARG})
            message(FATAL_ERROR "Argument ${ARG} is required to bindgen()")
        endif()
    endforeach()

    # Don't want to set cmake_minimum_required() here because it has other effects and needs to be done early.
    # Remove this once https://github.com/realm/realm-core/issues/6537 bumps realm-core's minimum.
    if(NOT CMAKE_CURRENT_FUNCTION_LIST_DIR)
        message(FATAL_ERROR "bindgen() requires cmake 3.17+")
    endif()

    get_property(BINDGEN_LIB_TS_FILES TARGET BindgenSpecJsonSchema PROPERTY BINDGEN_LIB_TS_FILES)
    get_property(NPX TARGET BindgenSpecJsonSchema PROPERTY NPX)

    set(CORE_SPEC_FILE ${CMAKE_CURRENT_FUNCTION_LIST_DIR}/spec.yml)

    add_custom_command(
        OUTPUT ${BINDGEN_OUTPUTS}
        COMMAND ${NPX} tsx -- "${CMAKE_CURRENT_FUNCTION_LIST_DIR}/realm-bindgen.ts"
            --spec "$<JOIN:${CORE_SPEC_FILE};${BINDGEN_SPECS},;--spec;>"
            --template "${BINDGEN_TEMPLATE}"
            --output "${BINDGEN_OUTDIR}"
        COMMAND_EXPAND_LISTS
        VERBATIM
        MAIN_DEPENDENCY ${BINDGEN_TEMPLATE}
        DEPENDS
            # from bindgen-lib
            ${CORE_SPEC_FILE}
            BindgenSpecJsonSchema
            ${BINDGEN_LIB_TS_FILES}

            # from sdk
            ${BINDGEN_SPECS}
            ${BINDGEN_SOURCES}
    )

    foreach(FILE ${BINDGEN_OUTPUTS})
        set_property(SOURCE ${FILE} PROPERTY INCLUDE_DIRECTORIES "$<$<COMPILE_LANGUAGE:CXX>:${CMAKE_CURRENT_FUNCTION_LIST_DIR}/src>")
    endforeach()
endfunction()
