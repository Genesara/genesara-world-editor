/**
 * Tri-state PATCH field, matching the backend's `MaybeSet` convention:
 *  - omitted key       -> field unchanged
 *  - key present, null -> explicit null
 *  - key present, val  -> set to val
 *
 * In form state we track this as either `{ touched: false }` (omit on the wire)
 * or `{ touched: true, value: T | null }` (serialize the value verbatim).
 */
export type PatchField<T> = { touched: false } | { touched: true; value: T | null };

export const unchanged = <T,>(): PatchField<T> => ({ touched: false });
export const setTo = <T,>(value: T | null): PatchField<T> => ({ touched: true, value });

/**
 * Serializes an object of PatchField values into a wire-shape object that:
 *  - drops untouched keys entirely
 *  - emits explicit nulls for touched-null
 *  - emits the value for touched-value
 */
export function serializePatch<TIn extends Record<string, PatchField<unknown>>>(
  fields: TIn,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, f] of Object.entries(fields)) {
    if (f.touched) out[k] = f.value;
  }
  return out;
}

/**
 * Helper that returns true if any field in the patch is touched
 * (i.e. the user has staged a change). Useful for disabling "Apply" buttons.
 */
export function isPatchDirty(fields: Record<string, PatchField<unknown>>): boolean {
  return Object.values(fields).some((f) => f.touched);
}
