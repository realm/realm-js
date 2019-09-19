#pragma once

#include "napi.h"
#include "v8.h"

//NAPI: FIXME: remove when NAPI complete
/////////////////////
namespace realm {
	namespace node {
		static v8::Isolate* getIsolate(const Napi::Env env) {
			napi_env e = env;
			v8::Isolate* isolate = (v8::Isolate*)e + 3;
			//the following two will fail or context will be null if isolate is not found at the expected location
			auto currentIsolate = isolate->GetCurrent();
			auto context = currentIsolate->GetCurrentContext();

			return isolate;
		}
	}
}
/////////////////////