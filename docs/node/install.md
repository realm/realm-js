# Install the Node.js SDK
## Overview
The Realm SDK for Node.js enables development of applications using the
JavaScript and TypeScript languages. The Node.js SDK is best suited for
writing server-side applications. Your Node.js application could be one
component in a wider stack that also includes iOS and Android apps.

The Node.js SDK is not suitable for front-end application development.

- Due to limitations of the browser environment, it is not possible to build a
browser-based web app with this SDK. For front-end web applications, use the
Web SDK.
- For cross-platform mobile app development, use the React Native SDK.

## Prerequisites
Before getting started, ensure your environment meets the
following prerequisites:

- [Node.js](https://nodejs.org/en/) version 12.x or later (including Node.js version 14)
- Linux, macOS 10.8 (or later), or Windows 8 (or later)

## Installation
Follow these steps to create a Node.js project and add the Node.js SDK to it.

> **TIP:**
> The SDK uses Realm Core database for device data persistence. When you
install the Node.js SDK, the package names reflect Realm naming.
>

#### Create a Node.js Project
Create your Node.js project by creating a new directory
for your project and running `npm init` in that
directory. In the example below, replace `MyApp`
with your desired project name. Answer all of the prompts
to fill out the details of your project.

```bash
mkdir MyApp && cd MyApp && npm init
```

#### Install the SDK with NPM
In your Node.js project directory, use the following command
to add the SDK to your project:

```bash
npm install realm
```

#### Enable TypeScript (optional)
TypeScript is a superset of JavaScript that adds static
type checking and other features intended to make
application-scale development more robust. If you'd like
to use TypeScript, follow the TypeScript team's official
[Node Starter guide](https://github.com/Microsoft/TypeScript-Node-Starter#typescript--node).
The SDK supports TypeScript natively and integrates easily
into a TypeScript project.

## IoT Installation
> **TIP:**
> The SDK uses Realm Core database for device data persistence. When you
install the Node.js SDK, the package names reflect Realm naming.
>

To create a Node.js project and add the Node.js SDK on an
Internet of Things (IoT) platform such as the Raspberry Pi 2, 3, or 4
running Raspberry Pi OS (formerly Raspbian), follow the steps below:

#### Install a C++ Compiler
The  Node.js SDK's IoT library is not distributed as a binary, so you
must build it from source. To do this, you'll need a working C++ compiler.
To install such a compiler on your IoT device, run the following command:

```bash
sudo apt install build-essential g++ libssl-dev
```

#### Create a Node.js Project
Create your Node.js project by creating a new directory
for your project and running `npm init` in that
directory. In the example below, replace `MyApp`
with your desired project name. Answer all of the prompts
to fill out the details of your project.

```bash
mkdir MyApp && cd MyApp && npm init
```

#### Install the SDK with NPM
In your Node.js project directory, use the following command
to add the SDK to your project:

```bash
npm install realm
```

#### Enable TypeScript (optional)
TypeScript is a superset of JavaScript that adds static
type checking and other features intended to make
application-scale development more robust. If you'd like
to use TypeScript, follow the TypeScript team's official
[Node Starter guide](https://github.com/Microsoft/TypeScript-Node-Starter#typescript--node).
The SDK supports TypeScript natively and integrates easily
into a TypeScript project.

## Import the SDK
Add the following line to the top of your source files (JavaScript or TypeScript) where
you want to use the SDK:

```javascript
import Realm from "realm";
```
