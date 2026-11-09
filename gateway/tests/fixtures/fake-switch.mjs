#!/usr/bin/env node
// Giả `agy-switch proxy start --port P --pid-file F`: bật một máy chủ TCP tách rời trên cổng P, ghi pid vào F.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const port = args[args.indexOf("--port") + 1];
const pidFile = args[args.indexOf("--pid-file") + 1];
if (args[0] !== "proxy" || args[1] !== "start") process.exit(2);
const child = spawn(process.execPath, ["-e", `require("node:net").createServer((s) => s.end()).listen(${Number(port)}, "127.0.0.1")`], { detached: true, stdio: "ignore" });
child.unref();
writeFileSync(pidFile, String(child.pid));
