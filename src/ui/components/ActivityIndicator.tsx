import { useEffect, useState } from 'react';
import { Text } from 'ink';
import { palette } from '../theme/palette.ts';

/** Animation lives in one small leaf component rather than refreshing the tree. */
export function ActivityIndicator({ motion, paused, ascii }: { readonly motion: boolean; readonly paused: boolean; readonly ascii: boolean }) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!motion || paused) return;
    const timer = setInterval(() => { setFrame(value => value + 1); }, 250);
    return () => { clearInterval(timer); };
  }, [motion, paused]);
  const frames = ascii ? '|/-\\' : '◐◓◑◒';
  return <Text color={paused ? palette.warning : palette.graphics}>{paused ? 'P' : motion ? frames[frame % frames.length] : ascii ? '*' : '●'}</Text>;
}
