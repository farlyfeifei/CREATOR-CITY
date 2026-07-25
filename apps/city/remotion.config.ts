import { Config } from "@remotion/cli/config";
import { existsSync } from "node:fs";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setConcurrency(1);

const windowsEdge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
if (process.platform === "win32" && existsSync(windowsEdge)) Config.setBrowserExecutable(windowsEdge);
