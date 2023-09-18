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

import { FormEvent, useState } from 'react';

import styles from '../styles/AddTaskForm.module.css';

type AddTaskFormProps = {
  onSubmit: (description: string) => void;
};

export function AddTaskForm({ onSubmit }: AddTaskFormProps) {
  const [description, setDescription] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onSubmit(description);
    setDescription('');
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        className={styles.input}
        type='text'
        placeholder='Add a new task'
        value={description}
        onChange={(event) => setDescription(event.currentTarget.value)}
        autoCorrect='off'     // Safari only
        autoCapitalize='none' // Safari only
      />
      <button className={styles.button} type='submit'>
        ＋
      </button>
    </form>
  );
}
