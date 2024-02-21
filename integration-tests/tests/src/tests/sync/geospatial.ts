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

import { expect } from "chai";
import Realm, {
  CanonicalGeoPoint,
  CanonicalGeoPolygon,
  GeoBox,
  GeoCircle,
  GeoPolygon,
  GeoPosition,
  WaitForSync,
  kmToRadians,
  miToRadians,
} from "realm";
import { authenticateUserBefore, importAppBefore, openRealmBeforeEach } from "../../hooks";
import { buildAppConfig } from "../../utils/build-app-config";
import { OpenRealmConfiguration } from "../../utils/open-realm";

class MyGeoPoint implements CanonicalGeoPoint {
  coordinates: GeoPosition;
  type = "Point" as const;

  constructor(long: number, lat: number) {
    this.coordinates = [long, lat];
  }

  static schema: Realm.ObjectSchema = {
    name: "MyGeoPoint",
    embedded: true,
    properties: {
      type: "string",
      coordinates: "double[]",
    },
  };
}

interface IPointOfInterest {
  _id: number;
  location: MyGeoPoint;
  locations?: MyGeoPoint[];
}

class PointOfInterest extends Realm.Object implements IPointOfInterest {
  _id = 0;
  location = new MyGeoPoint(0, 0);
  locations = [new MyGeoPoint(0, 0)];

  static schema: Realm.ObjectSchema = {
    name: "PointOfInterest",
    properties: {
      _id: "int",
      location: "MyGeoPoint",
      locations: "MyGeoPoint[]",
    },
    primaryKey: "_id",
  };
}

type QueryLengthPair = [ExpectedLength: number, Query: string, ...QueryArgs: Array<any>];
type QueryExceptionPair = [ExpectedException: string, Query: string, ...QueryArgs: Array<any>];
type QueryResultsPair = [ExpectedResults: any[], Query: string, ...QueryArgs: Array<any>];

/**
 * Teardown subscription helper, which will remove local data and assert the result
 */

async function tearDownSubscription(results: Realm.Results<any>, realm: Realm) {
  results.unsubscribe();
  await realm.syncSession?.downloadAllServerChanges();
  expect(results.length).to.equal(0);
}

/**
 * Helper method which runs an array of queries and asserts them to given expected length
 * For example: (r, "Obj", [1, "intCol == 0"]) => querying "intCol == 0" should return 1 elements.
 */
const expectQueryLength = (realm: Realm, objectSchema: Realm.ObjectClass, queryLengthPairs: QueryLengthPair[]) => {
  return Promise.all(
    queryLengthPairs.map(async ([expectedLength, queryString, ...queryArgs]) => {
      const filtered = realm.objects(objectSchema).filtered(queryString, ...queryArgs);
      await filtered.subscribe({ behavior: WaitForSync.Always });
      expect(filtered.length).to.equal(
        expectedLength,
        `Expected length ${expectedLength} for query: ${queryString} ${JSON.stringify(queryArgs)}`,
      );

      await tearDownSubscription(filtered, realm);
    }),
  );
};

/**
 * Helper method which runs an array of queries and asserts them to throw given exception.
 * For example: (r, "Obj", ["invalid", "intCol == #"]) => querying "intCol == #" should
 * throw an exception which includes the string "invalid".
 */
const expectQueryException = async (
  realm: Realm,
  objectSchema: Realm.ObjectClass,
  queryExceptionPairs: QueryExceptionPair[],
) => {
  return Promise.all(
    queryExceptionPairs.map(async ([expectedException, queryString, ...queryArgs]) => {
      expect(async () => {
        const filtered = realm.objects(objectSchema).filtered(queryString, ...queryArgs);
        await filtered.subscribe({ behavior: WaitForSync.Always });
      }).throws(
        expectedException,
        `Expected exception not thrown for query: ${queryString} ${JSON.stringify(queryArgs)}`,
      );
    }),
  );
};

/**
 * Helper method which runs an array of queries and asserts the results' provided [propertyToCompare]
 * field to equal the given expected result array's values.
 * For example: (r, "Obj", "intCol" [[3, 4], "intCol > 2]) => querying "intCol > 2" should
 * return results whose elements' intCol property values are 3 and 4.
 */
const expectQueryResultValues = (
  realm: Realm,
  objectSchema: Realm.ObjectClass,
  propertyToCompare: string,
  queryResultPairs: QueryResultsPair[],
) => {
  return Promise.all(
    queryResultPairs.map(async ([expectedResults, queryString, ...queryArgs]) => {
      const filtered = realm.objects(objectSchema).filtered(queryString, ...queryArgs);
      await filtered.subscribe({ behavior: WaitForSync.Always });
      expect(filtered.length).to.equal(expectedResults.length);
      expect(filtered.map((el) => (el as any)[propertyToCompare])).to.deep.equal(
        expectedResults,
        `
      Expected results not returned from query: ${queryString} ${JSON.stringify(queryArgs)},
    `,
      );
      await tearDownSubscription(filtered, realm);
    }),
  );
};

describe(`GeoSpatial`, () => {
  importAppBefore(buildAppConfig("with-flx").anonAuth().flexibleSync());
  authenticateUserBefore();

  const realmConfig: Partial<OpenRealmConfiguration> = {
    schema: [PointOfInterest, MyGeoPoint.schema],
    sync: { flexible: true },
  };

  openRealmBeforeEach(realmConfig);

  const zero: IPointOfInterest = {
    _id: 1,
    location: new MyGeoPoint(0, 0),
  };

  const poiA: IPointOfInterest = {
    _id: 2,
    location: new MyGeoPoint(50.5, 50.5),
  };

  const poiB: IPointOfInterest = {
    _id: 3,
    location: new MyGeoPoint(40, -40),
  };

  const poiC: IPointOfInterest = {
    _id: 4,
    location: new MyGeoPoint(-30, -30.5),
  };

  const poiD: IPointOfInterest = {
    _id: 5,
    location: new MyGeoPoint(-25, 25),
  };

  const northPole: IPointOfInterest = {
    _id: 6,
    location: new MyGeoPoint(0.01, 89.9),
  };

  const invalid: IPointOfInterest = {
    _id: 7,
    location: new MyGeoPoint(2129.01, 89.9),
  };

  function geoTest(realm: Realm, geo: GeoCircle | GeoBox | GeoPolygon, pois: IPointOfInterest[]) {
    const poiIds = pois.map((p) => p._id);
    return expectQueryResultValues(realm, PointOfInterest, "_id", [
      [poiIds, "location geoWithin $0 SORT(_id ASC)", geo],
    ]);
  }

  function geoException(realm: Realm, geo: GeoCircle | GeoBox | GeoPolygon, exception: string) {
    expectQueryException(realm, PointOfInterest, [[exception, "location geoWithin $0 SORT(_id ASC)", geo]]);
  }

  beforeEach(async function (this: RealmContext | UserContext) {
    const poi = this.realm.objects(PointOfInterest);
    await poi.subscribe();

    // Reuse these if they already exist.
    if (poi.length === 0) {
      this.realm.write(() => {
        this.realm.create(PointOfInterest, zero);
        this.realm.create(PointOfInterest, poiA);
        this.realm.create(PointOfInterest, poiB);
        this.realm.create(PointOfInterest, poiC);
        this.realm.create(PointOfInterest, poiD);
        this.realm.create(PointOfInterest, northPole);
        this.realm.create(PointOfInterest, invalid);
      });
    }

    // User is automatically added by the hook, so if we want to mimic this config
    // we will need to remake it with the current user.
    const fullConfig = {
      ...realmConfig,
      sync: { ...realmConfig.sync, user: this.user },
    } as unknown as Realm.ConfigurationWithSync;

    // Make sure the write operations land in the sync server.
    await this.realm.syncSession?.uploadAllLocalChanges();

    poi.unsubscribe();
    this.realm.close();

    // Delete the local realm so that we start with a clean slate for testing sync
    Realm.deleteFile(fullConfig);

    // Reset the local realm
    this.realm = await Realm.open(fullConfig);

    expect(this.realm.objects(PointOfInterest).length).to.equal(0);
  });

  describe("Base cases", () => {
    it("GeoCircle basic", async function (this: RealmContext) {
      let circle: GeoCircle = {
        center: [0, 0],
        distance: 0.001,
      };

      let queryResultsIds = [zero._id];

      await expectQueryResultValues(this.realm, PointOfInterest, "_id", [
        [queryResultsIds, "location geoWithin $0 SORT(_id ASC)", circle],
      ]);
      await expectQueryResultValues(this.realm, PointOfInterest, "_id", [
        [queryResultsIds, "location geoWithin geoCircle([0, 0], 0.001) SORT(_id ASC)"],
      ]);

      circle = {
        center: [2.34, -4.6],
        distance: 1.5,
      };

      queryResultsIds = [zero, poiA, poiB, poiC, poiD].map((p) => p._id);

      await expectQueryResultValues(this.realm, PointOfInterest, "_id", [
        [queryResultsIds, "location geoWithin $0 SORT(_id ASC)", circle],
      ]);
      await expectQueryResultValues(this.realm, PointOfInterest, "_id", [
        [queryResultsIds, "location geoWithin geoCircle([2.34, -4.6], 1.5) SORT(_id ASC)"],
      ]);

      circle = {
        center: [-32.34, -25],
        distance: 0.5,
      };

      queryResultsIds = [poiC._id];

      await expectQueryResultValues(this.realm, PointOfInterest, "_id", [
        [queryResultsIds, "location geoWithin $0 SORT(_id ASC)", circle],
      ]);
      await expectQueryResultValues(this.realm, PointOfInterest, "_id", [
        [queryResultsIds, "location geoWithin geoCircle([-32.34, -25.0], 0.5) SORT(_id ASC)"],
      ]);

      circle = {
        center: [-75.234, 45.023],
        distance: 0.01,
      };

      await expectQueryLength(this.realm, PointOfInterest, [[0, "location geoWithin $0 SORT(_id ASC)", circle]]);
      await expectQueryLength(this.realm, PointOfInterest, [
        [0, "location geoWithin geoCircle([-75.234, 45.023], 0.01) SORT(_id ASC)"],
      ]);
    });

    it("GeoBox basic", async function (this: RealmContext) {
      let box: GeoBox = {
        bottomLeft: [-1, -1],
        topRight: [1, 1],
      };

      let queryResultsIds = [zero._id];

      await expectQueryResultValues(this.realm, PointOfInterest, "_id", [
        [queryResultsIds, "location geoWithin $0 SORT(_id ASC)", box],
      ]);
      await expectQueryResultValues(this.realm, PointOfInterest, "_id", [
        [queryResultsIds, "location geoWithin geoBox([-1.0, -1.0], [1.0, 1.0]) SORT(_id ASC)"],
      ]);

      box = {
        bottomLeft: [-90.23, -80.25],
        topRight: [85.24, 88.0],
      };

      queryResultsIds = [zero, poiA, poiB, poiC, poiD, northPole].map((p) => p._id);

      await expectQueryResultValues(this.realm, PointOfInterest, "_id", [
        [queryResultsIds, "location geoWithin $0 SORT(_id ASC)", box],
      ]);
      await expectQueryResultValues(this.realm, PointOfInterest, "_id", [
        [queryResultsIds, "location geoWithin geoBox([-90.23, -80.25], [85.24, 88.0]) SORT(_id ASC)"],
      ]);

      box = {
        bottomLeft: [30, -50],
        topRight: [45, -35],
      };

      queryResultsIds = [poiB._id];

      await expectQueryResultValues(this.realm, PointOfInterest, "_id", [
        [queryResultsIds, "location geoWithin $0 SORT(_id ASC)", box],
      ]);
      await expectQueryResultValues(this.realm, PointOfInterest, "_id", [
        [queryResultsIds, "location geoWithin geoBox([30.0, -50.0], [45.0, -35.0]) SORT(_id ASC)"],
      ]);

      box = {
        bottomLeft: [-45.05, -10.2],
        topRight: [-35.24, 5.02],
      };

      await expectQueryLength(this.realm, PointOfInterest, [[0, "location geoWithin $0 SORT(_id ASC)", box]]);
      await expectQueryLength(this.realm, PointOfInterest, [
        [0, "location geoWithin geoBox([-45.05, -10.2], [-35.24, 5.02]) SORT(_id ASC)"],
      ]);
    });

    it("GeoPolygon basic", async function (this: RealmContext) {
      let polygon: GeoPolygon = {
        outerRing: [
          [-2, -2],
          [3.45, -4.23],
          [2.56, 4.62],
          [-3.23, 2.5],
          [-2, -2],
        ],
      };

      let queryResultsIds = [zero._id];

      await expectQueryResultValues(this.realm, PointOfInterest, "_id", [
        [queryResultsIds, "location geoWithin $0 SORT(_id ASC)", polygon],
      ]);
      await expectQueryResultValues(this.realm, PointOfInterest, "_id", [
        [
          queryResultsIds,
          "location geoWithin geoPolygon({[-2.0, -2.0], [3.45, -4.23], [2.56, 4.62], [-3.23, 2.5], [-2.0, -2.0]}) SORT(_id ASC)",
        ],
      ]);

      polygon = {
        outerRing: [
          [50, -50],
          [55, 55],
          [1, 1],
          [50, -50],
        ],
      };

      queryResultsIds = [poiA, poiB].map((p) => p._id);

      await expectQueryResultValues(this.realm, PointOfInterest, "_id", [
        [queryResultsIds, "location geoWithin $0 SORT(_id ASC)", polygon],
      ]);
      await expectQueryResultValues(this.realm, PointOfInterest, "_id", [
        [
          queryResultsIds,
          "location geoWithin geoPolygon({[50.0, -50.0], [55.0, 55.0], [1.0, 1.0], [50.0, -50.0]}) SORT(_id ASC)",
        ],
      ]);

      polygon = {
        outerRing: [
          [-20, -20],
          [-10, 10],
          [-50, 0],
          [-20, -20],
        ],
      };

      await expectQueryLength(this.realm, PointOfInterest, [[0, "location geoWithin $0 SORT(_id ASC)", polygon]]);
      await expectQueryLength(this.realm, PointOfInterest, [
        [0, "location geoWithin geoPolygon({[-20.0, -20.0], [-10.0, 10.0], [-50.0, 0], [-20.0, -20.0]}) SORT(_id ASC)"],
      ]);

      //With hole
      polygon = {
        outerRing: [
          [-44, -44],
          [44, -44],
          [44, 44],
          [-44, 44],
          [-44, -44],
        ],
        holes: [
          [
            [-1, -1],
            [-1, 1],
            [1, 1],
            [1, -1],
            [-1, -1],
          ],
        ],
      };

      queryResultsIds = [poiB, poiC, poiD].map((p) => p._id);

      await expectQueryResultValues(this.realm, PointOfInterest, "_id", [
        [queryResultsIds, "location geoWithin $0 SORT(_id ASC)", polygon],
      ]);
      await expectQueryResultValues(this.realm, PointOfInterest, "_id", [
        [
          queryResultsIds,
          "location geoWithin geoPolygon({[-44.0, -44.0], [44.0, -44.0], [44.0, 44.0], [-44.0, 44.0], [-44.0, -44.0]}, {[-1.0, -1.0], [-1.0, 1.0], [1.0, 1.0], [1.0, -1.0], [-1.0, -1.0]}) SORT(_id ASC)",
        ],
      ]);
    });

    it("Alternative GeoPoint", async function (this: RealmContext) {
      //Circle
      let circle: GeoCircle = {
        center: [-32.34, -25],
        distance: 0.5,
      };

      let queryResults = [poiC];

      await geoTest(this.realm, circle, queryResults);

      circle = {
        center: { latitude: -25, longitude: -32.34 },
        distance: 0.5,
      };

      await geoTest(this.realm, circle, queryResults);

      circle = {
        center: {
          coordinates: [-32.34, -25],
          type: "Point",
        },
        distance: 0.5,
      };

      await geoTest(this.realm, circle, queryResults);

      //Box
      const box: GeoBox = {
        bottomLeft: { latitude: -50, longitude: 30 },
        topRight: {
          coordinates: [45, -35],
          type: "Point",
        },
      };

      queryResults = [poiB];

      await geoTest(this.realm, box, queryResults);

      //Polygon
      const polygon: GeoPolygon = {
        outerRing: [
          [50, -50],
          { latitude: 55, longitude: 55 },
          {
            coordinates: [1, 1],
            type: "Point",
          },
          [50, -50],
        ],
      };

      queryResults = [poiA, poiB];

      await geoTest(this.realm, polygon, queryResults);
    });

    it("Alternative GeoPolygon", async function (this: RealmContext) {
      //Polygon
      let polygon: CanonicalGeoPolygon = {
        type: "Polygon",
        coordinates: [
          [
            [50, -50],
            [55, 55],
            [1, 1],
            [50, -50],
          ],
        ],
      };

      let queryResults = [poiA, poiB];

      await geoTest(this.realm, polygon, queryResults);

      //With hole
      polygon = {
        type: "Polygon",
        coordinates: [
          [
            [-44, -44],
            [44, -44],
            [44, 44],
            [-44, 44],
            [-44, -44],
          ],
          [
            [-1, -1],
            [-1, 1],
            [1, 1],
            [1, -1],
            [-1, -1],
          ],
        ],
      };

      queryResults = [poiB, poiC, poiD];

      await geoTest(this.realm, polygon, queryResults);
    });

    // Altitude throws an error in sync queries
    it("Altitude is supported but ignored", async function (this: RealmContext) {
      let box: GeoBox = {
        bottomLeft: [50, 50, 10],
        topRight: [52, 52, 10],
      };

      const queryResults = [poiA];

      await geoTest(this.realm, box, queryResults);

      box = {
        bottomLeft: { latitude: 50, longitude: 50, altitude: 10 },
        topRight: { latitude: 52, longitude: 52, altitude: 10 },
      };

      await geoTest(this.realm, box, queryResults);

      box = {
        bottomLeft: {
          coordinates: [50, 50, 10],
          type: "Point",
        },
        topRight: {
          coordinates: [52, 52, 10],
          type: "Point",
        },
      };

      await geoTest(this.realm, box, queryResults);
    });

    it("Coordinate Substitution", async function (this: RealmContext) {
      //Circle
      const circle: GeoCircle = {
        center: [0, 0],
        distance: 0.001,
      };

      let queryResultsIds = [zero._id];

      await expectQueryResultValues(this.realm, PointOfInterest, "_id", [
        [queryResultsIds, "location geoWithin $0 SORT(_id ASC)", circle],
      ]);
      await expectQueryResultValues(this.realm, PointOfInterest, "_id", [
        [queryResultsIds, "location geoWithin geoCircle([$0, $1], $2) SORT(_id ASC)", 0, 0, 0.001],
      ]);

      //Box
      const box = {
        bottomLeft: [-90.23, -80.25],
        topRight: [85.24, 88.0],
      };

      queryResultsIds = [zero, poiA, poiB, poiC, poiD, northPole].map((p) => p._id);

      await expectQueryResultValues(this.realm, PointOfInterest, "_id", [
        [queryResultsIds, "location geoWithin $0 SORT(_id ASC)", box],
      ]);
      await expectQueryResultValues(this.realm, PointOfInterest, "_id", [
        [queryResultsIds, "location geoWithin geoBox([$0, $1], [$2, $3]) SORT(_id ASC)", -90.23, -80.25, 85.24, 88.0],
      ]);

      //Polygon
      const polygon = {
        outerRing: [
          [50, -50],
          [55, 55],
          [1, 1],
          [50, -50],
        ],
      };

      queryResultsIds = [poiA, poiB].map((p) => p._id);

      await expectQueryResultValues(this.realm, PointOfInterest, "_id", [
        [queryResultsIds, "location geoWithin $0 SORT(_id ASC)", polygon, "_id"],
      ]);
      await expectQueryResultValues(this.realm, PointOfInterest, "_id", [
        [
          queryResultsIds,
          "location geoWithin geoPolygon({[$0, $1], [$2, $2], [$3, 3], [$0, $1]}) SORT(_id ASC)",
          50,
          -50,
          55,
          1,
        ],
      ]);
    });

    // Not sync relevant, so we can skip doing this twice
    it("Distance conversions", function (this: RealmContext) {
      //Test with about 60 centimeters accuracy
      const km = 20;
      expect(kmToRadians(km)).to.be.approximately(0.00313573007, 0.0000001);

      const mi = 20;
      expect(miToRadians(mi)).to.be.approximately(0.00504646838, 0.0000001);
    });

    it("List", async function (this: RealmContext) {
      const multi1: IPointOfInterest = {
        _id: 8,
        location: new MyGeoPoint(0, 0),
        locations: [new MyGeoPoint(56, 56), new MyGeoPoint(80, 80)],
      };

      const multi2: IPointOfInterest = {
        _id: 9,
        location: new MyGeoPoint(0, 0),
        locations: [new MyGeoPoint(-56, -56), new MyGeoPoint(-80, -80)],
      };

      const poi = this.realm.objects(PointOfInterest);

      await poi.subscribe();

      this.realm.write(() => {
        this.realm.create(PointOfInterest, multi1);
        this.realm.create(PointOfInterest, multi2);
      });

      tearDownSubscription(poi, this.realm);

      const box: GeoBox = {
        bottomLeft: [50, 50],
        topRight: [60, 60],
      };

      const queryResultsIds = [multi1._id];

      await expectQueryResultValues(this.realm, PointOfInterest, "_id", [
        [queryResultsIds, "locations geoWithin $0 SORT(_id ASC)", box],
      ]);
    });
  });

  describe("Complex cases", () => {
    it("Intersection queries", async function (this: RealmContext) {
      const polygon: GeoPolygon = {
        outerRing: [
          [50, -50],
          [55, 55],
          [1, 1],
          [50, -50],
        ],
      };

      await geoTest(this.realm, polygon, [poiA, poiB]);

      const box: GeoBox = {
        bottomLeft: [-74, 2],
        topRight: [60, 60],
      };

      geoTest(this.realm, box, [poiA, poiD]);

      await expectQueryResultValues(this.realm, PointOfInterest, "_id", [
        [[poiA._id], "location geoWithin $0 AND location geoWithin $1 SORT(_id ASC)", box, polygon],
      ]);
    });

    it("Circle around north pole", async function (this: RealmContext) {
      const circle: GeoCircle = {
        center: [0, 90],
        distance: 0.5,
      };

      await geoTest(this.realm, circle, [northPole]);
    });

    it("Small distances", async function (this: RealmContext) {
      const norreport = new MyGeoPoint(12.571545084046413, 55.683224550352314);

      const magasasaKodbyen: IPointOfInterest = {
        _id: 21,
        location: new MyGeoPoint(12.558892784045568, 55.66717839648401),
      };

      const slurpRamen: IPointOfInterest = {
        _id: 22,
        location: new MyGeoPoint(12.567200345741842, 55.68512265806895),
      };

      const poi = this.realm.objects(PointOfInterest);

      await poi.subscribe();

      this.realm.write(() => {
        this.realm.create(PointOfInterest, magasasaKodbyen);
        this.realm.create(PointOfInterest, slurpRamen);
      });

      tearDownSubscription(poi, this.realm);

      let circle: GeoCircle = {
        center: norreport,
        distance: kmToRadians(0.5),
      };

      await geoTest(this.realm, circle, [slurpRamen]);

      circle = {
        center: norreport,
        distance: kmToRadians(2.5),
      };

      await geoTest(this.realm, circle, [magasasaKodbyen, slurpRamen]);
    });

    it("Inverted polygon", async function (this: RealmContext) {
      let polygon: GeoPolygon = {
        outerRing: [
          [50, -50],
          [55, 55],
          [1, 1],
          [50, -50],
        ],
      };

      await geoTest(this.realm, polygon, [poiA, poiB]);

      //This test verifies that when a polygon covers more than one hemisphere (according to right-hand rule)
      //it is considered as an error and inverted by core.
      polygon = {
        outerRing: [
          [50, -50],
          [1, 1],
          [55, 55],
          [50, -50],
        ],
      };

      await geoTest(this.realm, polygon, [poiA, poiB]);
    });

    it("Polygon with multiple holes", async function (this: RealmContext) {
      const polygon: GeoPolygon = {
        outerRing: [
          [-44, -44],
          [44, -44],
          [44, 44],
          [-44, 44],
          [-44, -44],
        ],
        holes: [
          [
            [-1, -1],
            [-1, 1],
            [1, 1],
            [1, -1],
            [-1, -1],
          ],
          [
            [-31, -31],
            [-28, -31],
            [-28, -28],
            [-31, -28],
            [-31, -31],
          ],
        ],
      };

      await geoTest(this.realm, polygon, [poiB, poiD]);
    });
  });

  // Not sync relevant, so we can skip testing for these errors twice
  describe("Error cases", () => {
    it("Non-float arguments", function (this: RealmContext) {
      expectQueryException(this.realm, PointOfInterest, [
        [
          "Invalid predicate: 'location geoWithin geoBox([-45, -10.2], [-35.24, 5.02])': syntax error, unexpected number, expecting natural0 or float or argument",
          "location geoWithin geoBox([-45, -10.2], [-35.24, 5.02])",
        ],
      ]);
    });

    it("Negative circle radius", function (this: RealmContext) {
      const circle: GeoCircle = {
        center: [-32.34, -25],
        distance: -1.5,
      };

      geoException(
        this.realm,
        circle,
        "The Geospatial query argument region is invalid: 'The radius of a circle must be a non-negative number'",
      );
    });

    //TODO Re-enable after fix in core (https://github.com/realm/realm-core/pull/6703)
    it.skip("Impossible box", function (this: RealmContext) {
      const box: GeoBox = {
        bottomLeft: [1, 1],
        topRight: [-1, -1],
      };

      geoException(this.realm, box, "FILL WITH THE CORRECT EXCEPTION'");
    });

    it("Polygon with edges intersecting", function (this: RealmContext) {
      const polygon: GeoPolygon = {
        outerRing: [
          [50, -50],
          [55, 55],
          [-50, 50],
          [70, -25],
          [50, -50],
        ],
      };

      geoException(
        this.realm,
        polygon,
        "The Geospatial query argument region is invalid: 'Ring 0 is not valid: 'Edges 0 and 2 cross. Edge locations in degrees: [-50.0000000, 50.0000000]-[55.0000000, 55.0000000] and [50.0000000, -50.0000000]-[-25.0000000, 70.0000000]'",
      );
    });

    it("Open polygon", function (this: RealmContext) {
      const polygon: GeoPolygon = {
        outerRing: [
          [50, -50],
          [55, 55],
          [-50, 50],
          [70, -25],
        ],
      };

      geoException(
        this.realm,
        polygon,
        "The Geospatial query argument region is invalid: 'Ring is not closed, first vertex 'GeoPoint([50, -50])' does not equal last vertex 'GeoPoint([70, -25])'",
      );
    });

    it("Invalid points", function (this: RealmContext) {
      const circle: GeoCircle = {
        center: [-200, 200],
        distance: 1.5,
      };

      geoException(
        this.realm,
        circle,
        "The Geospatial query argument region is invalid: 'Longitude/latitude is out of bounds, lng: -200 lat: 200'",
      );

      const circleWithAltitude: GeoCircle = {
        center: [-20, 20, 12],
        distance: 1.5,
      };

      geoException(
        this.realm,
        circleWithAltitude,
        'Invalid query: invalid RQL for table "PointOfInterest": center of a geo circle must be specified with exactly 2 coordinates, found 3',
      );
    });
  });
});
