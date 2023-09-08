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

import React, {createContext, useContext} from 'react';
import type Realm from 'realm';
import {useQuery} from '@realm/react';

import {Movie} from '../models/Movie';

type MovieContextType = {
  category: string;
  movies: Realm.Results<Movie>;
}[];
const MovieContext = createContext<MovieContextType>([]);

type MovieProviderProps = {
  children: React.ReactNode;
};

/**
 * Queries and provides the relevant movies using `@realm/react`.
 */
export function MovieProvider({children}: MovieProviderProps) {
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

  const movieSections = [
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

  return (
    <MovieContext.Provider value={movieSections}>
      {children}
    </MovieContext.Provider>
  );
}

export const useMovies = () => useContext(MovieContext);
