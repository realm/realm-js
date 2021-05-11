import { expect } from "chai";

import { uploadDownloadHelper } from "./upload-download-helper";

describe("mixed", () => {
  it("can upload and download", () => {
    uploadDownloadHelper({
      schema: [{ name: "MixedClass", properties: { value: "mixed" } }],
    }, realm => {
      realm.create("Mixed", { mixed: "string-value" });
    }, realm => {
      const objects = realm.objects("MixedClass");
      expect(objects.length).equals(1);
    });
  });
});
