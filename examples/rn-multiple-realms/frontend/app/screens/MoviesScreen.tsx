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

import React, {useCallback} from 'react';
import {FlatList, StyleSheet, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';

import {Loading} from '../components/Loading';
import {Movie} from '../models/Movie';
import {MovieList} from '../components/MovieList';
import {MoviesNavigatorParamList} from '../navigation/MoviesNavigator';
import {routes} from '../navigation/routes';
import {useMovies} from '../providers/MovieProvider';

type MoviesScreenProps = NativeStackScreenProps<
  MoviesNavigatorParamList,
  typeof routes.MOVIES
>;

/**
 * Displays the movies by genre/category.
 */
export function MoviesScreen({navigation: {navigate}}: MoviesScreenProps) {
  const {movieSections, setSelectedMovie} = useMovies();
  const showMovieInfo = useCallback(
    (movie: Movie) => {
      setSelectedMovie(movie);
      navigate(routes.MOVIE);
    },
    [navigate, setSelectedMovie],
  );

  return (
    <View style={styles.container}>
      {/* A loading screen is shown for a few seconds to hide when
      the on-screen movie posters load from their remote sources. */}
      <Loading duration={3500} />
      {/* Renders each horizontal section of movies. */}
      <FlatList
        data={movieSections}
        initialNumToRender={6}
        keyExtractor={section => section.category}
        renderItem={({item: section}) => (
          <MovieList
            category={section.category}
            movies={section.movies}
            onItemPress={showMovieInfo}
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
