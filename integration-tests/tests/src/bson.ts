import { expect } from "chai";

describe("BSON", () => {
  it("gets exported", () => {
    expect(typeof Realm.BSON).equals("object");
    expect(typeof Realm.BSON.ObjectId).equals("function");
    expect(typeof Realm.BSON.Decimal128).equals("function");
    expect(typeof Realm.BSON.Binary).equals("function");
    expect(typeof Realm.BSON.EJSON).equals("object");
  });
});
