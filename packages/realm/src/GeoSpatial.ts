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

import { ObjectSchema, RealmObject } from "./internal";

type GeoPoint =
  | {
      latitude: number;
      longitude: number;
    }
  | IGeoPoint
  | [number, number];

type GeoBox = {
  bottomLeft: GeoPoint;
  topRight: GeoPoint;
};

type GeoPolygon = {
  outerRing: GeoPoint[];
  holes: GeoPoint[][];
};

type GeoSphere = {
  center: GeoPoint;
  distance: number;
};

//Utility class for distance conversions to radians
class Distance {
  static fromKilometers(val: number): number {}
  static fromMiles(val: number): number {}
}

//Interface that indicates the requirements for objects that satisfy the geoJSON specification for a point
interface IGeoPoint {
  coordinates: [number, number];
  type: "Point";
}

//Example of embedded class that satisfies the geoJSON specification for a point.
//This will not be exposed to developers, it will only be shown in the docs
class ExampleGeoPoint implements IGeoPoint {
  coordinates: [number, number] = [0, 0];
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

//Example class definition
class Restaurant extends RealmObject {
  name?: string;
  location?: ExampleGeoPoint;

  static schema: ObjectSchema = {
    name: "Restaurant",
    properties: {
      name: "string",
      location: "ExampleGeoPoint",
    },
  };
}

const a: ExampleGeoPoint = {
  coordinates: [2, 3],
  type: "Point",
};

//Example queries
const restaurants = realm.objects(Restaurant.schema.name);

restaurants.filtered("location geoWithin geoBox([0.2, 0.2], [0.7, 0.7])");

const boxArea: GeoBox = {
  bottomLeft: { latitude: 0.2, longitude: 0.2 },
  topRight: { latitude: 0.7, longitude: 0.7 },
};
restaurants.filtered("location geoWithin $0", boxArea);

restaurants.filtered("location geoWithin geoWithin geoSphere([0.3, 0.3], 1000.0)");

const sphereArea: GeoSphere = {
  center: { latitude: 0.3, longitude: 0.3 },
  distance: Distance.fromKilometers(200),
};
restaurants.filtered("location geoWithin $0", sphereArea);
