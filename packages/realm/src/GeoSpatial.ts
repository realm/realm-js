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

import { ObjectSchema } from "./internal";

export type GeoPoint =
  //This is compatible with GeoLocationCoordinates (https://developer.mozilla.org/en-US/docs/Web/API/GeolocationCoordinates)
  | {
      latitude: number;
      longitude: number;
    }
  | IGeoPoint
  | IGeoPosition; // long/lat, so it’s the same order as geoJson

export type GeoPolygon =
  | {
      outerRing: GeoPoint[];
      holes: GeoPoint[][];
    }
  | IGeoPolygon;

// GeoBox and GeoCircle have no corresponding geoJSON types
export type GeoBox = {
  bottomLeft: GeoPoint;
  topRight: GeoPoint;
};

export type GeoCircle = {
  center: GeoPoint;
  distance: number;
};

//Utility class for distance conversions to radians
export class Distance {
  static fromKilometers(val: number): number {
    return 0;
  }
  static fromMiles(val: number): number {
    return 0;
  } //TODO Add right conversion
}

export type IGeoPosition = [number, number]; //long/latw

//Interface that satisfies the geoJSON specification for a polygon.
export interface IGeoPolygon {
  coordinates: IGeoPosition[][];
  type: "Polygon";
}

//Interface that satisfies the geoJSON specification for a point.
//Any object that respects this interface can be used in geospatial queries
export interface IGeoPoint {
  coordinates: IGeoPosition;
  type: "Point";
}

//Example of embedded class that satisfies the geoJSON specification for a point.
//This will not be exposed to developers, it will only be shown in the docs as an example.
class ExampleGeoPoint implements IGeoPoint {
  //TODO To Remove
  coordinates: IGeoPosition = [0, 0];
  type = "Point" as const;

  static schema: ObjectSchema = {
    name: "ExampleGeoPoint",
    embedded: true,
    properties: {
      type: "string",
      coordinates: "double[]",
    },
  };
}

// //Example class definition
// class Restaurant extends RealmObject {
//   name?: string;
//   location?: ExampleGeoPoint;

//   static schema: ObjectSchema = {
//     name: "Restaurant",
//     properties: {
//       name: "string",
//       location: "ExampleGeoPoint",
//     },
//   };
// }

// //Example queries
// const restaurants = realm.objects(Restaurant.schema.name);

// restaurants.filtered("location geoWithin geoBox([0.2, 0.2], [0.7, 0.7])");

// const boxArea: GeoBox = {
//   bottomLeft: { latitude: 0.2, longitude: 0.2 },
//   topRight: [0.7, 0.7],
// };
// restaurants.filtered("location geoWithin $0", boxArea);

// restaurants.filtered("location geoWithin geoWithin geoSphere([0.3, 0.3], 1000.0)");

// const sphereArea: GeoCircle = {
//   center: { latitude: 0.3, longitude: 0.3 },
//   distance: Distance.fromKilometers(200),
// };
// restaurants.filtered("location geoWithin $0", sphereArea);
