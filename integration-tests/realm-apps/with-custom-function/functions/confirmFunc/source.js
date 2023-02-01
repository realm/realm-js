////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
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

/*

    This function will be run AFTER a user registers their username and password and is called with an object parameter
    which contains three keys: 'token', 'tokenId', and 'username'.

    The return object must contain a 'status' key which can be empty or one of three string values: 
      'success', 'pending', or 'fail'.

    'success': the user is confirmed and is able to log in.

    'pending': the user is not confirmed and the UserPasswordAuthProviderClient 'confirmUser' function would 
      need to be called with the token and tokenId via an SDK. (see below)

      const emailPassClient = Stitch.defaultAppClient.auth
        .getProviderClient(UserPasswordAuthProviderClient.factory);

      return emailPassClient.confirmUser(token, tokenId);

    'fail': the user is not confirmed and will not be able to log in.

    If an error is thrown within the function the result is the same as 'fail'.

    Example below:

    exports = ({ token, tokenId, username }) => {
      // process the confirm token, tokenId and username
      if (context.functions.execute('isValidUser', username)) {
        // will confirm the user
        return { status: 'success' };
      } else {
        context.functions.execute('sendConfirmationEmail', username, token, tokenId);
        return { status: 'pending' };
      }
  
      return { status: 'fail' };
    };

    The uncommented function below is just a placeholder and will result in failure.
  */

exports = ({ token, tokenId, username }) => {
  // process the confirm token, tokenId and username

  /*
        usernames that contain realm_tests_do_autoverify* will automatically be registered and approved.
        usernames that contain realm_tests_do_pendverify* will automatically be registered pending approval.
        all other usernames will fail verification and not be registered.
      */

  if (username.includes("realm_tests_do_autoverify")) {
    return { status: "success" };
  }

  if (username.includes("realm_tests_do_pendverify")) {
    return { status: "pending" };
  }

  // do not confirm the user
  return { status: "fail" };
};
