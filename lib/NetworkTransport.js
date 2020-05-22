"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var abort_controller_1 = require("abort-controller");
var DefaultNetworkTransport = /** @class */ (function () {
    function DefaultNetworkTransport() {
        // Determine the fetch implementation
        if (!DefaultNetworkTransport.fetch) {
            // Try to get it from the global
            if (typeof fetch === "function" && typeof window === "object") {
                DefaultNetworkTransport.fetch = fetch.bind(window);
            }
            else if (typeof process === "object" &&
                typeof require === "function" &&
                "node" in process.versions) {
                // Making it harder for the static analyzers see this require call
                var nodeRequire = require;
                DefaultNetworkTransport.fetch = nodeRequire("node-fetch");
            }
            else {
                throw new Error("DefaultNetworkTransport.fetch must be set before it's used");
            }
        }
        // Determine the AbortController implementation
        if (!DefaultNetworkTransport.AbortController) {
            if (typeof abort_controller_1.AbortController !== "undefined") {
                DefaultNetworkTransport.AbortController = abort_controller_1.AbortController;
            }
            else if (typeof process === "object" &&
                typeof require === "function" &&
                "node" in process.versions) {
                // Making it harder for the static analyzers see this require call
                var nodeRequire = require;
                DefaultNetworkTransport.AbortController = nodeRequire("abort-controller");
            }
            else {
                throw new Error("DefaultNetworkTransport.AbortController must be set before it's used");
            }
        }
    }
    DefaultNetworkTransport.prototype.fetchAndParse = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            var response, contentType, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 7, , 8]);
                        return [4 /*yield*/, this.fetch(request)];
                    case 1:
                        response = _a.sent();
                        contentType = response.headers.get("content-type");
                        if (!response.ok) return [3 /*break*/, 5];
                        if (!(contentType && contentType.startsWith("application/json"))) return [3 /*break*/, 3];
                        return [4 /*yield*/, response.json()];
                    case 2: 
                    // Awaiting the response to ensure we'll throw our own error
                    return [2 /*return*/, _a.sent()];
                    case 3: throw new Error("Expected a JSON response");
                    case 4: return [3 /*break*/, 6];
                    case 5: 
                    // TODO: Check if a message can be extracted from the response
                    throw new Error("Unexpected status code (" + response.status + " " + response.statusText + ")");
                    case 6: return [3 /*break*/, 8];
                    case 7:
                        err_1 = _a.sent();
                        throw new Error("Request failed (" + request.method + " " + request.url + "): " + err_1.message);
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    DefaultNetworkTransport.prototype.fetchWithCallbacks = function (request, handler) {
        var _this = this;
        // tslint:disable-next-line: no-console
        this.fetch(request)
            .then(function (response) { return __awaiter(_this, void 0, void 0, function () {
            var decodedBody, responseHeaders;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, response.text()];
                    case 1:
                        decodedBody = _a.sent();
if (response.status >= 400) {
                             throw {
                                 statusCode: response.status,
                                 errorMessage: decodedBody,
                             };
                         }
                        responseHeaders = {};
                        response.headers.forEach(function (value, key) {
                            responseHeaders[key] = value;
                        });
                        return [2 /*return*/, {
                                statusCode: response.status,
                                headers: responseHeaders,
                                body: decodedBody,
                            }];
                }
            });
        }); })
            .then(function (r) { return handler.onSuccess(r); })
            .catch(function (e) { return handler.onError(e); });
    };
    DefaultNetworkTransport.prototype.fetch = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            var method, url, body, timeoutMs, _a, headers, _b, signal, cancelTimeout;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        method = request.method, url = request.url, body = request.body, timeoutMs = request.timeoutMs, _a = request.headers, headers = _a === void 0 ? DefaultNetworkTransport.DEFAULT_HEADERS : _a;
                        _b = this.createTimeoutSignal(timeoutMs), signal = _b.signal, cancelTimeout = _b.cancelTimeout;
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, , 3, 4]);
                        return [4 /*yield*/, DefaultNetworkTransport.fetch(url, {
                                method: method,
                                headers: headers,
                                body: typeof body === "string" ? body : JSON.stringify(body),
                                signal: signal,
                            })];
                    case 2: 
                    // We'll await the response to catch throw our own error
                    return [2 /*return*/, _c.sent()];
                    case 3:
                        // Whatever happens, cancel any timeout
                        cancelTimeout();
                        return [7 /*endfinally*/];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    DefaultNetworkTransport.prototype.createTimeoutSignal = function (timeoutMs) {
        if (typeof timeoutMs === "number") {
            var controller_1 = new DefaultNetworkTransport.AbortController();
            // Call abort after a specific number of milliseconds
            var timeout_1 = setTimeout(function () {
                controller_1.abort();
            }, timeoutMs);
            return {
                signal: controller_1.signal,
                cancelTimeout: function () {
                    clearTimeout(timeout_1);
                },
            };
        }
        else {
            return {
                signal: undefined,
                cancelTimeout: function () {
                    /* No-op */
                },
            };
        }
    };
    DefaultNetworkTransport.DEFAULT_HEADERS = {
        Accept: "application/json",
        "Content-Type": "application/json",
    };
    return DefaultNetworkTransport;
}());
exports.DefaultNetworkTransport = DefaultNetworkTransport;
