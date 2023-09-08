////////////////////////////////////////////////////////////////////////////
//
// Copyright 2023 Realm Inc.
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

import React from 'react';
import {FlatList, View} from 'react-native';

import {Loading} from '../components/Loading';
import {MovieList} from '../components/MovieList';
import {useMovies} from '../providers/MovieProvider';

/**
 * Displays the movies by genre/category.
 */
export function HomeScreen() {
  const movieSections = useMovies();

  return (
    <View>
      {/* A loading screen is shown for a few seconds to hide when
      the on-screen movie posters load from their remote sources. */}
      <Loading duration={3200} />
      <FlatList
        data={movieSections}
        initialNumToRender={6}
        keyExtractor={section => section.category}
        renderItem={({item: section}) => (
          <MovieList category={section.category} movies={section.movies} />
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
