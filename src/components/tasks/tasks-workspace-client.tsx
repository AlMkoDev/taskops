'use client';

import { useEffect, useState } from 'react';
import { TasksWorkspace } from './tasks-workspace';

export function TasksWorkspaceClient() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return <TasksWorkspace />;
}
