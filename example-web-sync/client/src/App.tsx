import React, { useEffect, useState } from "react";
import Realm from "realm";

import useAnimationFrame from "./hooks/useAnimationFrame";
import useRealm from "./hooks/useRealm";
import config from "./config/app-services.json";
import "./App.css";

const { appId } = config;
const app = new Realm.App({ id: appId });

const ANIMATION_SCALE_STEP = 0.05;
const MAX_ANIMATION_SCALE = 10;
const MIN_ANIMATION_SCALE = 1;

const enum ScaleDirection { Up, Down };

function App() {
  const [animation, setAnimation] = useState({ scale: MIN_ANIMATION_SCALE, direction: ScaleDirection.Up });
  const { user, logIn, openRealm, closeRealm } = useRealm(app);

  // The user gets logged in only when the component mounts.
  useEffect(() => {
    if (!user) {
      logIn();
    }
  }, [/* Don't add `user` to this dependency array */]);

  // The realm is only opened once a user has been logged in.
  useEffect(() => {
    if (!user) {
      return;
    }
    openRealm();

    return closeRealm;
  }, [user]);

  const scaleUp = (): void => {
    setAnimation((previous) => ({
      scale: Math.min(previous.scale + ANIMATION_SCALE_STEP, MAX_ANIMATION_SCALE),
      direction: ScaleDirection.Up
    }));
  };

  const scaleDown = (): void => {
    setAnimation((previous) => ({
      scale: Math.max(previous.scale - ANIMATION_SCALE_STEP, MIN_ANIMATION_SCALE),
      direction: ScaleDirection.Down
    }));
  };

  useAnimationFrame(() => {
    if (animation.direction === ScaleDirection.Up) {
      animation.scale === MAX_ANIMATION_SCALE ? scaleDown() : scaleUp();
    }
    else {
      animation.scale === MIN_ANIMATION_SCALE ? scaleUp() : scaleDown();
    }
  }, [animation.scale]);

  return (
    <div className="App">
      <div className="animation-container">
        <div
          className="animation"
          style={{ transform: `scale(${animation.scale})` }}
        />
      </div>
    </div>
  );
}

export default App;
