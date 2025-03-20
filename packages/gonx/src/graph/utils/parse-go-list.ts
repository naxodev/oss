import { GoListType } from '../types/go-list-type';
import { REGEXS } from './regexs';

/**
 * Parses a Go list (also support list with only one item).
 *
 * @param listType type of list to parse
 * @param content list to parse as a string
 */
export const parseGoList = (
  listType: GoListType,
  content: string
): string[] => {
  const exec = REGEXS[listType].exec(content);
  return (
    (exec?.[2] ?? exec?.[3])
      ?.trim()
      .split(/\n+/)
      .map((line) => line.trim()) ?? []
  );
};
