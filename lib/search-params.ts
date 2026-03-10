export type SearchParamValue =
  | string
  | number
  | boolean
  | null
  | undefined;

export type SearchParamsInput = Record<string, string | string[] | undefined>;

export function firstParamValue(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value.at(0);
  }

  return value;
}

export function buildUrlSearchParams(
  entries: Array<readonly [string, SearchParamValue]>,
): URLSearchParams {
  const params = new URLSearchParams();

  for (const [key, value] of entries) {
    if (value == null || value === "") {
      continue;
    }

    params.set(key, String(value));
  }

  return params;
}
