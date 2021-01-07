import { useCallback } from "react";
import { useCurrentUser } from "realm-hooks";

export function Overview() {
  const user = useCurrentUser();
  const handleLogOut = useCallback(() => {
    user.logOut();
  }, [user]);
  return (
    <div>
      <p>Logged in as {user.id}</p>
      <button onClick={handleLogOut}>Log out</button>
    </div>
  )
}
