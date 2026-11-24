import { createLoader, parseAsArrayOf, parseAsString, parseAsStringLiteral } from "nuqs/server";
import { AGE_BANDS, RISK_LEVELS, SORTS } from "../schemas";

/**
 * Directory URL contract, shared by the server loader (first render) and the
 * client hooks, so a bookmarked URL and the live UI always agree.
 */
export const directoryParsers = {
  q: parseAsString.withDefault(""),
  risk: parseAsArrayOf(parseAsStringLiteral(RISK_LEVELS)).withDefault([]),
  condition: parseAsString,
  age: parseAsStringLiteral(AGE_BANDS),
  sort: parseAsStringLiteral(SORTS).withDefault("risk"),
};

export const loadDirectoryParams = createLoader(directoryParsers);
