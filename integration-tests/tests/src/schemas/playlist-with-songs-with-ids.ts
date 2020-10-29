////////////////////////////////////////////////////////////////////////////
//
// Copyright 2020 Realm Inc.
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

import * as Realm from "realm";

/* tslint:disable max-classes-per-file */

export interface IPlaylist {
    _id: number;
    title: string;
    songs: Realm.List<ISong>;
    related: Realm.List<IPlaylist>;
}

export const PlaylistSchema: Realm.ObjectSchema = {
    name: "Playlist",
    primaryKey: "_id",
    properties: {
        _id: "int",
        title: "string",
        songs: "Song[]",
        related: "Playlist[]"
    }
};

export class Playlist extends Realm.Object implements IPlaylist {
    public static schema = PlaylistSchema;

    public _id: number;
    public title: string;
    public songs: Realm.List<Song>;
    public related: Realm.List<Playlist>;
}

export interface ISong {
    _id: number;
    artist: string;
    title: string;
}

export const SongSchema: Realm.ObjectSchema = {
    name: "Song",
    primaryKey: "_id",
    properties: {
        _id: "int",
        artist: "string",
        title: "string"
    }
};

export class Song extends Realm.Object implements ISong {
    public static schema = SongSchema;

    public _id: number;
    public artist: string;
    public title: string;
}
