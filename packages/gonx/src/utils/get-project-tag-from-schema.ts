export function getProjectTagsFromSchema(options: { tags?: string }): string[] {
  return options.tags ? options.tags.split(',').map((s) => s.trim()) : [];
}
