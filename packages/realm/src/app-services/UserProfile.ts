////////////////////////////////////////////////////////////////////////////
//
// Copyright 2022 Realm Inc.
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

export type DefaultUserProfileData = {
  /**
   * The commonly displayed name of the user.
   */
  name?: string;

  /**
   * The users email address.
   */
  email?: string;

  /**
   * A URL referencing a picture associated with the user.
   */
  pictureUrl?: string;

  /**
   * The users first name.
   */
  firstName?: string;

  /**
   * The users last name.
   */
  lastName?: string;

  /**
   * The users gender.
   */
  gender?: string; // TODO: Determine if this is free-text or actually an enum type.

  /**
   * The users birthday.
   */
  birthday?: string; // TODO: Determine the format.

  /**
   * The minimal age of the user.
   */
  minAge?: string;

  /**
   * The maximal age of the user.
   */
  maxAge?: string;
} & {
  /**
   * Authentication providers might store additional data here.
   */
  [key: string]: unknown;
};
