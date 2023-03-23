import React, { useEffect, useState } from "react";

import useAnimationFrame from "./hooks/useAnimationFrame";
import useRealm from "./hooks/useRealm";
import { getApp } from "./app-services/app";
import "./App.css";

const app = getApp();

const ANIMATION_SCALE_STEP = 0.05;
const MAX_ANIMATION_SCALE = 8;
const MIN_ANIMATION_SCALE = 1;

const enum ScaleDirection { Up, Down };

function App() {
  const [animation, setAnimation] = useState({ scale: MIN_ANIMATION_SCALE, direction: ScaleDirection.Up });

  const {
    user,
    logIn,
    openRealm,
    closeRealm,
  } = useRealm(app);

  useEffect(() => {
    if (!user) {
      logIn();
    }
  }, []); // Don't add `user` to the dependency array.

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
  }, animation.scale);

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
