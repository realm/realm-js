import { Credentials } from "realm";

export function authenticateUserBefore() {
  before(async function(this: AppContext & Partial<UserContext>) {
    if (this.app) {
      this.user = this.app.currentUser || await this.app.logIn(Credentials.anonymous());
    } else {
      throw new Error("Missing app on context. Did you forget to use the importAppBefore hook?");
    }
  });
}