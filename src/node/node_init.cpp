////////////////////////////////////////////////////////////////////////////
//
// Copyright 2016 Realm Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
////////////////////////////////////////////////////////////////////////////

//NAPI: Enable NAPI Realm module convertion
//NAPI: FIXME: tidy up when convertion is complete

#include "node_init.hpp"
#include "napi.h"

#include "js_realm.hpp"
#if REALM_ENABLE_SYNC
#include "js_adapter.hpp"
#endif

 namespace realm {
 namespace node {

static void napi_init(Napi::Env env, v8::Isolate* isolate, Napi::Object exports) {
	//v8::Local<v8::Function> realm_constructor = js::RealmClass<Types>::create_constructor(env);
	Napi::Function realm_constructor = js::RealmClass<Types>::create_constructor(env);

	/*auto ctorName = realm_constructor.GetName().As<v8::String>();
	v8::String::Utf8Value value(ctorName);
	char* v = *value;
	Napi::String::New(env, v);*/
	//Nan::Set(exports, realm_constructor->GetName(), realm_constructor);
	//exports.Set(Napi::String::New(env, v), Napi::Function::New(env, Method));
}


} // node
} // realm

static Napi::String Method(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  return Napi::String::New(env, "world");
}

static Napi::Object NAPI_Init(Napi::Env env, Napi::Object exports) {
//NAPI: Enable NAPI Realm module convertion
//NAPI: FIXME: remove when NAPI complete
/////////////////////
  napi_env e  =  env;
  v8::Isolate* isolate = (v8::Isolate*)e + 3;
  //the following two will fail or context will be null if isolate is not found at the expected location
  auto currentIsolate = isolate->GetCurrent();
  auto context = currentIsolate->GetCurrentContext();
/////////////////////

  realm::node::napi_init(env, currentIsolate, exports);
  exports.Set(Napi::String::New(env, "hello"), Napi::Function::New(env, Method));
  return exports;
}

NODE_API_MODULE(hello, NAPI_Init)

//NODE_MODULE_CONTEXT_AWARE(Realm, realm::node::init);





