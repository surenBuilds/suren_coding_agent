import path from 'path';

/**
 * Resolves `inputPath` against `baseCwd` and guarantees the result stays
 * inside `baseCwd`. Throws if the resolved path would escape the boundary
 * via `../` segments, an absolute path pointing elsewhere, symlink-style
 * traversal encoded in the string, etc.
 *
 * This is the single choke point every project-scoped filesystem/terminal
 * tool must go through — do not resolve paths ad hoc elsewhere.
 */
export function safeResolve(baseCwd: string, inputPath: string): string {
  const normalizedBase = path.resolve(baseCwd);
  const candidate = String(inputPath ?? '.');

  // Absolute paths are only allowed if they already live inside the base.
  const resolved = path.isAbsolute(candidate)
    ? path.normalize(candidate)
    : path.resolve(normalizedBase, candidate);

  const relative = path.relative(normalizedBase, resolved);
  const escapesBase = relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative);

  if (escapesBase) {
    throw new Error(
      `Path traversal blocked: "${inputPath}" resolves outside the project root (${normalizedBase}).`
    );
  }

  return resolved;
}
