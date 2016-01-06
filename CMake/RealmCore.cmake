include(ExternalProject)

function(download_realm_core realm_core_version)
    set(core_url "https://static.realm.io/downloads/core/realm-core-${realm_core_version}.tar.bz2")
    set(core_directory "${CMAKE_CURRENT_SOURCE_DIR}${CMAKE_FILES_DIRECTORY}/core-${realm_core_version}")

    set(core_library_debug ${core_directory}/librealm-dbg.a)
    set(core_library_release ${core_directory}/librealm.a)

    ExternalProject_Add(realm-core
        URL ${core_url}
        PREFIX ${CMAKE_CURRENT_SOURCE_DIR}${CMAKE_FILES_DIRECTORY}/realm-core
        DOWNLOAD_DIR ${CMAKE_CURRENT_SOURCE_DIR}${CMAKE_FILES_DIRECTORY}
        SOURCE_DIR ${core_directory}
        BUILD_BYPRODUCTS ${core_library_debug} ${core_library_release}
        USES_TERMINAL_DOWNLOAD 1
        CONFIGURE_COMMAND ""
        BUILD_COMMAND ""
        INSTALL_COMMAND "")

    add_library(realm STATIC IMPORTED)
    add_dependencies(realm realm-core)
    set_property(TARGET realm PROPERTY IMPORTED_LOCATION_DEBUG ${core_library_debug})
    set_property(TARGET realm PROPERTY IMPORTED_LOCATION_RELEASE ${core_library_release})
    set_property(TARGET realm PROPERTY IMPORTED_LOCATION ${core_library_release})

    set(REALM_CORE_INCLUDE_DIR ${core_directory}/include PARENT_SCOPE)
endfunction()
