import styles from '../styles/IntroText.module.css';

export function IntroText() {
  return (
    <div className={styles.container}>
      <p>
        Welcome to a MongoDB Realm, WASM, and Sync app!
      </p>
      <p>
        Add a task using the form at the top of the screen. It will create a
        task and store it in an in-memory realm, then sync it to MongoDB Atlas
        and any other apps connected to the same Atlas App.
      </p>
    </div>
  );
}
