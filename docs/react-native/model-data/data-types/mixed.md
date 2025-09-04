# Mixed - React Native SDK
> Version changed:
> Mixed properties can contain lists or dictionaries of mixed data.
>

> Version added:

The Mixed data type is a realm property type that can hold any valid Realm data
type except an embedded object or a set.
You can create collections (lists, sets, and dictionaries) of type `mixed`. Properties using the mixed data type can also hold null values.

The Mixed type is indexable, but you can't use it as a primary key.

Properties using the Mixed type can hold null values and cannot be defined
as optional. All instances of the JavaScript `Number` type in a Realm Mixed
type are mapped to the Realm `double` type.

## Realm Object Models
To set a property of your object model as Mixed, set the property's type to
`mixed`.

#### Javascript

```javascript
class Cat extends Realm.Object {
  static schema = {
    name: 'Cat',
    properties: {
      name: 'string',
      birthDate: 'mixed',
    },
  };
}

```

#### Typescript

```typescript
class Cat extends Realm.Object<Cat> {
  name!: string;
  birthDate?: Realm.Mixed;

  static schema: ObjectSchema = {
    name: 'Cat',
    properties: {
      name: 'string',
      birthDate: 'mixed',
    },
  };
}

```

### Collections as Mixed
In JS SDK v12.9.0 and later, a mixed data type can hold collections (a list or
dictionary, but *not* a set) of mixed elements. You can use mixed collections to
model unstructured or variable data. For more information, refer to
Define Unstructured Data.

- You can nest mixed collections up to 100 levels.
- You can query mixed collection properties and
register a listener for changes,
as you would a normal collection.
- You can find and update individual mixed collection elements
- You *cannot* store sets or embedded objects in mixed collections.

To use mixed collections, define the mixed type property in your data model.
Then, create the list or dictionary collection.

## Create an Object With a Mixed Value
Create an object with a Mixed value by using the [new](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/new) operator within a write
transaction.

### Example
In the following `CreateCatsInput` example, we create several `Cat` realm
objects with a Mixed type for the `birthDate` field.

The `CreateCatsInput` component does the following:

- Get access to the opened realm instance by calling the `useRealm()` hook.
- Use React's [useEffect](https://react.dev/reference/react/useEffect) hook
to call an anonymous function only once with `useEffect` and an
empty dependency array.
- Within the anonymous function, we create four different `Cat` objects by
using the `new` operator to create a new realm object within a write
transaction. Each of the `Cat` objects uses a different data type for the
`birthDate` property.
- Use the `useQuery()` hook to retrieve all `Cat` objects.
- [Map](https://react.dev/learn/rendering-lists) through the cats to render
a list of `Text` components displaying each cat's `name` and `birthDate`.

#### Javascript

```javascript
const CreateCatsInput = () => {
  const realm = useRealm();

  useEffect(() => {
    // Add data to the Realm when the component mounts
    realm.write(() => {
      // create a Cat with a birthDate value of type string
      realm.create('Cat', {
        name: 'Euler',
        birthDate: 'December 25th, 2017',
      });

      // create a Cat with a birthDate value of type date
      realm.create('Cat', {
        name: 'Blaise',
        birthDate: new Date('August 17, 2020'),
      });

      // create a Cat with a birthDate value of type int
      realm.create('Cat', {name: 'Euclid', birthDate: 10152021});

      // create a Cat with a birthDate value of type null
      realm.create('Cat', {name: 'Pythagoras', birthDate: null});
    });
  }, []);

  // retrieve all cats
  const cats = useQuery(Cat);

  return (
    <>
      {cats.map(cat => (
        <View>
          <Text>{cat.name}</Text>
          <Text>{String(cat.birthDate)}</Text>
        </View>
      ))}
    </>
  );
};

```

#### Typescript

```typescript
const CreateCatsInput = () => {
  const realm = useRealm();

  useEffect(() => {
    // Add data to the Realm when the component mounts
    realm.write(() => {
      // create a Cat with a birthDate value of type string
      realm.create('Cat', {
        name: 'Euler',
        birthDate: 'December 25th, 2017',
      });

      // create a Cat with a birthDate value of type date
      realm.create('Cat', {
        name: 'Blaise',
        birthDate: new Date('August 17, 2020'),
      });

      // create a Cat with a birthDate value of type int
      realm.create('Cat', {name: 'Euclid', birthDate: 10152021});

      // create a Cat with a birthDate value of type null
      realm.create('Cat', {name: 'Pythagoras', birthDate: null});
    });
  }, []);

  // retrieve all cats
  const cats = useQuery(Cat);

  return (
    <>
      {cats.map(cat => (
        <View>
          <Text>{cat.name}</Text>
          <Text>{String(cat.birthDate)}</Text>
        </View>
      ))}
    </>
  );
};

```

## Query for Objects with a Mixed Value
To query for objects with a Mixed value, run the
`Collection.filtered()` method and
pass in a filter for a non-Mixed field. You can
then print the value of the Mixed property or the entire object itself.

### Example
In the following `CatInfoCard` example, we query for a `Cat` object using the
cat's name.

The `CatInfoCard` component does the following:

- Get all `Cat` objects by passing the `Cat` class to the `useQuery()` hook, and then use `filtered()` to filter the results to receive only the cats whose names match the name passed as a prop. We then get the first matching cat and store it as a const variable.
- Use dot notation to retrieve the Mixed property, `birthDate`.
- Display the cat's name and birthdate in the render method if Realm finds the cat. If there is no cat that matches the name passed into the component as a prop, we render text that says "Cat not found".

#### Javascript

```javascript
const CatInfoCard = ({catName}) => {
  // To query for the cat's birthDate, filter for their name to retrieve the realm object.
  // Use dot notation to access the birthDate property.
  const cat = useQuery(
    Cat,
    cats => {
      return cats.filtered(`name = '${catName}'`);
    },
    [catName],
  )[0];
  const catBirthDate = cat.birthDate;

  if (cat) {
    return (
      <>
        <Text>{catName}</Text>
        <Text>{String(catBirthDate)}</Text>
      </>
    );
  } else {
    return <Text>Cat not found</Text>;
  }
};

```

#### Typescript

```typescript
type CatInfoCardProps = {catName: string};

const CatInfoCard = ({catName}: CatInfoCardProps) => {
  // To query for the cat's birthDate, filter for their name to retrieve the realm object.
  // Use dot notation to access the birthDate property.
  const cat = useQuery(
    Cat,
    cats => {
      return cats.filtered(`name = '${catName}'`);
    },
    [catName],
  )[0];
  const catBirthDate = cat.birthDate;

  if (cat) {
    return (
      <>
        <Text>{catName}</Text>
        <Text>{String(catBirthDate)}</Text>
      </>
    );
  } else {
    return <Text>Cat not found</Text>;
  }
};

```

## Mixed Properties and Type Checking
Because Mixed properties can be more than one type, you can't rely on the
property's value being a specific type.

With `Object.getPropertyType()`, you
can get a Mixed property's underlying type. This allows you build your own type
checking.

```javascript
// Use Type Predicates and Object.getPropertyType() to
// create a runtime type check for Mixed properties.
const isString = (
  val: Mixed,
  name: string,
  object: Realm.Object,
): val is Realm.Types.String => {
  return object.getPropertyType(name) === 'string';
};

type CatInfoCardProps = {catName: string};

const CatInfoCard = ({catName}: CatInfoCardProps) => {
  const cat = useQuery(
    Cat,
    cats => {
      return cats.filtered(`name = '${catName}'`);
    },
    [catName],
  )[0];
  // Use the type check to handle your data.
  const catBirthDate = isString(cat.birthDate, 'birthDate', cat)
    ? cat.birthDate
    : cat.birthDate.toString();

  if (cat) {
    return (
      <>
        <Text>{catName}</Text>
        <Text>{catBirthDate}</Text>
      </>
    );
  } else {
    return <Text>Cat not found</Text>;
  }
};

```
