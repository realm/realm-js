# Geospatial - Node.js SDK
> Version added: 12.0.0

Geospatial data, or "geodata", specifies points and geometric objects on the Earth's
surface. With the geodata types, you can create queries that check whether a given
point is contained within a shape. For example, you can find all coffee shops within
15 km of a specified point.

## Geospatial Data Types
The Node.js SDK supports geospatial queries using the following data types:

- GeoPoint
- GeoCircle
- GeoBox
- GeoPolygon

The SDK provides these geospatial data types to simplify querying geospatial data. You *cannot* persist these data types directly.

For information on how to persist geospatial data, refer to the
Persist Geospatial Data section on this page.

### GeoPoint
A `GeoPoint` defines a specific
location on the Earth's surface. All of the geospatial data types use `GeoPoints`
to define their location.

`GeoPoint` can be one of three types:

- An object with: `latitude`: a number value`longitude`: a number value`altitude`: an optional number value
- `CanonicalGeoPoint`:  an interface that satisfies the GeoJSON specifications for a point
- `GeoPosition`: an array with longitude, latitude, and an optional altitude

A GeoPoint is used only as a building block of the other shapes:
GeoCircle, GeoBox, and GeoPolygon. These shapes, and the GeoPoint type,
are used in queries, not for persistance.

To save geospatial data to realm, refer to Persist Geospatial Data.

### GeoCircle
A `GeoCircle` defines a circle on
the Earth's surface. You define a `GeoCircle` by providing:

- A `GeoPoint` for the center of the circle
- A number for the distance (radius) of the circle

The radius distance uses radians as the unit of measure. The SDK
provides the methods `kmToRadians` and `miToRadians` to convert
kilometers or miles to radians.

The following code shows two examples of creating a circle:

#### Javascript

```javascript
const smallCircle = {
  center: [-121.9, 47.3],
  // The GeoCircle radius is measured in radians.
  // This radian distance corresponds with 0.25 degrees.
  distance: 0.004363323,
};

const largeCircleCenter = {
  longitude: -122.6,
  latitude: 47.8,
};

// Realm provides `kmToRadians` and `miToRadians`
// to convert these measurements. Import the relevant
// convenience method for your app's needs.
const radiusFromKm = kmToRadians(44.4);

const largeCircle = {
  center: largeCircleCenter,
  distance: radiusFromKm,
};

```

#### Typescript

```typescript
const smallCircle: GeoCircle = {
  center: [-121.9, 47.3],
  // The GeoCircle radius is measured in radians.
  // This radian distance corresponds with 0.25 degrees.
  distance: 0.004363323,
};

const largeCircleCenter: GeoPoint = {
  longitude: -122.6,
  latitude: 47.8,
};

// Realm provides `kmToRadians` and `miToRadians`
// to convert these measurements. Import the relevant
// convenience method for your app's needs.
const radiusFromKm = kmToRadians(44.4);

const largeCircle: GeoCircle = {
  center: largeCircleCenter,
  distance: radiusFromKm,
};

```

![Two GeoCircles](../../../../images/geocircles.png)

### GeoBox
A `GeoBox` defines a rectangle on
the Earth's surface. You define the rectangle by specifying the bottom left
(southwest) corner and the top right (northeast) corner. A GeoBox behaves
in the same way as the corresponding GeoPolygon.

The following example creates 2 boxes:

#### Javascript

```javascript
const largeBox = {
  bottomLeft: [-122.7, 47.3],
  topRight: [-122.1, 48.1],
};

const smallBoxBottomLeft = {
  longitude: -122.4,
  latitude: 47.5,
};
const smallBoxTopRight = {
  longitude: -121.8,
  latitude: 47.9,
};
const smallBox = {
  bottomLeft: smallBoxBottomLeft,
  topRight: smallBoxTopRight,
};

```

#### Typescript

```typescript
const largeBox: GeoBox = {
  bottomLeft: [-122.7, 47.3],
  topRight: [-122.1, 48.1],
};

const smallBoxBottomLeft: GeoPoint = {
  longitude: -122.4,
  latitude: 47.5,
};
const smallBoxTopRight: GeoPoint = {
  longitude: -121.8,
  latitude: 47.9,
};
const smallBox: GeoBox = {
  bottomLeft: smallBoxBottomLeft,
  topRight: smallBoxTopRight,
};

```

![2 GeoBoxes](../../../../images/geoboxes.png)

### GeoPolygon
A `GeoPolygon` defines a polygon
on the Earth's surface. Because a polygon is a closed shape, you must provide a
minimum of 4 points: 3 points to define the polygon's shape, and a fourth to
close the shape.

> **IMPORTANT:**
> The fourth point in a polygon must be the same as the first point.
>

You can also exclude areas within a polygon by defining one or more "holes". A
hole is another polygon whose bounds fit completely within the outer polygon.
The following example creates 3 polygons: one is a basic polygon with 5 points,
one is the same polygon with a single hole, and the third is the same polygon
with two holes:

#### Javascript

```javascript
// Create a basic polygon
const basicPolygon = {
  outerRing: [
    [-122.8, 48.0],
    [-121.8, 48.2],
    [-121.6, 47.6],
    [-122.0, 47.0],
    [-122.6, 47.2],
    [-122.8, 48.0],
  ],
};

// Create a polygon with one hole
const outerRing = [
  [-122.8, 48.0],
  [-121.8, 48.2],
  [-121.6, 47.6],
  [-122.0, 47.0],
  [-122.6, 47.2],
  [-122.8, 48.0],
];

const hole = [
  [-122.6, 47.8],
  [-122.2, 47.7],
  [-122.6, 47.4],
  [-122.5, 47.6],
  [-122.6, 47.8],
];

const polygonWithOneHole = {
  outerRing: outerRing,
  holes: [hole],
};

// Add a second hole to the polygon
const hole2 = [
  {
    longitude: -122.05,
    latitude: 47.55,
  },
  {
    longitude: -121.9,
    latitude: 47.55,
  },
  {
    longitude: -122.1,
    latitude: 47.3,
  },
  {
    longitude: -122.05,
    latitude: 47.55,
  },
];

const polygonWithTwoHoles = {
  outerRing: outerRing,
  holes: [hole, hole2],
};

```

#### Typescript

```typescript
// Create a basic polygon
const basicPolygon: GeoPolygon = {
  outerRing: [
    [-122.8, 48.0],
    [-121.8, 48.2],
    [-121.6, 47.6],
    [-122.0, 47.0],
    [-122.6, 47.2],
    [-122.8, 48.0],
  ],
};

// Create a polygon with one hole
const outerRing: GeoPoint[] = [
  [-122.8, 48.0],
  [-121.8, 48.2],
  [-121.6, 47.6],
  [-122.0, 47.0],
  [-122.6, 47.2],
  [-122.8, 48.0],
];

const hole: GeoPoint[] = [
  [-122.6, 47.8],
  [-122.2, 47.7],
  [-122.6, 47.4],
  [-122.5, 47.6],
  [-122.6, 47.8],
];

const polygonWithOneHole: GeoPolygon = {
  outerRing: outerRing,
  holes: [hole],
};

// Add a second hole to the polygon
const hole2: GeoPoint[] = [
  {
    longitude: -122.05,
    latitude: 47.55,
  },
  {
    longitude: -121.9,
    latitude: 47.55,
  },
  {
    longitude: -122.1,
    latitude: 47.3,
  },
  {
    longitude: -122.05,
    latitude: 47.55,
  },
];

const polygonWithTwoHoles: GeoPolygon = {
  outerRing: outerRing,
  holes: [hole, hole2],
};

```

![3 GeoPolygons](../../../../images/geopolygons.png)

## Persist Geospatial Data
> **IMPORTANT:**
> Currently, you can only persist geospatial data. Geospatial data types *cannot* be persisted directly. For example, you
can't declare a property that is of type `GeoBox`.
>
> These types can only be used as arguments for geospatial queries.
>

If you want to persist geospatial data, it must conform to the
[GeoJSON spec](https://datatracker.ietf.org/doc/html/rfc7946).

### Create a GeoJSON-Compatible Class
To create a class that conforms to the GeoJSON spec, you:

1. Create an embedded realm object. For more information about embedded
objects, refer to Embedded Objects - Node.js SDK.
2. At a minimum, add the two fields required by the GeoJSON spec: A field of type `double[]` that maps to a "coordinates" (case sensitive)
property in the realm schema.A field of type `string` that maps to a "type" property. The value of this
field must be "Point".

To simplify geodata persistance, you can define a model that implements
`CanonicalGeoPoint`, which already has the correct shape. The following
example shows an embedded class named `MyGeoPoint` that is used
to persist geospatial data:

#### Javascript

```javascript
class MyGeoPoint {
  type = "Point";

  constructor(long, lat) {
    this.coordinates = [long, lat];
  }

  static schema = {
    name: "MyGeoPoint",
    embedded: true,
    properties: {
      type: "string",
      coordinates: "double[]",
    },
  };
}

```

#### Typescript

```typescript
// Implement `CanonicalGeoPoint`
// for convenience when persisting geodata.
class MyGeoPoint implements CanonicalGeoPoint {
  coordinates!: GeoPosition;
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

```

### Use the Embedded Class
You then use the custom `MyGeoPoint` class in your realm model, as shown in the
following example:

#### Javascript

```javascript
class Company extends Realm.Object {
  static schema = {
    name: "Company",
    properties: {
      _id: "int",
      location: "MyGeoPoint",
    },
    primaryKey: "_id",
  };
}

```

#### Typescript

```typescript
class Company extends Realm.Object<Company> {
  _id!: number;
  location!: MyGeoPoint;

  static schema: ObjectSchema = {
    name: "Company",
    properties: {
      _id: "int",
      location: "MyGeoPoint",
    },
    primaryKey: "_id",
  };
}

```

You add instances of your class to the realm just like any other Realm
model. However, in this example, because the `MyGeoPoint` class does not
extend `Realm.Object`, we must specify `MyGeoPoint.schema` when opening
the realm:

#### Javascript

```javascript
const realm = await Realm.open({
  // `MyGeoPoint` does not extend `Realm.Object`, so you pass
  // only the `.schema` when opening the realm.
  schema: [Company, MyGeoPoint.schema],
});

// Add geospatial object to realm.
realm.write(() => {
  realm.create(Company, {
    _id: 6,
    location: new MyGeoPoint(-122.35, 47.68),
  });
  realm.create(Company, {
    _id: 9,
    location: new MyGeoPoint(-121.85, 47.9),
  });
});

```

#### Typescript

```typescript
const realm = await Realm.open({
  // `MyGeoPoint` does not extend `Realm.Object`, so you pass
  // only the `.schema` when opening the realm.
  schema: [Company, MyGeoPoint.schema],
});

// Add geospatial object to realm.
realm.write(() => {
  realm.create(Company, {
    _id: 6,
    location: new MyGeoPoint(-122.35, 47.68),
  });
  realm.create(Company, {
    _id: 9,
    location: new MyGeoPoint(-121.85, 47.9),
  });
});

```

The following image shows the results of creating these two company objects.

![2 GeoPoints](../../../../images/geopoints.png)

## Query Geospatial Data
To query against geospatial data, you can use the `geoWithin` operator
with RQL. The `geoWithin` operator takes the "coordinates"
property of an embedded object that defines the point we're querying, and
one of the geospatial shapes to check if that point is contained within
the shape.

> **NOTE:**
> The format for querying geospatial data is the same, regardless of the
shape of the geodata region.
>

The following examples show querying against various shapes to return a list of
companies within the shape:

**GeoCircle**

#### Javascript

```javascript
const companiesInSmallCircle = realm
  .objects(Company)
  .filtered("location geoWithin $0", smallCircle);
console.debug(`Companies in smallCircle: ${companiesInSmallCircle.length}`);

const companiesInLargeCircle = realm
  .objects(Company)
  .filtered("location geoWithin $0", largeCircle);
console.debug(`Companies in largeCircle: ${companiesInLargeCircle.length}`);

```

#### Typescript

```typescript
const companiesInSmallCircle = realm
  .objects(Company)
  .filtered("location geoWithin $0", smallCircle);
console.debug(`Companies in smallCircle: ${companiesInSmallCircle.length}`);

const companiesInLargeCircle = realm
  .objects(Company)
  .filtered("location geoWithin $0", largeCircle);
console.debug(`Companies in largeCircle: ${companiesInLargeCircle.length}`);

```

![Querying a GeoCircle example.](../../../../images/geocircles-query.png)

**GeoBox**

#### Javascript

```javascript
const companiesInLargeBox = realm
  .objects(Company)
  .filtered("location geoWithin $0", largeBox);
console.debug(`Companies in large box: ${companiesInLargeBox.length}`);

const companiesInSmallBox = realm
  .objects(Company)
  .filtered("location geoWithin $0", smallBox);
console.debug(`Companies in small box: ${companiesInSmallBox.length}`);

```

#### Typescript

```typescript
const companiesInLargeBox = realm
  .objects(Company)
  .filtered("location geoWithin $0", largeBox);
console.debug(`Companies in large box: ${companiesInLargeBox.length}`);

const companiesInSmallBox = realm
  .objects(Company)
  .filtered("location geoWithin $0", smallBox);
console.debug(`Companies in small box: ${companiesInSmallBox.length}`);

```

![Querying a GeoBox example.](../../../../images/geoboxes-query.png)

**GeoPolygon**

#### Javascript

```javascript
const companiesInBasicPolygon = realm
  .objects(Company)
  .filtered("location geoWithin $0", basicPolygon);
console.debug(
  `Companies in basic polygon: ${companiesInBasicPolygon.length}`
);

const companiesInPolygonWithTwoHoles = realm
  .objects(Company)
  .filtered("location geoWithin $0", polygonWithTwoHoles);
console.debug(
  `Companies in polygon with two holes: ${companiesInPolygonWithTwoHoles.length}`
);

```

#### Typescript

```typescript
const companiesInBasicPolygon = realm
  .objects(Company)
  .filtered("location geoWithin $0", basicPolygon);
console.debug(
  `Companies in basic polygon: ${companiesInBasicPolygon.length}`
);

const companiesInPolygonWithTwoHoles = realm
  .objects(Company)
  .filtered("location geoWithin $0", polygonWithTwoHoles);
console.debug(
  `Companies in polygon with two holes: ${companiesInPolygonWithTwoHoles.length}`
);

```

![Querying a GeoPolygon example.](../../../../images/geopolygons-query.png)
