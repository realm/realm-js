import React from 'react';
import { useApp } from "realm-hooks";

import './Header.css';

export function Header() {
  const app = useApp();
  return <header className="Header">Application id is {app.id}</header>
}
