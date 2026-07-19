/** Ambient declarations for non-TS assets imported by the Vite-bundled UI. */
declare module '*.css';
declare module '*.svg?raw' {
  const src: string;
  export default src;
}
