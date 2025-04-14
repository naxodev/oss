import { GoListType } from '../types/go-list-type';

export const REGEXS: Record<GoListType | 'version', RegExp> = {
  import: /import\s+(?:(\w+)\s+)?"([^"]+)"|\(([\s\S]*?)\)/,
  use: /use\s+(\(([^)]*)\)|([^\n]*))/,
  version: /go(?<version>\S+) /,
};
