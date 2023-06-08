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
