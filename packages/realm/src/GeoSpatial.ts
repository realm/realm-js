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

import { binding } from "./internal";

/**
 * Represents the coordinates of a point. The first two required elements of the array are longitude (index 0) and latitude (index 1).
 * The third and optional element is altitude (index 2), but is currently ignored in the geospatial queries calculations.
 */
export type GeoPosition = [number, number] | [number, number, number];

/**
 * Interface that satisfies the GeoJSON specification for a polygon.
 * This can be used as one of the possible forms of {@link GeoPolygon}.
 */
export interface CanonicalGeoPolygon {
  coordinates: GeoPosition[][];
  type: "Polygon";
}

/**
 * Interface that satisfies the GeoJSON specification for a point.
 * Any embedded object that adhere to this interface can be queried in geospatial queries.
 * Additionally, this can be used as one of the possible forms of {@link GeoPoint}.
 */
export interface CanonicalGeoPoint {
  coordinates: GeoPosition;
  type: "Point";
}

/**
 * Represents a point in spherical geometry.
 * This type cannot be used on its own, only as a building block for the other geospatial types.
 * ({@link GeoCircle}, {@link GeoBox}, {@link GeoPolygon}).
 */
export type GeoPoint =
  /**
   * This is compatible with {@link https://developer.mozilla.org/en-US/docs/Web/API/GeolocationCoordinates|GeoLocationCoordinates}
   */
  | {
      latitude: number;
      longitude: number;
      altitude?: number;
    }
  | CanonicalGeoPoint
  | GeoPosition;

/**
 * Represents a circle in spherical geometry that can be used as an argument for geospatial queries.
 * @example
 * let circle: GeoCircle = {
 *   center: [20, 40],
 *   distance: 0.05,
 * };
 * realm.objects(Restaurant).filtered("location geoWithin $0", circle)
 */
export type GeoCircle = {
  /** The center of the circle. */
  center: GeoPoint;
  /**
   * The radius of the circle in radians. You can use {@link kmToRadians} and {@link miToRadians}
   * to respectively convert kilometers and miles to radians.
   */
  distance: number;
};

/**
 * Represents a polygon in spherical geometry that can be used as an argument for geospatial queries.
 * The polygon is comprised of at least one outer ring and optionally multiple internal rings representing holes with the following restrictions:
 * - Each ring must contains at least 3 distinct points, where the first and the last point must be the same to indicate a closed ring (this means that each ring
 * must have at least 4 points).
 * - The interior rings must be entirely inside the outer ring.
 * - Rings can share vertices but not edges.
 * - No ring may be empty.
 * @example
 * let polygon: GeoPolygon = {
 *  outerRing: [
 *   [-2, -2],
 *   [3.45, -4.23],
 *   [2.56, 4.62],
 *   [-3.23, 2.5],
 *   [-2, -2],
 *  ],
 * };
 * realm.objects(Restaurant).filtered("location geoWithin $0", polygon)
 */
export type GeoPolygon =
  | {
      outerRing: GeoPoint[];
      holes?: GeoPoint[][];
    }
  | CanonicalGeoPolygon;

/**
 * Represents a box in spherical geometry that can be used as an argument for geospatial queries.
 * This is a short-hand for the equivalent {@link GeoPolygon}.
 * @example
 * let box: GeoBox = {
 *   bottomLeft: [-1, -1],
 *   topRight: [1, 1],
 * };
 * realm.objects(Restaurant).filtered("location geoWithin $0", box)
 */
export type GeoBox = {
  /** The bottom left point of the box. */
  bottomLeft: GeoPoint;
  /** The top right point of the box. */
  topRight: GeoPoint;
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
    points = toBindingGeoPointArray([polygon.outerRing].concat(polygon.holes ?? []));
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

/**
 * Converts the input kilometer value in radians.
 * @param km - The kilometers to convert.
 * @returns The corresponding number of radians.
 */
export function kmToRadians(km: number): number {
  return km / earthRadiusKm;
}

/**
 * Converts the input miles value in radians.
 * @param mi - The miles to convert.
 * @returns The corresponding number of radians.
 */
export function miToRadians(mi: number): number {
  return mi / earthRadiusMi;
}
