// var-requires are needed as webpack configs are running in a node process
/* eslint-disable @typescript-eslint/no-var-requires */

const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");

module.exports = {
    entry: "./src/index.ts",
    devtool: "eval-source-map",
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                loader: "ts-loader",
                options: {
                    configFile: "tsconfig.web.json",
                },
            },
        ],
    },
    node: {
        fs: "empty",
    },
    resolve: {
        extensions: [".ts", ".js"],
    },
    output: {
        filename: "bundle.js",
        path: path.resolve(__dirname, "dist"),
    },
    plugins: [new HtmlWebpackPlugin()],
};
