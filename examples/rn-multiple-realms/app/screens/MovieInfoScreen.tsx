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
import {
  Alert,
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';

import {Icon} from '../components/Icon';
import {MoviesNavigatorParamList} from '../navigation/MoviesNavigator';
import {colors} from '../styles/colors';
import {routes} from '../navigation/routes';
import {useAccountInfo} from '../hooks/useAccountInfo';
import {useMovies} from '../providers/MovieProvider';

type MovieInfoScreenProps = NativeStackScreenProps<
  MoviesNavigatorParamList,
  typeof routes.MOVIE
>;

/**
 * Displays information about a movie along with the option to add or
 * remove it from `My List`.
 */
export function MovieInfoScreen({navigation}: MovieInfoScreenProps) {
  const {
    selectedMovie: movie,
    addToMyList,
    removeFromMyList,
    existsInMyList,
  } = useMovies();
  const {isPublicAccount} = useAccountInfo();

  const handlePressMyList = useCallback(() => {
    if (isPublicAccount) {
      return Alert.alert('Log in to add and sync movies to My List.');
    }
    if (movie) {
      if (existsInMyList(movie)) {
        removeFromMyList(movie);
      } else {
        addToMyList(movie);
      }
    }
  }, [isPublicAccount, movie, addToMyList, removeFromMyList, existsInMyList]);

  return movie ? (
    <View style={styles.container}>
      <ImageBackground
        alt={movie.title}
        defaultSource={require('../assets/movie-placeholder.png')}
        source={{uri: movie.poster}}
        style={styles.poster}
        resizeMode="cover">
        {/* Back button */}
        <Pressable
          accessibilityLabel="Go back"
          accessibilityHint="Navigates to the previous screen"
          onPress={() => navigation.goBack()}
          style={({pressed}) => [styles.backButton, pressed && styles.pressed]}>
          <Icon name="arrow-left" color={colors.white} size={25} />
        </Pressable>
        {/* Play button */}
        <Pressable
          accessibilityLabel="Play"
          accessibilityHint="Placeholder play button but does not support play."
          onPress={() =>
            Alert.alert('This example app does not support playing movies.')
          }
          style={({pressed}) => [styles.playButton, pressed && styles.pressed]}>
          <Icon name="play" color={colors.white} size={50} />
        </Pressable>
      </ImageBackground>
      <View style={styles.info}>
        <Text style={styles.title}>{movie.title}</Text>
        <Text style={styles.year}>{movie.year}</Text>
        {movie.fullplot && (
          <View style={styles.scrollContainer}>
            <ScrollView style={styles.plotContainer}>
              <Text style={styles.plot}>{movie.fullplot}</Text>
            </ScrollView>
          </View>
        )}
        <View style={styles.myList}>
          <Pressable
            accessibilityLabel={
              existsInMyList(movie) ? 'Remove from My List' : 'Add to My List'
            }
            onPress={handlePressMyList}
            style={({pressed}) => pressed && styles.pressed}>
            <Icon
              name={existsInMyList(movie) ? 'check' : 'plus'}
              color={isPublicAccount ? colors.grayDark : colors.white}
              size={30}
            />
          </Pressable>
          <Text style={styles.myListLabel}>My List</Text>
        </View>
      </View>
    </View>
  ) : (
    <></>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  poster: {
    height: 500,
    width: '100%',
    alignItems: 'center',
  },
  backButton: {
    marginTop: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 50,
    marginLeft: 20,
    alignSelf: 'flex-start',
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  playButton: {
    marginTop: 140,
    borderWidth: 2,
    borderColor: colors.white,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  pressed: {
    opacity: 0.8,
  },
  info: {
    padding: 10,
  },
  title: {
    marginBottom: 5,
    color: colors.white,
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Heavy' : 'Roboto',
  },
  year: {
    color: colors.grayDark,
    fontWeight: 'bold',
  },
  scrollContainer: {
    height: 100,
    marginVertical: 5,
  },
  plotContainer: {
    flex: 1,
  },
  plot: {
    color: colors.white,
    lineHeight: 20,
  },
  myList: {
    width: 52,
    marginTop: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  myListLabel: {
    color: colors.grayDark,
  },
});
