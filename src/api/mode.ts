export function shouldUseMockApi(value: string | undefined, production: boolean): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  return !production;
}
