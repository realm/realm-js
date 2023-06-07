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
import Realm, {
  ObjectSchema,
  BSON,
  GeoBox,
  GeoCircle,
  GeoPolygon,
  CanonicalGeoPoint,
  GeoPosition,
  CanonicalGeoPolygon,
  kmToRadians,
  miToRadians,
} from "realm";
import { expect } from "chai";
import { openRealmBeforeEach } from "../hooks";
import { IPerson, PersonSchema } from "../schemas/person-and-dogs";
import { ContactSchema, IContact } from "../schemas/contact";

interface INullableTypesObject {
  boolCol?: boolean;
  intCol?: Realm.Types.Int;
  floatCol?: Realm.Types.Float;
  doubleCol?: Realm.Types.Double;
  stringCol?: Realm.Types.String;
  dateCol?: Realm.Types.Date;
  dataCol?: Realm.Types.Data;
  decimal128Col?: Realm.Types.Decimal128;
  objectIdCol?: Realm.Types.ObjectId;
  uuidCol?: Realm.Types.UUID;
}

class NullableTypesObject extends Realm.Object implements INullableTypesObject {
  boolCol?: boolean;
  intCol?: Realm.Types.Int;
  floatCol?: Realm.Types.Float;
  doubleCol?: Realm.Types.Double;
  stringCol?: Realm.Types.String;
  dateCol?: Realm.Types.Date;
  dataCol?: Realm.Types.Data;
  decimal128Col?: Realm.Types.Decimal128;
  objectIdCol?: Realm.Types.ObjectId;
  uuidCol?: Realm.Types.UUID;

  static schema = {
    name: "NullableTypesObject",
    properties: {
      boolCol: "bool?",
      intCol: "int?",
      floatCol: "float?",
      doubleCol: "double?",
      stringCol: "string?",
      dateCol: "date?",
      dataCol: "data?",
      decimal128Col: "decimal128?",
      objectIdCol: "objectId?",
      uuidCol: "uuid?",
    },
  };
}

interface IStory {
  title?: string;
  content?: string;
}

class Story extends Realm.Object<Story> implements IStory {
  title?: string;
  content?: string;

  static schema: ObjectSchema = {
    name: "Story",
    properties: {
      title: { type: "string" },
      content: { type: "string", indexed: "full-text" },
    },
    primaryKey: "title",
  };
}

class MyGeoPoint implements CanonicalGeoPoint {
  coordinates: GeoPosition;
  type = "Point" as const;

  constructor(long: number, lat: number) {
    this.coordinates = [long, lat];
  }

  static schema: ObjectSchema = {
    name: "MyGeoPoint",
    embedded: true,
    properties: {
      type: "string",
      coordinates: "double[]",
    },
  };
}

interface IPointOfInterest {
  id: number;
  location: MyGeoPoint;
}

class PointOfInterest extends Realm.Object implements IPointOfInterest {
  id = 0;
  location: MyGeoPoint = new MyGeoPoint(0, 0);

  static schema: ObjectSchema = {
    name: "PointOfInterest",
    properties: {
      id: "int",
      location: "MyGeoPoint",
    },
    primaryKey: "id",
  };
}

type QueryLengthPair = [ExpectedLength: number, Query: string, ...QueryArgs: Array<any>];
type QueryExceptionPair = [ExpectedException: string, Query: string, ...QueryArgs: Array<any>];
type QueryResultsPair = [ExpectedResults: any[], Query: string, ...QueryArgs: Array<any>];

/**
 * Helper method which runs an array of queries and asserts them to given expected length
 * For example: (r, "Obj", [1, "intCol == 0"]) => querying "intCol == 0" should return 1 elements.
 */
const expectQueryLength = (
  realm: Realm,
  objectSchema: string | Realm.ObjectClass,
  queryLengthPairs: QueryLengthPair[],
) => {
  queryLengthPairs.forEach(([expectedLength, queryString, ...queryArgs]) => {
    const filtered = realm.objects(objectSchema).filtered(queryString, ...queryArgs);
    expect(filtered.length).equal(
      expectedLength,
      `Expected length ${expectedLength} for query: ${queryString} ${JSON.stringify(queryArgs)}`,
    );
  });
};

/**
 * Helper method which runs an array of queries and asserts them to throw given exception.
 * For example: (r, "Obj", ["invalid", "intCol == #"]) => querying "intCol == #" should
 * throw an exception which includes the string "invalid".
 */
const expectQueryException = (
  realm: Realm,
  objectSchema: string | Realm.ObjectClass,
  queryExceptionPairs: QueryExceptionPair[],
) => {
  queryExceptionPairs.forEach(([expectedException, queryString, ...queryArgs]) => {
    expect(() => {
      realm.objects(objectSchema).filtered(queryString, ...queryArgs);
    }).throws(
      expectedException,
      `Expected exception not thrown for query: ${queryString} ${JSON.stringify(queryArgs)}`,
    );
  });
};

/**
 * Helper method which runs an array of queries and asserts the results' provided [propertyToCompare]
 * field to equal the given expected result array's values.
 * For example: (r, "Obj", "intCol" [[3, 4], "intCol > 2]) => querying "intCol > 2" should
 * return results whose elements' intCol property values are 3 and 4.
 */
const expectQueryResultValues = (
  realm: Realm,
  objectSchema: string | Realm.ObjectClass,
  propertyToCompare: string,
  queryResultPairs: QueryResultsPair[],
) => {
  queryResultPairs.forEach(([expectedResults, queryString, ...queryArgs]) => {
    let results = realm.objects<any>(objectSchema);
    results = results.filtered(queryString, ...queryArgs);
    //console.log(results.map((el) => el[propertyToCompare])); //TODO For testing
    expect(expectedResults.length).equals(results.length);
    expect(expectedResults).to.deep.equal(
      results.map((el) => el[propertyToCompare]),
      `
      Expected results not returned from query: ${queryString} ${JSON.stringify(queryArgs)}, 
    `,
    );
  });
};

describe.only("Queries", () => {
  describe("GeoSpatial", () => {
    openRealmBeforeEach({ schema: [PointOfInterest, MyGeoPoint.schema] });
    const zero: IPointOfInterest = {
      id: 1,
      location: new MyGeoPoint(0, 0),
    };

    const poiA: IPointOfInterest = {
      id: 2,
      location: new MyGeoPoint(50.5, 50.5),
    };

    const poiB: IPointOfInterest = {
      id: 3,
      location: new MyGeoPoint(40, -40),
    };

    const poiC: IPointOfInterest = {
      id: 4,
      location: new MyGeoPoint(-30, -30.5),
    };

    const poiD: IPointOfInterest = {
      id: 5,
      location: new MyGeoPoint(-25, 25),
    };

    function geoTest(realm: Realm, geo: GeoCircle | GeoBox | GeoPolygon, pois: IPointOfInterest[]) {
      const poiIds = pois.map((p) => p.id);
      expectQueryResultValues(realm, PointOfInterest, "id", [[poiIds, "location geoWithin $0 SORT(id ASC)", geo]]);
    }

    function geoException(realm: Realm, geo: GeoCircle | GeoBox | GeoPolygon, exception: string) {
      expectQueryException(realm, PointOfInterest, [[exception, "location geoWithin $0 SORT(id ASC)", geo]]);
    }

    beforeEach(function (this: RealmContext) {
      this.realm.write(() => {
        this.realm.create("PointOfInterest", zero);
        this.realm.create("PointOfInterest", poiA);
        this.realm.create("PointOfInterest", poiB);
        this.realm.create("PointOfInterest", poiC);
        this.realm.create("PointOfInterest", poiD);
      });
    });

    describe("Base cases", () => {
      it("GeoCircle basic", function (this: RealmContext) {
        let circle: GeoCircle = {
          center: [0, 0],
          distance: 0.001,
        };

        let queryResultsIds = [zero.id];

        expectQueryResultValues(this.realm, PointOfInterest, "id", [
          [queryResultsIds, "location geoWithin $0 SORT(id ASC)", circle, "id"],
        ]);
        expectQueryResultValues(this.realm, PointOfInterest, "id", [
          [queryResultsIds, "location geoWithin geoSphere([0, 0], 0.001) SORT(id ASC)"],
        ]);
        //TODO After merging from core this should go back in and be added to all other tests
        // expectQueryResultValues(this.realm, PointOfInterest, "id", [
        //   [queryResultsIds, "location geoWithin geoSphere([$0, $1], $2) SORT(id ASC)", 0, 0, 0.001],
        // ]);

        circle = {
          center: [2.34, -4.6],
          distance: 10,
        };

        queryResultsIds = [zero, poiA, poiB, poiC, poiD].map((p) => p.id);

        expectQueryResultValues(this.realm, PointOfInterest, "id", [
          [queryResultsIds, "location geoWithin $0 SORT(id ASC)", circle, "id"],
        ]);
        expectQueryResultValues(this.realm, PointOfInterest, "id", [
          [queryResultsIds, "location geoWithin geoSphere([2.34, -4.6], 10) SORT(id ASC)"],
        ]);

        circle = {
          center: [-32.34, -25],
          distance: 0.5,
        };

        queryResultsIds = [poiC.id];

        expectQueryResultValues(this.realm, PointOfInterest, "id", [
          [queryResultsIds, "location geoWithin $0 SORT(id ASC)", circle, "id"],
        ]);
        expectQueryResultValues(this.realm, PointOfInterest, "id", [
          [queryResultsIds, "location geoWithin geoSphere([-32.34, -25.0], 0.5) SORT(id ASC)"],
        ]);

        circle = {
          center: [-75.234, 120.023],
          distance: 0.01,
        };

        expectQueryLength(this.realm, PointOfInterest, [[0, "location geoWithin $0 SORT(id ASC)", circle, "id"]]);
        expectQueryLength(this.realm, PointOfInterest, [
          [0, "location geoWithin geoSphere([-75.234, 120.023], 0.01) SORT(id ASC)"],
        ]);
      });

      it("GeoBox basic", function (this: RealmContext) {
        let box: GeoBox = {
          bottomLeft: [-1, -1],
          topRight: [1, 1],
        };

        let queryResultsIds = [zero.id];

        expectQueryResultValues(this.realm, PointOfInterest, "id", [
          [queryResultsIds, "location geoWithin $0 SORT(id ASC)", box, "id"],
        ]);
        expectQueryResultValues(this.realm, PointOfInterest, "id", [
          [queryResultsIds, "location geoWithin geoBox([-1.0, -1.0], [1.0, 1.0]) SORT(id ASC)"],
        ]);
        // expectQueryResultValues(this.realm, PointOfInterest, "id", [
        //   [queryResultsIds, "location geoWithin geoSphere([$0, $1], $2) SORT(id ASC)", 0, 0, 0.001],
        // ]);

        box = {
          bottomLeft: [-90.23, -80.25],
          topRight: [85.24, 88.0],
        };

        queryResultsIds = [zero, poiA, poiB, poiC, poiD].map((p) => p.id);

        expectQueryResultValues(this.realm, PointOfInterest, "id", [
          [queryResultsIds, "location geoWithin $0 SORT(id ASC)", box, "id"],
        ]);
        expectQueryResultValues(this.realm, PointOfInterest, "id", [
          [queryResultsIds, "location geoWithin geoBox([-90.23, -80.25], [85.24, 88.0]) SORT(id ASC)"],
        ]);

        box = {
          bottomLeft: [30, -50],
          topRight: [45, -35],
        };

        queryResultsIds = [poiB.id];

        expectQueryResultValues(this.realm, PointOfInterest, "id", [
          [queryResultsIds, "location geoWithin $0 SORT(id ASC)", box, "id"],
        ]);
        expectQueryResultValues(this.realm, PointOfInterest, "id", [
          [queryResultsIds, "location geoWithin geoBox([30.0, -50.0], [45.0, -35.0]) SORT(id ASC)"],
        ]);

        box = {
          bottomLeft: [-45.05, -10.2],
          topRight: [-35.24, 5.02],
        };

        expectQueryLength(this.realm, PointOfInterest, [[0, "location geoWithin $0 SORT(id ASC)", box, "id"]]);
        expectQueryLength(this.realm, PointOfInterest, [
          [0, "location geoWithin geoBox([-45.05, -10.2], [-35.24, 5.02]) SORT(id ASC)"],
        ]);
      });

      it("GeoPolygon basic", function (this: RealmContext) {
        let polygon: GeoPolygon = {
          outerRing: [
            [-2, -2],
            [3.45, -4.23],
            [2.56, 4.62],
            [-3.23, 2.5],
            [-2, -2],
          ],
        };

        let queryResultsIds = [zero.id];

        expectQueryResultValues(this.realm, PointOfInterest, "id", [
          [queryResultsIds, "location geoWithin $0 SORT(id ASC)", polygon, "id"],
        ]);
        expectQueryResultValues(this.realm, PointOfInterest, "id", [
          [
            queryResultsIds,
            "location geoWithin geoPolygon({[-2.0, -2.0], [3.45, -4.23], [2.56, 4.62], [3.23, 2.5], [-2.0, 2.0]}) SORT(id ASC)",
          ],
        ]);
        // expectQueryResultValues(this.realm, PointOfInterest, "id", [
        //   [queryResultsIds, "location geoWithin geoSphere([$0, $1], $2) SORT(id ASC)", 0, 0, 0.001],
        // ]);

        polygon = {
          outerRing: [
            [50, -50],
            [55, 55],
            [1, 1],
            [50, -50],
          ],
        };

        queryResultsIds = [poiA, poiB].map((p) => p.id);

        expectQueryResultValues(this.realm, PointOfInterest, "id", [
          [queryResultsIds, "location geoWithin $0 SORT(id ASC)", polygon, "id"],
        ]);
        expectQueryResultValues(this.realm, PointOfInterest, "id", [
          [
            queryResultsIds,
            "location geoWithin geoPolygon({[50.0, -50.0], [55.0, 55.0], [1.0, 1.0], [50.0, -50.0]}) SORT(id ASC)",
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

        expectQueryLength(this.realm, PointOfInterest, [[0, "location geoWithin $0 SORT(id ASC)", polygon, "id"]]);
        expectQueryLength(this.realm, PointOfInterest, [
          [
            0,
            "location geoWithin geoPolygon({[-20.0, -20.0], [-10.0, 10.0], [-50.0, 0], [-20.0, -20.0]}) SORT(id ASC)",
          ],
        ]);

        //TODO After core update I need to uncomment this, to see if it works
        //With hole
        // polygon = {
        //   outerRing: [
        //     [-44, -44],
        //     [44, -44],
        //     [44, 44],
        //     [-44, 44],
        //     [-44, -44],
        //   ],
        //   holes: [
        //     [
        //       [-1, -1],
        //       [-1, 1],
        //       [1, 1],
        //       [1, -1],
        //       [-1, -1],
        //     ],
        //   ],
        // };

        // queryResultsIds = [poiB, poiC, poiD].map((p) => p.id);

        // expectQueryResultValues(this.realm, PointOfInterest, "id", [
        //   [queryResultsIds, "location geoWithin $0 SORT(id ASC)", polygon, "id"],
        // ]);
        // expectQueryResultValues(this.realm, PointOfInterest, "id", [
        //   [
        //     queryResultsIds,
        //     "location geoWithin geoPolygon({[-44.0, -44.0], [44.0, -44.0], [44.0, 44.0], [-44.0, 44.0], [-44.0, -44.0]}, {[-1.0, -1.0], [-1.0, 1.0], [1.0, 1.0], [1.0, -1.0], [-1.0, -1.0]}) SORT(id ASC)",
        //   ],
        // ]);
      });

      it("Alternative GeoPoint", function (this: RealmContext) {
        //Circle
        let circle: GeoCircle = {
          center: [-32.34, -25],
          distance: 0.5,
        };

        let queryResults = [poiC];

        geoTest(this.realm, circle, queryResults);

        circle = {
          center: { latitude: -25, longitude: -32.34 },
          distance: 0.5,
        };

        geoTest(this.realm, circle, queryResults);

        circle = {
          center: {
            coordinates: [-32.34, -25],
            type: "Point",
          },
          distance: 0.5,
        };

        geoTest(this.realm, circle, queryResults);

        //Box
        const box: GeoBox = {
          bottomLeft: { latitude: -50, longitude: 30 },
          topRight: {
            coordinates: [45, -35],
            type: "Point",
          },
        };

        queryResults = [poiB];

        geoTest(this.realm, box, queryResults);

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

        geoTest(this.realm, polygon, queryResults);
      });

      it("Alternative GeoPolygon", function (this: RealmContext) {
        //Polygon
        const polygon: CanonicalGeoPolygon = {
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

        const queryResults = [poiA, poiB];

        geoTest(this.realm, polygon, queryResults);

        //TODO Add test with hole
      });

      it("Distance conversions", function (this: RealmContext) {
        //Test with about 60 centimeters accuracy
        const km = 20;
        expect(kmToRadians(km)).to.be.approximately(0.00313573007, 0.0000001);

        const mi = 20;
        expect(miToRadians(mi)).to.be.approximately(0.00504646838, 0.0000001);
      });
    });

    describe("Error cases", () => {
      it("Negative circle radius", function (this: RealmContext) {
        //Circle
        const circle: GeoCircle = {
          center: [-32.34, -25],
          distance: -1.5,
        };

        //TODO Why this doesn't give error????
        // geoException(this.realm, circle, "");
      });

      it("Out of bounds points", function (this: RealmContext) {
        //Circle
        const circle: GeoCircle = {
          center: [-200, 200],
          distance: 1.5,
        };

        //TODO Why it's not throwing errors???
        expectQueryException(this.realm, PointOfInterest, [
          ["Column has no fulltext index", "location geoWithin geoBox([-190.0, -1.0], [1.0, 1.0]) SORT(id ASC)"],
        ]);

        expectQueryException(this.realm, PointOfInterest, [
          ["Column has no fulltext index", "location geoWithin geoSphere([2220, 2220], -0.001) SORT(id ASC)"],
        ]);

        //TODO Why this doesn't give error????
        // geoException(this.realm, circle, "");
      });
    });
  });

  describe("Full text search", () => {
    openRealmBeforeEach({ schema: [Story] });

    const story1: IStory = {
      title: "Dogs and cats",
      content: "A short story about a dog running after two cats",
    };

    const story2: IStory = {
      title: "Adventure",
      content: "A novel about two friends looking for a treasure",
    };

    const story3: IStory = {
      title: "A friend",
      content: "A short poem about friendship",
    };

    const story4: IStory = {
      title: "Lord of the rings",
      content: "A long story about the quest for a ring",
    };

    beforeEach(function (this: RealmContext) {
      this.realm.write(() => {
        this.realm.create("Story", story1);
        this.realm.create("Story", story2);
        this.realm.create("Story", story3);
        this.realm.create("Story", story4);
      });
    });

    it("single term", function (this: RealmContext) {
      expectQueryResultValues(this.realm, Story, "title", [[[story1.title], "content TEXT 'cats'"]]);
      expectQueryResultValues(this.realm, Story, "title", [[[story1.title, story4.title], "content TEXT 'story'"]]);
    });

    it("multiple terms", function (this: RealmContext) {
      expectQueryResultValues(this.realm, Story, "title", [[[story1.title], "content TEXT 'two dog'"]]);
      expectQueryResultValues(this.realm, Story, "title", [[[story3.title], "content TEXT 'poem short friendship'"]]);
      expectQueryResultValues(this.realm, Story, "title", [
        [[story1.title, story2.title, story3.title, story4.title], "content TEXT 'about a'"],
      ]);
    });

    it("exclude term", function (this: RealmContext) {
      expectQueryResultValues(this.realm, Story, "title", [[[story4.title], "content TEXT 'story -cats'"]]);
    });

    it("empty results", function (this: RealmContext) {
      expectQueryResultValues(this.realm, Story, "title", [[[], "content TEXT 'two dog friends'"]]);
      expectQueryResultValues(this.realm, Story, "title", [[[], "content TEXT 'amazing'"]]);
    });

    it("query parameters", function (this: RealmContext) {
      expectQueryResultValues(this.realm, Story, "title", [[[story1.title], "content TEXT $0", "cats"]]);
      expectQueryResultValues(this.realm, Story, "title", [[[story1.title], "content TEXT $0", "two dog"]]);
      expectQueryResultValues(this.realm, Story, "title", [[[story4.title], "content TEXT $0", "story -cats"]]);

      expectQueryResultValues(this.realm, Story, "title", [[[story1.title], "content TEXT $0", "'cats'"]]);
      expectQueryResultValues(this.realm, Story, "title", [[[story1.title], "content TEXT $0", "'two dog'"]]);
      expectQueryResultValues(this.realm, Story, "title", [[[story4.title], "content TEXT $0", "'story -cats'"]]);
    });

    it("throws on column with no index", function (this: RealmContext) {
      expectQueryException(this.realm, Story, [["Column has no fulltext index", "title TEXT 'cats'"]]);
    });
  });

  describe("Basic types", () => {
    openRealmBeforeEach({ schema: [NullableTypesObject] });

    describe("querying with boolean", () => {
      beforeEach(function (this: RealmContext) {
        this.realm.write(() => {
          this.realm.create<INullableTypesObject>("NullableTypesObject", { boolCol: false });
          this.realm.create<INullableTypesObject>("NullableTypesObject", { boolCol: true });
          this.realm.create<INullableTypesObject>("NullableTypesObject", { boolCol: true });
          this.realm.create<INullableTypesObject>("NullableTypesObject", { boolCol: undefined });
        });
      });

      it("returns correct length", function (this: RealmContext) {
        expectQueryLength(this.realm, NullableTypesObject, [
          [2, "boolCol == true"],
          [1, "boolCol==false"],
          [2, "boolCol != true"],
          [2, "true == boolCol"],
          [2, "boolCol == TRUE"],
          [1, "boolCol == FALSE"],
          [0, "boolCol >  true"],
          [2, "boolCol >= true"],
          [1, "boolCol <  true"],
          [3, "boolCol <= true"],
          [0, "boolCol == true && boolCol == false"],
          [3, "boolCol == true || boolCol == false"],
          [2, "boolCol == $0", true],
          [1, "boolCol == $0", false],

          [3, "boolCol != null"],
          [1, "boolCol == $0", null],
        ]);
      });

      it("throws with invalid queries", function (this: RealmContext) {
        expectQueryException(this.realm, NullableTypesObject, [
          ["Unsupported comparison between type", "boolCol == 0"],
          ["Unsupported comparison between type", "boolCol == 1"],
          ["Unsupported comparison between type", "boolCol == 'not a bool'"],
          ["Unsupported comparison between type", "boolCol == $0", "not a bool"],
          ["Unsupported comparison operator", "boolCol BEGINSWITH true"],
          ["Unsupported comparison operator", "boolCol CONTAINS true"],
          ["Unsupported comparison operator", "boolCol ENDSWITH true"],
        ]);
      });
    });

    describe("querying with date", () => {
      beforeEach(function (this: RealmContext) {
        this.realm.write(() => {
          this.realm.create<INullableTypesObject>("NullableTypesObject", { dateCol: new Date(0) });
          this.realm.create<INullableTypesObject>("NullableTypesObject", { dateCol: new Date(1) });
          this.realm.create<INullableTypesObject>("NullableTypesObject", { dateCol: new Date(2) });
          this.realm.create<INullableTypesObject>("NullableTypesObject", { dateCol: undefined });
        });
      });

      it("returns correct length", function (this: RealmContext) {
        expectQueryLength(this.realm, NullableTypesObject, [
          [2, "dateCol < $0", new Date(2)],
          [3, "dateCol <= $0", new Date(2)],
          [2, "dateCol > $0", new Date(0)],
          [3, "dateCol >= $0", new Date(0)],
          [1, "dateCol == $0", new Date(0)],
          [3, "dateCol != $0", new Date(0)],

          [3, "dateCol != null"],
          [1, "dateCol == $0", null],
        ]);
      });

      it("throws with invalid queries", function (this: RealmContext) {
        expectQueryException(this.realm, NullableTypesObject, [
          ["Unsupported comparison between type", "dateCol == 'not a date'"],
          ["Unsupported comparison between type", "dateCol == 1"],
          ["Unsupported comparison between type", "dateCol == $0", 1],
        ]);
      });
    });

    describe("querying with integer", () => {
      beforeEach(function (this: RealmContext) {
        this.realm.write(() => {
          this.realm.create<INullableTypesObject>("NullableTypesObject", { intCol: -1 });
          this.realm.create<INullableTypesObject>("NullableTypesObject", { intCol: 0 });
          this.realm.create<INullableTypesObject>("NullableTypesObject", { intCol: 100 });
          this.realm.create<INullableTypesObject>("NullableTypesObject", { intCol: undefined });
        });
      });

      it("returns correct length", function (this: RealmContext) {
        expectQueryLength(this.realm, NullableTypesObject, [
          [1, "intCol == -1"],
          [1, "intCol==0"],
          [0, "1 == intCol"],
          [3, "intCol != 0"],
          [2, "intCol > -1"],
          [3, "intCol >= -1"],
          [2, "intCol < 100"],
          [3, "intCol <= 100"],
          [1, "intCol > 0x1F"],
          [1, "intCol == $0", 100],
          [2, "intCol >= 0 LIMIT(2)"],

          [3, "intCol != null"],
          [1, "intCol == $0", null],
        ]);
      });

      it("throws with invalid queries", function (this: RealmContext) {
        expectQueryException(this.realm, NullableTypesObject, [
          ["Unsupported comparison between type", "intCol == false"],
          ["Cannot convert", "intCol == 'not an int'"],
          ["Unsupported comparison between type", "intCol == $0", "not an int"],
          ["Unsupported comparison operator", "intCol BEGINSWITH 1"],
          ["Unsupported comparison operator", "intCol CONTAINS 1"],
          ["Unsupported comparison operator", "intCol ENDSWITH 1"],
        ]);
      });
    });

    describe("querying with float", () => {
      beforeEach(function (this: RealmContext) {
        this.realm.write(() => {
          this.realm.create<INullableTypesObject>("NullableTypesObject", { floatCol: -1.001 });
          this.realm.create<INullableTypesObject>("NullableTypesObject", { floatCol: 0.0 });
          this.realm.create<INullableTypesObject>("NullableTypesObject", { floatCol: 100.2 });
          this.realm.create<INullableTypesObject>("NullableTypesObject", { floatCol: undefined });
        });
      });

      it("returns correct length", function (this: RealmContext) {
        expectQueryLength(this.realm, NullableTypesObject, [
          [1, "floatCol == -1.001"],
          [1, "floatCol = 0"],
          [0, "floatCol == 1"],
          [3, "floatCol != 0"],
          [2, "floatCol > -1.001"],
          [3, "floatCol >= -1.001"],
          [2, "floatCol < 100.2"],
          [3, "floatCol <= 100.2"],
          [1, "floatCol > 0x1F"],
          [1, "floatCol == $0", 100.2],
          [2, "floatCol >= 0.0"],

          [3, "floatCol != null"],
          [1, "floatCol == $0", null],

          [2, "floatCol = 0.0 || floatCol = 100.2"],
          [1, "floatCol = 0.0 || floatCol = -1.0"],
          [0, "floatCol = 10.0 || floatCol = 20.0"],
        ]);
      });

      it("throws with invalid queries", function (this: RealmContext) {
        expectQueryException(this.realm, NullableTypesObject, [
          ["Unsupported comparison between type", "floatCol == false"],
          ["Cannot convert", "floatCol == 'not a float'"],
          ["Unsupported comparison between type", "floatCol == $0", "not a float"],
          ["Unsupported comparison operator", "floatCol BEGINSWITH 1"],
          ["Unsupported comparison operator", "floatCol CONTAINS 1"],
          ["Unsupported comparison operator", "floatCol ENDSWITH 1"],
        ]);
      });
    });

    describe("querying with double", () => {
      beforeEach(function (this: RealmContext) {
        this.realm.write(() => {
          this.realm.create<INullableTypesObject>("NullableTypesObject", { doubleCol: -1.001 });
          this.realm.create<INullableTypesObject>("NullableTypesObject", { doubleCol: 0.0 });
          this.realm.create<INullableTypesObject>("NullableTypesObject", { doubleCol: 100.2 });
          this.realm.create<INullableTypesObject>("NullableTypesObject", { doubleCol: undefined });
        });
      });

      it("returns correct length", function (this: RealmContext) {
        expectQueryLength(this.realm, NullableTypesObject, [
          [1, "doubleCol == -1.001"],
          [1, "doubleCol == 0"],
          [0, "1 == doubleCol"],
          [3, "doubleCol != 0"],
          [2, "doubleCol > -1.001"],
          [3, "doubleCol >= -1.001"],
          [2, "doubleCol < 100.2"],
          [3, "doubleCol <= 100.2"],
          [1, "doubleCol > 0x1F"],
          [1, "doubleCol == $0", 100.2],
          [2, "doubleCol >= 0.0 LIMIT(2)"],

          [3, "doubleCol != null"],
          [1, "doubleCol == $0", null],

          [2, "doubleCol = 0.0 || doubleCol = 100.2"],
          [1, "doubleCol = 0.0 || doubleCol = -1.0"],
          [0, "doubleCol = 10.0 || doubleCol = 20.0"],
          [2, "doubleCol = 0.0 || doubleCol = null"],
        ]);
      });

      it("throws with invalid queries", function (this: RealmContext) {
        expectQueryException(this.realm, NullableTypesObject, [
          ["Unsupported comparison between type", "doubleCol == false"],
          ["Cannot convert", "doubleCol == 'not a double'"],
          ["Unsupported comparison between type", "doubleCol == $0", "not a double"],
          ["Unsupported comparison operator", "doubleCol BEGINSWITH 1"],
          ["Unsupported comparison operator", "doubleCol CONTAINS 1"],
          ["Unsupported comparison operator", "doubleCol ENDSWITH 1"],
        ]);
      });
    });

    describe("querying with string", () => {
      beforeEach(function (this: RealmContext) {
        this.realm.write(() => {
          this.realm.create<INullableTypesObject>("NullableTypesObject", { stringCol: "A" });
          this.realm.create<INullableTypesObject>("NullableTypesObject", { stringCol: "a" });
          this.realm.create<INullableTypesObject>("NullableTypesObject", { stringCol: "a" });
          this.realm.create<INullableTypesObject>("NullableTypesObject", { stringCol: "C" });
          this.realm.create<INullableTypesObject>("NullableTypesObject", { stringCol: "c" });
          this.realm.create<INullableTypesObject>("NullableTypesObject", { stringCol: "abc" });
          this.realm.create<INullableTypesObject>("NullableTypesObject", { stringCol: "ABC" });
          this.realm.create<INullableTypesObject>("NullableTypesObject", { stringCol: "" });
          this.realm.create<INullableTypesObject>("NullableTypesObject", { stringCol: "\\\"\\n\\0\\r\\\\'" });
          this.realm.create<INullableTypesObject>("NullableTypesObject", { stringCol: undefined });
        });
      });

      it("returns correct length", function (this: RealmContext) {
        expectQueryLength(this.realm, NullableTypesObject, [
          [2, "stringCol == 'a'"],
          [1, "'c' == stringCol"],
          [2, 'stringCol == "a"'],
          [1, "stringCol=='abc'"],
          [1, "stringCol == ''"],
          [9, "stringCol != ''"],
          [1, 'stringCol == "\\"\\n\\0\\r\\\\\'"'],
          [3, "stringCol BEGINSWITH 'a'"],
          [1, "stringCol beginswith 'ab'"],
          [0, "stringCol BEGINSWITH 'abcd'"],
          [2, "stringCol BEGINSWITH 'A'"],
          [2, "stringCol ENDSWITH 'c'"],
          [1, "stringCol endswith 'bc'"],
          [9, "stringCol ENDSWITH ''"],
          [1, "stringCol CONTAINS 'b'"],
          [2, "stringCol contains 'c'"],
          [9, "stringCol CONTAINS ''"],
          [2, "stringCol == $0", "a"],
          [2, "stringCol ENDSWITH $0", "c"],
          [2, "stringCol BEGINSWITH 'a' LIMIT(2)"],
          [3, "stringCol ==[c] 'a'"],
          [5, "stringCol BEGINSWITH[c] 'A'"],
          [4, "stringCol ENDSWITH[c] 'c'"],
          [2, "stringCol CONTAINS[c] 'B'"],

          [1, "stringCol == $0", null],
          [1, "$0 == stringCol", null],
          [9, "stringCol != $0", null],

          [1, "stringCol == null"],
          [1, "null == stringCol"],
          [9, "stringCol != null"],
        ]);
      });

      it("throws with invalid queries", function (this: RealmContext) {
        expectQueryException(this.realm, NullableTypesObject, [
          ["Unsupported comparison between type", "stringCol == true"],
          ["Unsupported comparison between type", "stringCol == 123"],
          ["Unsupported comparison operator", "stringCol CONTAINS $0", 1],
        ]);
      });
    });

    describe("querying with data", () => {
      let objects: NullableTypesObject[];
      beforeEach(function (this: RealmContext) {
        objects = this.realm.write(() => {
          return [
            this.realm.create<INullableTypesObject>("NullableTypesObject", {
              dataCol: new Uint8Array([1, 100, 233, 255, 0]),
            }),
            this.realm.create<INullableTypesObject>("NullableTypesObject", { dataCol: new Uint8Array([1, 100]) }),
            this.realm.create<INullableTypesObject>("NullableTypesObject", { dataCol: new Uint8Array([100]) }),
            this.realm.create<INullableTypesObject>("NullableTypesObject", { dataCol: new Uint8Array([2]) }),
            this.realm.create<INullableTypesObject>("NullableTypesObject", { dataCol: new Uint8Array([255, 0]) }),
            this.realm.create<INullableTypesObject>("NullableTypesObject", { dataCol: undefined }),
          ];
        });
      });

      it("returns correct length", function (this: RealmContext) {
        expectQueryLength(this.realm, NullableTypesObject, [
          [1, "dataCol == $0", objects[1].dataCol],
          [1, "$0 == dataCol", objects[2].dataCol],
          [5, "dataCol != $0", objects[0].dataCol],
          [1, "dataCol BEGINSWITH $0", objects[0].dataCol],
          [2, "dataCol BEGINSWITH $0", objects[1].dataCol],
          [2, "dataCol ENDSWITH $0", objects[4].dataCol],
          [3, "dataCol CONTAINS $0", objects[2].dataCol],

          [1, "dataCol == null"],
          [5, "dataCol != $0", null],
        ]);
      });

      // TODO: invalid query tests for data.
    });

    describe("querying with decimal128", () => {
      beforeEach(function (this: RealmContext) {
        this.realm.write(() => {
          [0, 1, 2].forEach((v) => {
            this.realm.create(NullableTypesObject, { decimal128Col: BSON.Decimal128.fromString(`1000${v}`) });
          });
          this.realm.create(NullableTypesObject, { decimal128Col: undefined });
        });
      });

      it("returns correct length", function (this: RealmContext) {
        expectQueryLength(this.realm, NullableTypesObject, [
          [2, "decimal128Col <  10002"],
          [3, "decimal128Col <= 10002"],
          [1, "decimal128Col >  10001"],
          [2, "decimal128Col >= 10001"],
          [1, "decimal128Col == 10002"],
          [3, "decimal128Col != 10002"],

          [1, "decimal128Col == null"],
          [3, "decimal128Col != $0", null],
        ]);
      });

      // TODO: invalid query tests for decimal128.
    });

    describe("querying with objectId", () => {
      let objects: NullableTypesObject[];

      beforeEach(function (this: RealmContext) {
        objects = this.realm.write(() => {
          return [
            this.realm.create("NullableTypesObject", { objectIdCol: new BSON.ObjectId("6001c033600510df3bbfd864") }),
            this.realm.create("NullableTypesObject", { objectIdCol: new BSON.ObjectId("6001c04b3bc6feeda9ef44f3") }),
            this.realm.create("NullableTypesObject", { objectIdCol: new BSON.ObjectId("6001c05521acef4e39acfd6f") }),
            this.realm.create("NullableTypesObject", { objectIdCol: new BSON.ObjectId("6001c05e73ac00af232fb7f6") }),
            this.realm.create("NullableTypesObject", { objectIdCol: new BSON.ObjectId("6001c069c2f8b350ddeeceaa") }),
            this.realm.create("NullableTypesObject", { objectIdCol: undefined }),
            this.realm.create("NullableTypesObject", { objectIdCol: undefined }),
          ];
        });
      });

      it("returns correct length", function (this: RealmContext) {
        expectQueryLength(this.realm, NullableTypesObject, [
          [1, "objectIdCol == $0", objects[3].objectIdCol],
          [1, "$0 == objectIdCol", objects[3].objectIdCol],
          [6, "objectIdCol != $0", objects[2].objectIdCol],

          [1, "objectIdCol == oid(6001c033600510df3bbfd864)"],
          [1, "oid(6001c04b3bc6feeda9ef44f3) == objectIdCol"],
          [6, "objectIdCol != oid(6001c033600510df3bbfd864)"],

          [2, "objectIdCol == $0", null],
          [2, "$0 == objectIdCol", null],
          [5, "objectIdCol != $0", null],

          [2, "objectIdCol == null"],
          [2, "null == objectIdCol"],
          [5, "objectIdCol != null"],
        ]);
      });

      // TODO: invalid query tests for BSON.ObjectId.
    });

    describe("querying with uuid", () => {
      let objects: NullableTypesObject[];

      beforeEach(function (this: RealmContext) {
        objects = this.realm.write(() => [
          this.realm.create("NullableTypesObject", { uuidCol: new BSON.UUID("d1b186e1-e9e0-4768-a1a7-c492519d47ee") }),
          this.realm.create("NullableTypesObject", { uuidCol: new BSON.UUID("08c35c66-69bd-4b28-8177-f9135553711f") }),
          this.realm.create("NullableTypesObject", { uuidCol: new BSON.UUID("35f8f06b-dc77-4781-8b5e-9a09759db989") }),
          this.realm.create("NullableTypesObject", { uuidCol: new BSON.UUID("39e2d5ce-087d-4d0c-a149-05acc74c53f1") }),
          this.realm.create("NullableTypesObject", { uuidCol: new BSON.UUID("b521bc19-4e92-4e23-ae85-df937abfd89c") }),
          this.realm.create("NullableTypesObject", { uuidCol: undefined }),
          this.realm.create("NullableTypesObject", { uuidCol: undefined }),
        ]);
      });

      it("returns correct length", function (this: RealmContext) {
        expectQueryLength(this.realm, NullableTypesObject, [
          [1, "uuidCol == $0", objects[3].uuidCol],
          [1, "$0 == uuidCol", objects[3].uuidCol],
          [6, "uuidCol != $0", objects[2].uuidCol],

          [1, "uuidCol == uuid(d1b186e1-e9e0-4768-a1a7-c492519d47ee)"],
          [1, "uuid(08c35c66-69bd-4b28-8177-f9135553711f) == uuidCol"],
          [6, "uuidCol != uuid(d1b186e1-e9e0-4768-a1a7-c492519d47ee)"],

          [2, "uuidCol == $0", null],
          [2, "$0 == uuidCol", null],
          [5, "uuidCol != $0", null],

          [2, "uuidCol == null"],
          [2, "null == uuidCol"],
          [5, "uuidCol != null"],
        ]);
      });

      // TODO: invalid query tests for BSON.UUID.
    });

    describe("compound queries", () => {
      beforeEach(function (this: RealmContext) {
        this.realm.write(() => {
          this.realm.create("NullableTypesObject", { intCol: 0 });
          this.realm.create("NullableTypesObject", { intCol: 1 });
          this.realm.create("NullableTypesObject", { intCol: 2 });
          this.realm.create("NullableTypesObject", { intCol: 3 });
        });
      });

      it("returns correct results", function (this: RealmContext) {
        expectQueryResultValues(this.realm, NullableTypesObject, "intCol", [
          [[], "intCol == 0 && intCol == 1"],
          [[0, 1], "intCol == 0 || intCol == 1"],
          [[0], "intCol == 0 && intCol != 1"],
          [[2, 3], "intCol >= 2 && intCol < 4"],
          [[0], "intCol == 0 && NOT intCol != 0"],
          [[0, 3], "intCol == 0 || NOT (intCol == 1 || intCol == 2)"],
          [[1], "(intCol == 0 || intCol == 1) && intCol >= 1"],
          [[1], "intCol >= 1 && (intCol == 0 || intCol == 1)"],
          [[0, 1], "intCol == 0 || (intCol == 1 && intCol >= 1)"],
          [[0, 1], "(intCol == 1 && intCol >= 1) || intCol == 0"],
          [[0, 1], "intCol == 0 || intCol == 1 && intCol >= 1"],
          [[0, 1, 2], "intCol == 0 || intCol == 1 || intCol <= 2"],
          [[0, 1], "intCol == 1 && intCol >= 1 || intCol == 0"],
          [[0, 1], "intCol == 1 || intCol == 0 && intCol <= 0 && intCol >= 0"],
          [[0, 1], "intCol == 0 || NOT (intCol == 3 && intCol >= 0) && intCol == 1"],
        ]);
      });
    });
  });

  describe("Object and list types", () => {
    describe("querying objects with linked objects", () => {
      class LinkObject extends Realm.Object {
        linkCol?: { intCol: number };
        static schema = { name: "LinkObject", properties: { linkCol: "IntObject" } };
      }
      let objects: LinkObject[];

      openRealmBeforeEach({
        schema: [LinkObject, { name: "IntObject", properties: { intCol: "int" } }],
      });

      beforeEach(function (this: RealmContext) {
        objects = this.realm.write(() => [
          this.realm.create("LinkObject", { linkCol: { intCol: 1 } }),
          this.realm.create("LinkObject", { linkCol: { intCol: 2 } }),
          this.realm.create("LinkObject", { linkCol: undefined }),
        ]);
      });

      it("returns correct length", function (this: RealmContext) {
        expectQueryLength(this.realm, LinkObject, [
          [1, "linkCol == $0", objects[1].linkCol],
          [1, "$0 == linkCol", objects[1].linkCol],
          [2, "linkCol != $0", objects[0].linkCol],
          [1, "linkCol = null"],
          [2, "linkCol != NULL"],
          [1, "linkCol = $0", null],
        ]);
      });

      it("throws with invalid queries", function (this: RealmContext) {
        expectQueryException(this.realm, "LinkObject", [
          ["Unsupported operator", "linkCol > $0", objects[0].linkCol],
          ["'LinkObject' has no property 'intCol'", "intCol = $0", objects[0].linkCol],
        ]);
      });
    });

    describe("querying objects with key paths", () => {
      openRealmBeforeEach({
        schema: [
          {
            name: "BasicTypesObject",
            properties: {
              intCol: "int",
              floatCol: "float",
              doubleCol: "double",
              stringCol: "string",
              dateCol: "date?",
            },
          },
          {
            name: "LinkTypesObject",
            primaryKey: "id",
            properties: {
              id: "int",
              basicLink: "BasicTypesObject",
              linkLink: "LinkTypesObject",
              linkList: "BasicTypesObject[]",
            },
          },
        ],
      });

      beforeEach(function (this: RealmContext) {
        this.realm.write(() => {
          this.realm.create("LinkTypesObject", {
            id: 0,
            basicLink: { intCol: 1, floatCol: 0.1, doubleCol: 0.001, stringCol: "1", dateCol: null },
            linkLink: null,
            linkList: [],
          });
          const secondLinkObject = this.realm.create("LinkTypesObject", {
            id: 2,
            basicLink: { intCol: 1, floatCol: 0.1, doubleCol: 0.001, stringCol: "1", dateCol: null },
            linkLink: null,
            linkList: [],
          });
          this.realm.create("LinkTypesObject", {
            id: 1,
            basicLink: null,
            linkLink: secondLinkObject,
            linkList: [],
          });
          const fourthLinkObject = this.realm.create("LinkTypesObject", {
            id: 4,
            basicLink: { intCol: 2, floatCol: 0.2, doubleCol: 0.002, stringCol: "2", dateCol: null },
            linkLink: null,
            linkList: [],
          });
          this.realm.create("LinkTypesObject", {
            id: 3,
            basicLink: null,
            linkLink: fourthLinkObject,
            linkList: [],
          });
          this.realm.create("LinkTypesObject", {
            id: 5,
            basicLink: null,
            linkLink: null,
            linkList: [{ intCol: 3, floatCol: 0.3, doubleCol: 0.003, stringCol: "3", dateCol: null }],
          });
        });
      });

      it("returns correct results", function (this: RealmContext) {
        expectQueryResultValues(this.realm, "LinkTypesObject", "id", [
          [[0, 2], "basicLink.intCol == 1"],
          [[1], "linkLink.basicLink.intCol == 1"],
          [[1, 3], "linkLink.basicLink.intCol > 0"],
          [[0, 2], "basicLink.floatCol == 0.1"],
          [[1], "linkLink.basicLink.floatCol == 0.1"],
          [[1, 3], "linkLink.basicLink.floatCol > 0"],
          [[5], "linkList.intCol == 3"],
        ]);
      });

      // TODO: invalid query tests for key paths.
    });

    describe("querying objects with ordering", () => {
      openRealmBeforeEach({
        schema: [
          {
            name: "Person",
            properties: {
              id: "int",
              name: "string",
              age: "int",
            },
            primaryKey: "id",
          },
        ],
      });

      beforeEach(function (this: RealmContext) {
        this.realm.write(() => {
          this.realm.create("Person", { id: 0, name: "John", age: 28 });
          this.realm.create("Person", { id: 1, name: "John", age: 37 });
          this.realm.create("Person", { id: 2, name: "Jake", age: 27 });
          this.realm.create("Person", { id: 3, name: "Jake", age: 32 });
          this.realm.create("Person", { id: 4, name: "Jake", age: 32 });
          this.realm.create("Person", { id: 5, name: "Johnny", age: 19 });
        });
      });

      it("returns correct results", function (this: RealmContext) {
        expectQueryResultValues(this.realm, "Person", "id", [
          [[1, 3], "age > 20 SORT(age DESC) DISTINCT(name)"],
          [[2, 0], "age > 20 SORT(age ASC) DISTINCT(name)"],
          [[2, 0], "age > 20 SORT(age ASC, name DESC) DISTINCT(name)"],
          [[2, 0], "age > 20 SORT(name DESC) SORT(age ASC) DISTINCT(name)"],
          [[2, 0, 3, 1], "age > 20 SORT(age ASC, name DESC) DISTINCT(name, age)"],
          [[0, 2], "age > 20 SORT(age ASC) DISTINCT(age) SORT(name DESC) DISTINCT(name)"],
        ]);
      });

      // TODO: invalid query tests for ordering.
    });

    describe("querying primitive lists", () => {
      openRealmBeforeEach({
        schema: [
          {
            name: "Movie",
            properties: {
              id: "int",
              name: "string",
              tags: "string[]",
              ratings: "int[]",
            },
            primaryKey: "id",
          },
        ],
      });

      beforeEach(function (this: RealmContext) {
        this.realm.write(() => {
          this.realm.create("Movie", {
            id: 0,
            name: "Matrix",
            tags: ["science fiction", "artificial reality"],
            ratings: [5, 5, 3, 4, 5, 1, 5],
          });
          this.realm.create("Movie", {
            id: 1,
            name: "Inception",
            tags: ["dream", "science fiction", "thriller"],
            ratings: [3, 5, 3, 4, 5, 5],
          });
          this.realm.create("Movie", {
            id: 2,
            name: "I, Robot",
            tags: ["science fiction", "dystopia", "robot"],
            ratings: [2, 4, 3, 3, 4, 5, 1],
          });
        });
      });

      it("returns correct results", function (this: RealmContext) {
        expectQueryResultValues(this.realm, "Movie", "id", [
          [[0, 1, 2], "tags =[c] 'science fiction'"],
          [[0, 1, 2], "tags BEGINSWITH[c] 'science'"],
          [[], "NONE tags CONTAINS ' '"],
          [[0, 1], "ratings.@avg >= 4"],
          [[1], "ALL ratings > 1"],
          [[], "ANY tags CONTAINS[c] name"],
          [[1, 2], "tags.@size > 2"],
          [[0], "tags.length > 16"],
          [[0], "ALL tags.length > 5"],
          [[0, 1], "ratings.@min > id"],
          [[0, 1, 2], "ratings.@count > 0"],
        ]);
      });
    });

    // TODO: invalid query tests for primitive lists.
  });

  describe("Realm Query Language", () => {
    interface IPrimitive {
      s: string;
      b: boolean;
      i: number;
      f: number;
      d: number;
      t: Date;
    }

    const PrimitiveSchema: Realm.ObjectSchema = {
      name: "Primitive",
      properties: {
        s: "string",
        b: "bool",
        i: "int",
        f: "float",
        d: "double",
        t: "date",
      },
    };

    let persons: Realm.Results<IPerson>;
    let contacts: Realm.Results<IContact>;
    let primitives: Realm.Results<IPrimitive>;

    openRealmBeforeEach({ schema: [PersonSchema, ContactSchema, PrimitiveSchema] });

    beforeEach(function (this: RealmContext) {
      this.realm.write(() => {
        const alice = this.realm.create<IPerson>(PersonSchema.name, { name: "Alice", age: 15 });
        const bob = this.realm.create<IPerson>(PersonSchema.name, { name: "Bob", age: 14, friends: [alice] });
        this.realm.create<IPerson>(PersonSchema.name, { name: "Charlie", age: 17, friends: [bob, alice] });

        [
          { name: "Alice", phones: ["555-1234-567"] },
          { name: "Bob", phones: ["555-1122-333", "555-1234-567"] },
          { name: "Charlie" },
        ].forEach((values) => this.realm.create(ContactSchema.name, values));

        [
          ["foo", true, 2, 3.14, 2.72, "2001-05-11T12:45:05"],
          ["Here is a Unicorn 🦄 today", false, 44, 1.41, 4.67, "2004-02-26T10:15:02"],
        ].forEach((values) =>
          this.realm.create<IPrimitive>(PrimitiveSchema.name, {
            s: values[0] as string,
            b: values[1] as boolean,
            i: values[2] as number,
            f: values[3] as number,
            d: values[4] as number,
            t: new Date(values[5] as string),
          }),
        );
      });

      persons = this.realm.objects<IPerson>(PersonSchema.name);
      contacts = this.realm.objects<IContact>(ContactSchema.name);
      primitives = this.realm.objects<IPrimitive>(PrimitiveSchema.name);
    });

    describe("All objects", () => {
      it("properties and primitive types", () => {
        expect(persons.length).equal(3);
        expect(persons[0].name).equal("Alice");
        expect(persons[0].age).equal(15);
      });

      it("array of primitive types", () => {
        expect(contacts.length).equal(3);
        expect(contacts[0].phones.length).equal(1);
        expect(contacts[1].phones.length).equal(2);
        expect(contacts[2].phones.length).equal(0);
      });

      // https://github.com/realm/realm-js/issues/4844
      it("emoiji and contains", () => {
        const text = "unicorn 🦄 today";
        expect(primitives.length).equal(2);
        const unicorn1 = primitives.filtered("s CONTAINS 'unicorn 🦄 today'");
        const unicorn2 = primitives.filtered("s CONTAINS[c] 'unicorn 🦄 today'");
        const unicorn3 = primitives.filtered("s CONTAINS $0", text);
        const unicorn4 = primitives.filtered("s CONTAINS[c] $0", text);
        expect(unicorn1.length).equal(0);
        expect(unicorn2.length).equal(1);
        expect(unicorn3.length).equal(0);
        expect(unicorn4.length).equal(1);
      });
    });

    describe("IN operator", () => {
      it("properties and array of values", () => {
        const aged14Or15 = persons.filtered("age IN {14, 15}");
        expect(aged14Or15.length).equal(2);

        const aged17 = persons.filtered("age IN $0", [17]);
        expect(aged17.length).equal(1);

        const dennis = persons.filtered("name in {'Dennis'}");
        expect(dennis.length).equal(0);

        const bobs = persons.filtered("name in $0", ["Bob"]);
        expect(bobs.length).equal(1);

        const many = persons.filtered("name in $0", ["Alice", "Dennis", "Bob"]);
        expect(many.length).equal(2);
      });

      it("array of primitive types", () => {
        const hasTwoPhones = contacts.filtered("phones.@count = 2");
        expect(hasTwoPhones.length).equal(1);
        expect(hasTwoPhones[0].name).equal("Bob");

        expect(contacts.filtered("'555-1234-567' IN phones").length).equal(2);
        expect(contacts.filtered("'123-4567-890' IN phones").length).equal(0);
        expect(contacts.filtered("ANY {'555-1234-567', '123-4567-890'} IN phones").length).equal(2);
        expect(contacts.filtered("ALL {'555-1234-567', '123-4567-890'} IN phones").length).equal(0);
        expect(contacts.filtered("NONE {'555-1234-567', '123-4567-890'} IN phones").length).equal(1);
        expect(contacts.filtered("NONE {'555-1122-333', '555-1234-567'} IN phones").length).equal(1);
        expect(contacts.filtered("ALL {'555-1122-333', '555-1234-567'} IN phones").length).equal(1);
      });
    });

    describe("BETWEEN operator", () => {
      const IntObjectSchema = {
        name: "IntObject",
        properties: {
          intCol: "int",
        },
      };

      interface IntObject {
        intCol: number;
      }

      it("should return correct values", () => {
        // TODO: refactor to fit rest of test.
        const realm = new Realm({ schema: [IntObjectSchema] });
        realm.write(() => {
          for (let i = 0; i < 10; i++) {
            realm.create(IntObjectSchema.name, { intCol: i });
          }
        });

        const range = realm.objects<IntObject>(IntObjectSchema.name).filtered("intCol BETWEEN {5, 8}"); // 5, 6, 7, 8
        expect(range.length).equals(4);
        expect(range[0].intCol).equals(5);
        expect(range[1].intCol).equals(6);
        expect(range[2].intCol).equals(7);
        expect(range[3].intCol).equals(8);

        realm.close();
      });
    });

    describe("Special cases", () => {
      it("should work with malformed queries", () => {
        const realm = new Realm({ schema: [NullableTypesObject] });
        expect(() => {
          realm.objects("NullableTypesObject").filtered("stringCol = $0");
        }).throws("Request for argument at index 0 but no arguments are provided");
      });

      it("should support queries with BSON.UUID as primary key", () => {
        const testStringUuids = [
          "01b1a58a-bb92-47a2-a3aa-d9c735e6fd42",
          "ab01fec2-55d5-4fac-9e04-980bff6a521d",
          "6683f348-d441-4846-81aa-cc375b771032",
        ];
        const nonExistingStringUuid = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";

        const primUuidSchema = {
          name: "PrimNullableTypesObject",
          primaryKey: "_id",
          properties: {
            _id: "uuid",
            text: "string",
          },
        };

        const realm = new Realm({ schema: [primUuidSchema] });
        realm.write(() => {
          testStringUuids.forEach((uuidStr) => {
            realm.create(primUuidSchema.name, { _id: new BSON.UUID(uuidStr), text: uuidStr });
          });
        });

        // objectForPrimaryKey tests
        const nonExisting = realm.objectForPrimaryKey(primUuidSchema.name, new BSON.UUID(nonExistingStringUuid));
        expect(nonExisting).equals(
          null,
          `objectForPrimaryKey should return undefined for new BSON.UUID("${nonExistingStringUuid}")`,
        );

        testStringUuids.forEach((uuidStr) => {
          const obj = realm.objectForPrimaryKey(primUuidSchema.name, new BSON.UUID(uuidStr));
          expect(obj).not.equal(
            null,
            `objectForPrimaryKey should return a Realm.Object for new BSON.UUID("${uuidStr}")`,
          );
          //@ts-expect-error _id is part of schema.
          expect(obj._id.toString()).equals(uuidStr);
        });

        // results.filtered tests
        const emptyFiltered = realm
          .objects(primUuidSchema.name)
          .filtered("_id == $0", new BSON.UUID(nonExistingStringUuid));
        expect(emptyFiltered.length).equals(
          0,
          `filtered objects should contain 0 elements when filtered by new BSON.UUID("${nonExistingStringUuid}")`,
        );

        testStringUuids.forEach((uuidStr) => {
          const filtered = realm.objects(primUuidSchema.name).filtered("_id == $0", new BSON.UUID(uuidStr));
          expect(filtered.length).equals(1, `filtered objects should contain exactly 1 of new BSON.UUID("${uuidStr}")`);
        });
      });

      it("should work with scientific notation numbers", () => {
        class DecimalNumbersObject extends Realm.Object {
          f!: Realm.Types.Float;
          d!: Realm.Types.Double;

          static schema = {
            name: "DecimalNumbersObject",
            properties: {
              f: "float",
              d: "double",
            },
          };
        }

        const realm = new Realm({ schema: [DecimalNumbersObject] });
        realm.write(() => {
          realm.create<DecimalNumbersObject>("DecimalNumbersObject", { f: 10e-12, d: 5e10 });
          realm.create<DecimalNumbersObject>("DecimalNumbersObject", { f: 12e-12, d: 3e10 });
          realm.create<DecimalNumbersObject>("DecimalNumbersObject", { f: 10e-10, d: 8e10 });
          realm.create<DecimalNumbersObject>("DecimalNumbersObject", { f: 10e-20, d: 8e32 });
        });
        const numbers = realm.objects(DecimalNumbersObject);

        expect(numbers.filtered("f == 10e-12 AND d == 5e10").length).equal(1);
        expect(numbers.filtered("f == 10e-12 AND d == 5e9").length).equal(0);
        expect(numbers.filtered("f == 6e-6").length).equal(0);
        expect(numbers.filtered("d == 9e32").length).equal(0);

        expect(numbers.filtered("f == 100e-13").length).equal(1);
        expect(numbers.filtered("f > 10e-12").length).equal(2);
        expect(numbers.filtered("f > 10e-50").length).equal(4);

        expect(numbers.filtered("d > 8e32").length).equal(0);
        expect(numbers.filtered("d >= 8e32").length).equal(1);

        expect(numbers.filtered("(f > 10e-12 AND f <= 10e10) AND (d >= 3e10 AND d <= 8e10)").length).equal(2);
      });
    });

    describe("logical operators", () => {
      it("primititive types - OR operator", () => {
        const unicornString = "Here is a Unicorn 🦄 today";
        const fooString = "foo";

        expect(primitives.filtered(`s == "${unicornString}" OR s == "bar"`).length).equal(1);
        expect(primitives.filtered("s == $0 OR s == $1", unicornString, "bar").length).equal(1);

        expect(primitives.filtered(`s == "${unicornString}" OR s == "${fooString}"`).length).equal(2);
        expect(primitives.filtered("s == $0 OR s == $1", unicornString, fooString).length).equal(2);

        expect(primitives.filtered(`s == "${unicornString}" OR i == 44`).length).equal(1);
        expect(primitives.filtered("s == $0 OR i == $1", unicornString, 44).length).equal(1);
        expect(primitives.filtered("s == $0 OR i == $1", unicornString, 2).length).equal(2);
        expect(primitives.filtered("s == $0 OR i == $1", unicornString, 3).length).equal(1);
      });

      it("primititive types - AND operator", () => {
        const unicornString = "Here is a Unicorn 🦄 today";
        const fooString = "foo";

        expect(primitives.filtered(`s == "${unicornString}" AND s == "bar"`).length).equal(0);
        expect(primitives.filtered("s == $0 AND s == $1", unicornString, "bar").length).equal(0);

        expect(primitives.filtered(`s == "${unicornString}" AND s == "${fooString}"`).length).equal(0);
        expect(primitives.filtered("s == $0 AND s == $1", unicornString, fooString).length).equal(0);

        expect(primitives.filtered(`s == "${unicornString}" AND i == 44`).length).equal(1);
        expect(primitives.filtered("s == $0 AND i == $1", unicornString, 44).length).equal(1);
      });
    });
  });
});
