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

export type IGeoPosition = [number, number]; //long/lat, so it's the same order as geoJSON

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

export type GeoPoint =
  //This is compatible with GeoLocationCoordinates (https://developer.mozilla.org/en-US/docs/Web/API/GeolocationCoordinates)
  | {
      latitude: number;
      longitude: number;
    }
  | IGeoPoint
  | IGeoPosition;

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
  static earthRadiusKm = 6378.1;
  static milesPerKm = 1.609344;

  static fromKilometers(km: number): number {
    return km / this.earthRadiusKm;
  }
  static fromMiles(ml: number): number {
    return this.fromKilometers(ml / this.milesPerKm);
  }
}
