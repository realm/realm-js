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

import React, {createContext, useContext, useState} from 'react';
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
  const actionMovies = useQuery(Movie, movies =>
    movies
      .filtered('"Action" IN genres AND poster != nil')
      .sorted('released', true),
  );
  const comedyMovies = useQuery(Movie, movies =>
    movies
      .filtered('"Comedy" IN genres AND poster != nil')
      .sorted('released', true),
  );
  const biographyMovies = useQuery(Movie, movies =>
    movies
      .filtered('"Biography" IN genres AND poster != nil')
      .sorted('released', true),
  );
  const familyMovies = useQuery(Movie, movies =>
    movies
      .filtered('"Family" IN genres AND poster != nil')
      .sorted('released', true),
  );
  const dramaMovies = useQuery(Movie, movies =>
    movies
      .filtered('"Drama" IN genres AND poster != nil')
      .sorted('released', true),
  );
  const crimeMovies = useQuery(Movie, movies =>
    movies
      .filtered('"Crime" IN genres AND poster != nil')
      .sorted('released', true),
  );
  const historyMovies = useQuery(Movie, movies =>
    movies
      .filtered('"History" IN genres AND poster != nil')
      .sorted('released', true),
  );
  const westernMovies = useQuery(Movie, movies =>
    movies
      .filtered('"Western" IN genres AND poster != nil')
      .sorted('released', true),
  );
  const romanceMovies = useQuery(Movie, movies =>
    movies
      .filtered('"Romance" IN genres AND poster != nil')
      .sorted('released', true),
  );
  const fantasyMovies = useQuery(Movie, movies =>
    movies
      .filtered('"Fantasy" IN genres AND poster != nil')
      .sorted('released', true),
  );
  const warMovies = useQuery(Movie, movies =>
    movies
      .filtered('"War" IN genres AND poster != nil')
      .sorted('released', true),
  );
  const mysteryMovies = useQuery(Movie, movies =>
    movies
      .filtered('"Mystery" IN genres AND poster != nil')
      .sorted('released', true),
  );

  // We are providing the `movies` value via `useState()` and not
  // expecting the queries to update for this example. If we would
  // expect the queries to rerun, consider using `useMemo()` here and
  // add the the query results to its dependency list. Providing a
  // reference to `movies` in the `MovieContext.Provider value` (rather
  // than an inline array or object) prevents unnecessary rerenders.
  const [movies] = useState([
    {category: 'Action', movies: actionMovies},
    {category: 'Comedies', movies: comedyMovies},
    {category: 'Biographies', movies: biographyMovies},
    {category: 'Family', movies: familyMovies},
    {category: 'Drama', movies: dramaMovies},
    {category: 'Crime', movies: crimeMovies},
    {category: 'History', movies: historyMovies},
    {category: 'Western', movies: westernMovies},
    {category: 'Romance', movies: romanceMovies},
    {category: 'Fantasy', movies: fantasyMovies},
    {category: 'War', movies: warMovies},
    {category: 'Mystery', movies: mysteryMovies},
  ]);

  return (
    <MovieContext.Provider value={movies}>{children}</MovieContext.Provider>
  );
}

export const useMovies = () => useContext(MovieContext);
