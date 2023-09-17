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

import React, {memo} from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import type Realm from 'realm';

import {Movie} from '../models/Movie';
import {MovieItem} from './MovieItem';
import {colors} from '../styles/colors';

type MovieListProps = {
  category: string;
  movies: Realm.Results<Movie> | Realm.List<Movie>;
  onItemPress: (movie: Movie) => void;
};

/**
 * A horizontal and scrollable list of movies.
 * (As with `MovieItem`, this component is memoized as it itself exists as a
 * list item in the vertical parent list that displays each movie category.)
 */
export const MovieList = memo(function ({
  category,
  movies,
  onItemPress,
}: MovieListProps) {
  return movies.length ? (
    <View>
      <Text style={styles.category}>{category}</Text>
      <FlatList
        data={movies}
        horizontal
        initialNumToRender={5}
        keyExtractor={movie => movie._id.toHexString()}
        renderItem={({item: movie}) => (
          <MovieItem movie={movie} onPress={onItemPress} />
        )}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  ) : (
    <></>
  );
});

const styles = StyleSheet.create({
  category: {
    marginTop: 20,
    marginBottom: 5,
    marginLeft: 5,
    color: colors.white,
    fontWeight: 'bold',
  },
});
