/**  By default, it writes logs to the following locations:
 * on Linux: ~/.config/{app name}/logs/{process type}.log
 * on macOS: ~/Library/Logs/{app name}/{process type}.log
 * on Windows: %USERPROFILE%\AppData\Roaming\{app name}\logs\{process type}.log
 * @see https://www.npmjs.com/package/electron-log
 */

import log from 'electron-log'
import pc from 'picocolors'

Object.assign(console, log.functions)
log.variables.process = 'main'
log.transports.console.format = `[{process}] ${pc.dim(
  '{h}:{i}:{s}{scope}'
)} {level} › {text}`
log.transports.file.level = 'info'

log.info(
  `\n\n██╗   ██╗███████╗███████╗██████╗ ██╗      █████╗ ██╗   ██╗███╗   ███╗██╗   ██╗███████╗██╗ ██████╗
╚██╗ ██╔╝██╔════╝██╔════╝██╔══██╗██║     ██╔══██╗╚██╗ ██╔╝████╗ ████║██║   ██║██╔════╝██║██╔════╝
 ╚████╔╝ █████╗  ███████╗██████╔╝██║     ███████║ ╚████╔╝ ██╔████╔██║██║   ██║███████╗██║██║     
  ╚██╔╝  ██╔══╝  ╚════██║██╔═══╝ ██║     ██╔══██║  ╚██╔╝  ██║╚██╔╝██║██║   ██║╚════██║██║██║     
   ██║   ███████╗███████║██║     ███████╗██║  ██║   ██║   ██║ ╚═╝ ██║╚██████╔╝███████║██║╚██████╗
   ╚═╝   ╚══════╝╚══════╝╚═╝     ╚══════╝╚═╝  ╚═╝   ╚═╝   ╚═╝     ╚═╝ ╚═════╝ ╚══════╝╚═╝ ╚═════╝\n`
)

export default log

log.info(`[logger] logger initialized`)
