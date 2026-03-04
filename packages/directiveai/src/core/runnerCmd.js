export function buildRunnerCommand({ profileCfg, actionCmd }) {
  const install = (profileCfg.install || []).join(" && ");
  if (install) return `${install} && ${actionCmd}`;
  return actionCmd;
}
