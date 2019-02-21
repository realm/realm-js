"use strict";

const spawn = require("child_process").spawn;
const readline = require("readline");
const fs = require("fs");
const tmp = require("tmp");
const path = require("path");
const adminRealmSchema = require('./adminRealmSchema');
const yaml = require('js-yaml');
const spawnSync = require("spawn-sync");

module.exports = class RosController {
  start() {
    // Use a new tmp dir for all files used by the server.
    this.temp = tmp.dirSync({ unsafeCleanup: true });
    this.rootPath = path.join(this.temp.name, 'root');

    const portIndex = parseInt(process.env.EXECUTOR_NUMBER) || 0;
    this.httpPort = 9080 + portIndex;
    this.syncHttpPort = 27080 + portIndex;
    this.syncPort = 27800 + portIndex;

    fs.mkdirSync(this.rootPath);

    const rosModule = path.join(__dirname, '../../../object-server/src/node/bootstrap.js');
    const templateConfig = path.join(__dirname, '../support/ros_test_configuration.yml');

    var yamlConfig = yaml.safeLoad(fs.readFileSync(templateConfig), 'utf8');
    yamlConfig.proxy = { http: { listen_port: this.httpPort } };

    const rosConfig = path.join(this.temp.name, 'configuration.yml');
    fs.writeFileSync(rosConfig, yaml.safeDump(yamlConfig), 'utf8');

    // Try to kill a previous server (BUT NOT OTHERS!) before starting. Use the
    // unique port as the distinguishing argument.
    spawnSync("pkill", ["-9", "-f", `${rosModule} --http-listen-port ${this.syncHttpPort} --listen-port ${this.syncPort}`]);

    // Note: Running the server in a forked subprocess does not work. We need
    // another node instance.
    this.objectServer = spawn('node', [rosModule, '--http-listen-port', this.syncHttpPort, '--listen-port', this.syncPort, '-c', rosConfig, '--root', this.rootPath], { cwd: '..' });
    this.rl = readline.createInterface({ input: this.objectServer.stdout });

    return new Promise((resolve, reject) => {
        this.rl.on("line", (line) => {
          //console.log(line);
          if (line.match(/sync-server: Listening on/)) {
            const adminToken = fs.readFileSync("../object-server/development/admin_token.base64", "utf-8").trim();
            this.adminUser = Realm.Sync.User.adminUser(adminToken);

            this.adminRealm = new Realm({
                path: path.join(this.temp.name, 'admin.realm'),
                schema: adminRealmSchema,
                sync: {
                    user: this.adminUser,
                    url: `realm://127.0.0.1:${this.httpPort}/__admin`
                },
            });

            Realm.Sync.User.register(`http://127.0.0.1:${this.httpPort}`, 'user', 'password', (error, user) => {
                if (error) {
                    reject(error);
                    return;
                }

                this.user = user;
                resolve();
            });
          }
        });
    });
  }

  shutdown() {
    this.rl.close();
    this.adminRealm.close();
    this.adminUser = undefined;

    return new Promise((resolve, reject) => {
      this.objectServer.on("exit", (code, signal) => {
        if (code === 0) { // object-server does process.exit(0) on completion of sigterm
          // Need to wait with removing the temp dir until the server has closed, otherwise it holds on to files.
          this.temp.removeCallback();
          resolve();
        } else {
          reject();
        }
      });
      // Close it nicely by sending SIGTERM
      this.objectServer.kill(); // Note: Giving the 'SIGTERM' argument explicitly fails for mysterious reasons.
    });
  }

  createRealm(serverPath, schema, path) {
    return Realm.open({
      schema: schema,
      sync: {
        user: this.user,
        url: `realm://127.0.0.1:${this.httpPort}/~/` + serverPath
      },
      path: path
    });
  }
};
