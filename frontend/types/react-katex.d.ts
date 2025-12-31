declare module 'react-katex' {
  import type { ComponentType } from 'react';

  export const BlockMath: ComponentType<{ math: string }>;
  export const InlineMath: ComponentType<{ math: string }>;
}
