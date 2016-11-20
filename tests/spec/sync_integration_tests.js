"use strict";

const spawn = require("child_process").spawn;
const readline = require("readline");
const fs = require("fs");
const Realm = require("realm");

jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;

describe('Sync Integration', () => {
    beforeEach(function(done) {
        this.objectServer = spawn("sync-bundle/start-object-server.command");
        this.objectServer.once("close", (code) => {
            if (typeof code === "number" && code != 0) {
                console.error(`Object Server exited with code ${code}`);
                process.exit(-1);
            }
        });

        this.rl = readline.createInterface({ input: this.objectServer.stdout });
        this.rl.on("line", (line) => {
            var match;
            if ((match = line.match(/Connection\[1\]: Session\[1\]: Received: BIND\(server_path='\/(.+)',/))) {
                var adminUser = Realm.Sync.User.adminUser(fs.readFileSync("sync-bundle/admin_token.base64", "utf-8"));
                this.adminRealmPath = match[1];
                this.adminRealm = new Realm({
                    path: "__admin.realm",
                    sync: {
                        user: adminUser,
                        url: `realm://127.0.0.1:9080/${this.adminRealmPath}`
                    },
                    schema: [
                        {
                            name: "RealmFile",
                            properties: {
                                id: 'string',
                                path: 'string'
                            }
                        }
                    ]
                });

                done();
            }
        });
    });

    afterEach(function(done) {
        this.rl.close();
        this.objectServer.kill('SIGKILL');
        this.adminRealm.close();

        let reset = spawn("sync-bundle/reset-server-realms.command");
        reset.once("close", done);
        reset.stdin.write("yes\n");

        Realm.clearTestState();
    });

   it("should work", function(done) {
       Realm.Sync.User.create('http://127.0.0.1:9080/', 'foo', 'bar', function(error) {
           if (error) {
               fail(error);
               return;
           }

           Realm.Sync.User.login('http://127.0.0.1:9080/', 'foo', 'bar', function(error, user) {
               if (error) {
                   fail(error);
                   return;
               }

               var _realm = new Realm({
                   syncConfig: {
                       identity: user.identity,
                       url: 'realm://127.0.0.1:9080/~/demo/realm1'
                   },
                   schema: [
                       {
                           name: 'IntObject',
                           properties: {
                               int: 'int'
                           }
                       }
                   ]
               });
           });
       });

       var realms = this.adminRealm.objects("RealmFile");
       realms.addListener((sender, changeset) => {
           if (changeset.insertions.length === 1) {
               expect(realms[changeset.insertions[0]].path).toMatch(/demo\/realm1$/);
               done();
           }
       });
   });

});