import { CanonicalPropertySchema, BSON } from "realm";

function transformValue(schema: CanonicalPropertySchema, value: unknown) {
  if (schema.type === "objectId" && typeof value === "string") {
    return BSON.ObjectId.createFromHexString(value);
  } else {
    return value;
  }
}

export function transformValues(properties: CanonicalPropertySchema[], values: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(values).map(([name, value]) => {
      const schema = properties.find((s) => s.name === name);
      if (schema) {
        return [name, transformValue(schema, value)];
      } else {
        return [name, value];
      }
    }),
  );
}
