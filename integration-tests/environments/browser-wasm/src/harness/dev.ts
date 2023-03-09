// console.log("start WebpackDevServer");

import puppeteer from "puppeteer";
import WebpackDevServer from "webpack-dev-server";
import webpack from "webpack";
import MochaRemote from "mocha-remote";

import WEBPACK_CONFIG = require("../../webpack.config");
import path = require("path");

export async function run(devtools = false) {
  // Start up the Webpack Dev Server
  const compiler = webpack({
    ...(WEBPACK_CONFIG as webpack.Configuration),
    mode: "development",
    plugins: [
        ...WEBPACK_CONFIG.plugins,
      ],
  });

  // Start the webpack-dev-server
  const devServer = new WebpackDevServer(compiler, {
    // proxy: { "/api": baseUrl },
    historyApiFallback: true,
    // static: {
    //   directory: path.join(__dirname, "../node_modules/realm-web"),
    //   publicPath: "/public",
    // },
  });

  await new Promise<void>((resolve, reject) => {
    devServer.listen(8080, "localhost", (err: any) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });

  process.once("exit", () => {
    devServer.close();
  });

  // Start the mocha remote server
  const mochaServer = new MochaRemote.Server({
    autoRun: devtools,
  });

  process.once("exit", () => {
    mochaServer.stop();
  });

  await mochaServer.start();

  // Start up the browser, running the tests
  const browser = await puppeteer.launch({ headless:true, devtools });

  process.once("exit", () => {
    browser.close();
  });

  // Navigate to the pages served by the webpack dev server
  const page = await browser.newPage();
  const issues: string[] = [];
  page.on("console", (message) => {
    const type = message.type();
    if (type === "error") {
      const text = message.text();
      issues.push(text);
      console.error(`[ERROR] ${text}`);
    } else if (type === "warning") {
      const text = message.text();
      issues.push(text);
      console.warn(`[WARNING] ${text}`);
    } else if (type === "info") {
      const text = message.text();
      console.log(`[INFO] ${text}`);
    }
  });
  await page.goto("http://localhost:8080");
  // We will have to manually invoke running the tests if we're not running on connections
  if (!devtools) {
    await mochaServer.runAndStop();
  }
  // Wait for the tests to complete
  await mochaServer.stopped;
  // Check the issues logged in the browser
}

const devtools = "DEV_TOOLS" in process.env;

run(devtools).then(
  () => {
    if (!devtools) {
      process.exit();
    }
  },
  (err) => {
    console.error(err);
    if (!devtools) {
      process.exit(1);
    }
  },
);