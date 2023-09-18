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

import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import type Realm from 'realm';
import {useQuery, useRealm} from '@realm/react';

import {Movie} from '../models/Movie';
import {PrivateContent} from '../models/PrivateContent';

/**
 * Values available to consumers of the `MovieContext`.
 */
type MovieContextType = {
  /**
   * All movies grouped by category.
   */
  movieSections: {
    category: string;
    // `My List` is a `Realm.List<Movie>` while the other
    // movie categories will yield `Realm.Results<Movie>`.
    movies: Realm.Results<Movie> | Realm.List<Movie>;
  }[];
  /**
   * The movie selected to view more information about.
   */
  selectedMovie: Movie | null;
  setSelectedMovie: (movie: Movie) => void;
  addToMyList: (movie: Movie) => void;
  removeFromMyList: (movie: Movie) => void;
  existsInMyList: (movie: Movie) => boolean;
};

/**
 * The movie context with initial values.
 */
const MovieContext = createContext<MovieContextType>({
  movieSections: [],
  selectedMovie: null,
  setSelectedMovie: () => {},
  addToMyList: () => {},
  removeFromMyList: () => {},
  existsInMyList: () => false,
});

type MovieProviderProps = {
  children: ReactNode;
};

/**
 * Queries and provides the relevant movies using `@realm/react`, as well as
 * providing functions for updating `My List`.
 */
export function MovieProvider({children}: MovieProviderProps) {
  const realm = useRealm();

  // The selected movie will decide which movie is shown on the
  // `MovieInfoScreen` when a movie item is pressed from the list.
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  // Query movies of certain genres. (A helper `query()` function is
  // defined to simplify the argument passed to `useQuery()`).
  const query = (movies: Realm.Results<Movie>, genre: string) =>
    movies.filtered(`'${genre}' IN genres`);
  const action = useQuery(Movie, movies => query(movies, 'Action'));
  const comedy = useQuery(Movie, movies => query(movies, 'Comedy'));
  const biography = useQuery(Movie, movies => query(movies, 'Biography'));
  const crime = useQuery(Movie, movies => query(movies, 'Crime'));
  const family = useQuery(Movie, movies => query(movies, 'Family'));
  const drama = useQuery(Movie, movies => query(movies, 'Drama'));
  const history = useQuery(Movie, movies => query(movies, 'History'));
  const western = useQuery(Movie, movies => query(movies, 'Western'));
  const romance = useQuery(Movie, movies => query(movies, 'Romance'));
  const fantasy = useQuery(Movie, movies => query(movies, 'Fantasy'));
  const war = useQuery(Movie, movies => query(movies, 'War'));
  const mystery = useQuery(Movie, movies => query(movies, 'Mystery'));

  // When a user registers with email and password, a `PrivateContent` document
  // is automatically created (we set this up via an Atlas Trigger (`onNewUser`)
  // which calls an Atlas Function (`createPrivateContent`), see `README.md`).
  // Here we query the private content. This will only be populated if the account
  // is private due to the `initialSubscriptions` defined as a prop to `RealmProvider`
  // in `AuthenticatedApp.tsx`. Since that subscription already filters the `PrivateContent`
  // to the currently logged in user, we do not need to filter that here. Moreover,
  // the backend in Atlas App Services is set up to only allow reads and writes
  // to a user's own `PrivateContent` document.
  const privateContent = useQuery(PrivateContent);

  const myList = useMemo(
    () => privateContent[0]?.myList || [],
    [privateContent],
  );

  const existsInMyList = useCallback(
    (movie: Movie) => myList.includes(movie),
    [myList],
  );

  const addToMyList = useCallback(
    (movie: Movie) => {
      if (!existsInMyList(movie)) {
        realm.write(() => myList.unshift(movie));
      }
    },
    [realm, myList, existsInMyList],
  );

  const removeFromMyList = useCallback(
    (movie: Movie) => {
      const index = myList.indexOf(movie);
      if (index >= 0) {
        realm.write(() => myList.remove(index));
      }
    },
    [realm, myList],
  );

  const movieSections = [
    {category: 'My List', movies: myList},
    {category: 'Action', movies: action},
    {category: 'Comedies', movies: comedy},
    {category: 'Biographies', movies: biography},
    {category: 'Crime', movies: crime},
    {category: 'Family', movies: family},
    {category: 'Drama', movies: drama},
    {category: 'History', movies: history},
    {category: 'Western', movies: western},
    {category: 'Romance', movies: romance},
    {category: 'Fantasy', movies: fantasy},
    {category: 'War', movies: war},
    {category: 'Mystery', movies: mystery},
  ];

  const contextValue = {
    movieSections,
    selectedMovie,
    setSelectedMovie,
    addToMyList,
    removeFromMyList,
    existsInMyList,
  };

  return (
    <MovieContext.Provider value={contextValue}>
      {children}
    </MovieContext.Provider>
  );
}

/**
 * @returns The context value of the `MovieContext.Provider`.
 */
export const useMovies = () => useContext(MovieContext);
