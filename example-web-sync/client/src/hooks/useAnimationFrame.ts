import React, { useEffect, useRef } from "react";

function useAnimationFrame<DependencyT>(nextUpdate: () => void, dependency?: DependencyT) {
  const frameRef = useRef(0);

  const animate = (): void => {
    nextUpdate();
    frameRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    frameRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frameRef.current);
  }, [dependency]);
}

export default useAnimationFrame;
