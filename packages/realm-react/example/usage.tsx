// Top level component with the RealmAppProvider.
export default function AppWrapper() {
  return (
    <RealmAppProvider id="app-id">
      <App />
    </RealmAppProvider>
  );
}

// This component needs to be one level below the `RealmAppProvider`
// in order to access its context via `useAuth`.
//
// TODO: think of alternatives to this for common use cases? e.g. could
// we pass the app directly to `RealmProvider` for single Realm projects?
function App() {
  const { authenticatedUser } = useAuth();

  // If we are authenticated, create the Realm and show MainScreen, otherwise
  // show AuthScreen
  return authenticatedUser ? (
    <RealmProvider sync={{ flexible: true, user: authenticatedUser }}>
      <MainScreen />
    </RealmProvider>
  ) : (
    <AuthScreen />
  );
}

// Render a list of tasks, using flexible sync.
function MainScreen() {
  const { updateSubscriptions, updateSubscriptionsResult } = useSubscriptions();

  const tasks = useQuery("Task");

  // On mounting this component, update the subscriptions to get the tasks.
  // This is a no-op if that subscription already exists (i.e. not the first startup).
  useEffect(() => {
    updateSubscriptions((subs, realm) => {
      subs.add(tasks);
    });
  });

  // If there was an error updating/synchronising subscriptions, show an error message
  if (updateSubscriptionsResult.error) return <Text>There was an error!</Text>;
  // Show a loading message while the subscriptions are synchronising
  else if (updateSubscriptionsResult.pending) return <Text>Please wait...</Text>;
  // Subscriptions are synchronised and data is ready to go, render the task list
  else <TaskList tasks={tasks} />;
}

// Show a login/register screen. When login succeeds, `authenticatedUser` from `useAuth`
// will return a `Realm.User`, and so the `App` component will show the `MainScreen`
// without us needing to manually handle the successful login.
function AuthScreen() {
  const { loginUser, loginResult, registerUser, registerResult } = useEmailPasswordAuth();

  const handleLogin = (email: string, password: string) => {
    loginUser(email, password);
  };

  const handleRegister = (email: string, password: string) => {
    registerUser(email, password);
  };

  return (
    <LoginRegisterForm
      onLogin={handleLogin}
      onRegister={handleRegister}
      // Show a loading spinner while an operation is in progress
      showSpinner={loginResult.pending || registerResult.pending}
      // Show an error message if there was an error logging in
      loginError={loginResult.error?.message}
      // Show an error message if there was an error registering
      registerError={registerResult.error?.message}
    />
  );
}
