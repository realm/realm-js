include(ExternalProject)

function(download_realm_core core_version)
    set(core_url "https://static.realm.io/downloads/core/realm-core-${core_version}.tar.bz2")
    set(core_tarball_name "realm-core-${core_version}.tar.bz2")
    set(core_temp_tarball "/tmp/${core_tarball_name}")
    set(core_directory_parent "${CMAKE_CURRENT_SOURCE_DIR}${CMAKE_FILES_DIRECTORY}")
    set(core_directory "${core_directory_parent}/realm-core-${core_version}")
    set(core_tarball "${core_directory_parent}/${core_tarball_name}")

    if (NOT EXISTS ${core_tarball})
        if (NOT EXISTS ${core_temp_tarball})
            message("Downloading core ${core_version} from  ${core_url}.")
            file(DOWNLOAD ${core_url} ${core_temp_tarball}.tmp SHOW_PROGRESS)
            file(RENAME ${core_temp_tarball}.tmp ${core_temp_tarball})
        endif()
        file(COPY ${core_temp_tarball} DESTINATION ${core_directory_parent})
    endif()

    set(core_library_debug ${core_directory}/librealm-dbg.a)
    set(core_library_release ${core_directory}/librealm.a)
    set(core_libraries ${core_library_debug} ${core_library_release})

    add_custom_command(
        COMMENT "Extracting ${core_tarball_name}"
        OUTPUT ${core_libraries}
        DEPENDS ${core_tarball}
        COMMAND ${CMAKE_COMMAND} -E tar xf ${core_tarball}
        COMMAND ${CMAKE_COMMAND} -E remove_directory ${core_directory}
        COMMAND ${CMAKE_COMMAND} -E rename core ${core_directory}
        COMMAND ${CMAKE_COMMAND} -E touch_nocreate ${core_libraries})

    add_custom_target(realm-core DEPENDS ${core_libraries})

    add_library(realm STATIC IMPORTED)
    add_dependencies(realm realm-core)
    set_property(TARGET realm PROPERTY IMPORTED_LOCATION_DEBUG ${core_library_debug})
    set_property(TARGET realm PROPERTY IMPORTED_LOCATION_RELEASE ${core_library_release})
    set_property(TARGET realm PROPERTY IMPORTED_LOCATION ${core_library_release})

    set(REALM_CORE_INCLUDE_DIR ${core_directory}/include PARENT_SCOPE)
endfunction()
