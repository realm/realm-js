export function itUploadsDeletesAndDownloads() {
  it("uploads, cleans and downloads", async function(this: RealmContext) {
    if (!this.realm) {
      throw new Error("Expected a 'realm' on the mocha context");
    }
    // Ensure everything has been uploaded
    await this.realm.syncSession.uploadAllLocalChanges();
    // Close, delete and download the Realm from the server
    this.realm.close();
    // Delete the file
    Realm.deleteFile(this.config);
    // Re-open the Realm with the old configuration
    this.realm = new Realm(this.config);
    await this.realm.syncSession.downloadAllServerChanges();
  });
}