import React, { DependencyList, useEffect, useRef } from "react";

function useAnimationFrame(nextUpdate: () => void, dependencies: DependencyList = []) {
  const frameRef = useRef(0);

  const animate = (): void => {
    nextUpdate();
    frameRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    frameRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frameRef.current);
  }, dependencies);
}

export default useAnimationFrame;
