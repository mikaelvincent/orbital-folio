// Compile once before benchmark recovery; run the binary outside timed kernels.
// ProcessInfo reports OS thermal pressure, not temperature or a guaranteed clock.
// https://developer.apple.com/documentation/foundation/processinfo
// https://github.com/apple-oss-distributions/PowerManagement/blob/main/pmset/pmset.1
import Foundation
import Darwin

let arguments = Set(CommandLine.arguments.dropFirst())
let supportedArguments: Set<String> = ["--pmset", "--settings"]
if !arguments.isSubset(of: supportedArguments) {
    FileHandle.standardError.write(Data("Usage: mac-thermal-snapshot [--pmset] [--settings]\n".utf8))
    exit(2)
}

func pmsetSnapshot(_ argument: String) -> [String: Any] {
    let process = Process()
    let output = Pipe()
    let errors = Pipe()
    process.executableURL = URL(fileURLWithPath: "/usr/bin/pmset")
    process.arguments = ["-g", argument]
    process.standardOutput = output
    process.standardError = errors
    let started = ProcessInfo.processInfo.systemUptime
    do {
        try process.run()
        // These read-only pmset queries produce small outputs. Bound a stalled
        // query so unavailable telemetry cannot block the benchmark indefinitely.
        while process.isRunning && ProcessInfo.processInfo.systemUptime - started < 2 {
            Thread.sleep(forTimeInterval: 0.01)
        }
        let timedOut = process.isRunning
        if timedOut {
            process.terminate()
            let terminationStarted = ProcessInfo.processInfo.systemUptime
            while process.isRunning && ProcessInfo.processInfo.systemUptime - terminationStarted < 0.25 {
                Thread.sleep(forTimeInterval: 0.01)
            }
            if process.isRunning {
                kill(process.processIdentifier, SIGKILL)
            }
        }
        process.waitUntilExit()
        return [
            "arguments": ["-g", argument],
            "stdout": String(decoding: output.fileHandleForReading.readDataToEndOfFile(), as: UTF8.self),
            "stderr": String(decoding: errors.fileHandleForReading.readDataToEndOfFile(), as: UTF8.self),
            "exitCode": Int(process.terminationStatus),
            "timedOut": timedOut,
            "durationMs": (ProcessInfo.processInfo.systemUptime - started) * 1000,
        ]
    } catch {
        return ["arguments": ["-g", argument], "error": String(describing: error), "exitCode": NSNull(), "timedOut": false]
    }
}

let processInfo = ProcessInfo.processInfo
let started = processInfo.systemUptime
let thermalState = processInfo.thermalState
let stateName: String
switch thermalState {
case .nominal: stateName = "nominal"
case .fair: stateName = "fair"
case .serious: stateName = "serious"
case .critical: stateName = "critical"
@unknown default: stateName = "unavailable"
}

var report: [String: Any] = [
    "schemaVersion": 1,
    "thermalState": stateName,
    "thermalStateRaw": thermalState.rawValue,
    "thermalSource": "ProcessInfo.thermalState",
    "thermalStateDoesNotMeasureTemperature": true,
    "timestamp": ISO8601DateFormatter().string(from: Date()),
    "uptimeSeconds": started,
    "osVersion": processInfo.operatingSystemVersionString,
]
if #available(macOS 12.0, *) {
    report["lowPowerMode"] = processInfo.isLowPowerModeEnabled
} else {
    report["lowPowerMode"] = NSNull()
}
if arguments.contains("--pmset") || arguments.contains("--settings") {
    var pmset = ["therm": pmsetSnapshot("therm"), "battery": pmsetSnapshot("batt")]
    if arguments.contains("--settings") {
        pmset["settings"] = pmsetSnapshot("custom")
    }
    report["pmset"] = pmset
}
report["sampleDurationMs"] = (processInfo.systemUptime - started) * 1000
do {
    let data = try JSONSerialization.data(withJSONObject: report, options: [.sortedKeys])
    FileHandle.standardOutput.write(data)
    FileHandle.standardOutput.write(Data("\n".utf8))
} catch {
    FileHandle.standardError.write(Data("Could not serialize thermal snapshot: \(error)\n".utf8))
    exit(1)
}
