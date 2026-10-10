cmake_minimum_required(VERSION 3.15)
project(MapAtlasGeoCore CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_library(map_atlas_geo SHARED
    geo_core.cpp
    geo_core.hpp
)

add_executable(geo_core_cli
    geo_core.cpp
)

target_include_directories(map_atlas_geo PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})
target_include_directories(geo_core_cli PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})
