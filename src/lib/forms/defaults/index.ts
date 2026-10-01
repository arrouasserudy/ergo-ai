import { normalizeForm } from "../normalize";
import type { FormSchema } from "../schema";
import type { BuiltinFormDefinition } from "./build";
import { eatingObservation } from "./eating-observation";
import { evaluation } from "./evaluation";

export type BuiltinForm = { key: string; version: number; schema: FormSchema };

/** The source definitions, in the order they are created in a new cabinet. */
export const BUILTIN_DEFINITIONS: BuiltinFormDefinition[] = [eatingObservation, evaluation];

/** Forms kept in every cabinet's library; ids assigned by `normalizeForm`, as for converted forms. */
export const BUILTIN_FORMS: BuiltinForm[] = BUILTIN_DEFINITIONS.map(({ key, version, source }) => ({
  key,
  version,
  schema: normalizeForm(source, source.title, source.language),
}));
