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

import { assert, binding } from "./internal";

export type GeoPosition = [number, number] | [number, number, number]; // long/lat/alt, so it's the same order as geoJSON

//Interface that satisfies the geoJSON specification for a polygon.
export interface CanonicalGeoPolygon {
  coordinates: GeoPosition[][];
  type: "Polygon";
}

//Interface that satisfies the geoJSON specification for a point.
//Any object that respects this interface can be used in geospatial queries
export interface CanonicalGeoPoint {
  coordinates: GeoPosition;
  type: "Point";
}

export type GeoPoint =
  //This is compatible with GeoLocationCoordinates (https://developer.mozilla.org/en-US/docs/Web/API/GeolocationCoordinates)
  | {
      latitude: number;
      longitude: number;
      altitude?: number;
    }
  | CanonicalGeoPoint
  | GeoPosition;

export type GeoPolygon =
  | {
      outerRing: GeoPoint[];
      holes: GeoPoint[][];
    }
  | CanonicalGeoPolygon;

// GeoBox and GeoCircle have no corresponding geoJSON types
export type GeoBox = {
  bottomLeft: GeoPoint;
  topRight: GeoPoint;
};

export type GeoCircle = {
  center: GeoPoint;
  distance: number;
};

/** @internal */
export function circleToBindingGeospatial(circle: GeoCircle): binding.Geospatial {
  return binding.Geospatial.makeFromCircle({
    center: toBindingGeoPoint(circle.center),
    radiusRadians: circle.distance,
  });
}

/** @internal */
export function boxToBindingGeospatial(box: GeoBox): binding.Geospatial {
  return binding.Geospatial.makeFromBox({
    lo: toBindingGeoPoint(box.bottomLeft),
    hi: toBindingGeoPoint(box.topRight),
  });
}

/** @internal */
export function polygonToBindingGeospatial(polygon: GeoPolygon): binding.Geospatial {
  let points: binding.GeoPoint_Relaxed[][];
  if ("type" in polygon) {
    points = toBindingGeoPointArray(polygon.coordinates);
  } else {
    points = toBindingGeoPointArray([polygon.outerRing].concat(polygon.holes));
  }

  return binding.Geospatial.makeFromPolygon({
    points,
  });
}

function toBindingGeoPoint(p: GeoPoint): binding.GeoPoint_Relaxed {
  if (Array.isArray(p)) {
    return { longitude: p[0], latitude: p[1], altitude: p[2] };
  } else if ("type" in p) {
    return { longitude: p.coordinates[0], latitude: p.coordinates[1], altitude: p.coordinates[2] };
  } else {
    return p;
  }
}

function toBindingGeoPointArray(arr: GeoPoint[][]): binding.GeoPoint_Relaxed[][] {
  return arr.map((ring) => ring.map((p) => toBindingGeoPoint(p)));
}

const earthRadiusKm = 6378.1;
const earthRadiusMi = 3963.16760121; //earthRadiusKm / 1.609344 (km/mi)

export function kmsToRadians(km: number): number {
  return km / earthRadiusKm;
}

export function miToRadians(mi: number): number {
  return mi / earthRadiusMi;
}
