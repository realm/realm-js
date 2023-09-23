////////////////////////////////////////////////////////////////////////////
//
// Copyright 2023 Realm Inc.
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

import React, {memo} from 'react';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import {colors} from '../styles/colors';

type IconProps = {
  name: string;
  size: number;
  color?: string;
} & React.ComponentProps<typeof MaterialCommunityIcons>;

export const Icon = memo(function ({
  name,
  size,
  color = colors.white,
  ...otherProps
}: IconProps) {
  return (
    <MaterialCommunityIcons
      name={name}
      color={color}
      size={size}
      {...otherProps}
    />
  );
});
