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
import {FlatList, Image, StyleSheet, Text, View} from 'react-native';

import {colors} from '../styles/colors';
import {useMovies} from '../providers/MovieProvider';

export function HomeScreen() {
  const movies = useMovies();

  return (
    <View>
      <FlatList
        data={movies}
        keyExtractor={movieGroup => movieGroup.category}
        renderItem={({item: movieGroup}) => (
          <View>
            <Text style={styles.category}>{movieGroup.category}</Text>
            <FlatList
              data={movieGroup.movies}
              horizontal
              keyExtractor={movie => movie._id.toHexString()}
              renderItem={({item: movie}) => (
                <Image
                  source={{uri: movie.poster}}
                  style={styles.poster}
                  resizeMode="cover"
                />
              )}
              showsHorizontalScrollIndicator={false}
            />
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  category: {
    marginTop: 20,
    marginBottom: 5,
    marginLeft: 5,
    color: colors.white,
    fontWeight: 'bold',
  },
  poster: {
    width: 120,
    height: 170,
    marginHorizontal: 5,
  },
});
