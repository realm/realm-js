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
import {Image, Pressable, StyleSheet} from 'react-native';

import {Movie} from '../models/Movie';

type MovieItemProps = {
  movie: Movie;
  onPress: (movie: Movie) => void;
};

/**
 * Displays a movie list item.
 */
export const MovieItem = memo(function ({movie, onPress}: MovieItemProps) {
  return (
    <Pressable
      onPress={() => onPress(movie)}
      style={({pressed}) => pressed && styles.pressed}>
      <Image
        accessibilityLabel={movie.title}
        alt={movie.title}
        defaultSource={require('../assets/movie-placeholder.png')}
        source={{uri: movie.poster}}
        style={styles.poster}
        resizeMode="cover"
      />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.5,
  },
  poster: {
    width: 120,
    height: 170,
    marginHorizontal: 4,
  },
});
