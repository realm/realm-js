import React, { FormEvent, useState } from 'react';

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
    <div>
      <form onSubmit={handleSubmit}>
        <input
          type='text'
          placeholder='Enter new task description'
          value={description}
          onChange={(event) => setDescription(event.currentTarget.value)}
          autoCorrect='off'     // Safari only
          autoCapitalize='none' // Safari only
        />
        <button type='submit'>
          ＋
        </button>
      </form>
    </div>
  );
}
