// Offline authoring only. Uses the macOS SDK; no browser or screen capture.
import Foundation
import AVFoundation
import CoreGraphics
import ImageIO

let args = CommandLine.arguments
if args.count != 4 { fatalError("Usage: swift encode-video.swift <frames-directory> <output.mp4> <fps>") }
let folder = URL(fileURLWithPath: args[1])
let output = URL(fileURLWithPath: args[2])
let fps = Int32(args[3])!
let files = try FileManager.default.contentsOfDirectory(at: folder, includingPropertiesForKeys: nil).filter { $0.pathExtension == "png" }.sorted { $0.lastPathComponent < $1.lastPathComponent }
let width = 640, height = 360
try? FileManager.default.removeItem(at: output)
let writer = try AVAssetWriter(outputURL: output, fileType: .mp4)
let input = AVAssetWriterInput(mediaType: .video, outputSettings: [AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: width, AVVideoHeightKey: height, AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 700_000, AVVideoProfileLevelKey: AVVideoProfileLevelH264BaselineAutoLevel]])
input.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB, kCVPixelBufferWidthKey as String: width, kCVPixelBufferHeightKey as String: height, kCVPixelBufferCGImageCompatibilityKey as String: true, kCVPixelBufferCGBitmapContextCompatibilityKey as String: true])
writer.add(input)
writer.shouldOptimizeForNetworkUse = true
writer.startWriting()
writer.startSession(atSourceTime: .zero)
for (index, file) in files.enumerated() {
  let deadline = Date().addingTimeInterval(30)
  while !input.isReadyForMoreMediaData {
    if writer.status == .failed || Date() > deadline { fatalError(writer.error?.localizedDescription ?? "Video encoder timed out") }
    Thread.sleep(forTimeInterval: 0.002)
  }
  guard let source = CGImageSourceCreateWithURL(file as CFURL, nil), let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else { fatalError("Invalid PNG frame") }
  var pixelBuffer: CVPixelBuffer?
  CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &pixelBuffer)
  guard let pixelBuffer else { fatalError("Pixel buffer allocation failed") }
  CVPixelBufferLockBaseAddress(pixelBuffer, [])
  let context = CGContext(data: CVPixelBufferGetBaseAddress(pixelBuffer), width: width, height: height, bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(pixelBuffer), space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue)!
  context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
  CVPixelBufferUnlockBaseAddress(pixelBuffer, [])
  if !adaptor.append(pixelBuffer, withPresentationTime: CMTime(value: Int64(index), timescale: fps)) { fatalError(writer.error?.localizedDescription ?? "Frame append failed") }
}
input.markAsFinished()
let done = DispatchSemaphore(value: 0)
writer.finishWriting { done.signal() }
done.wait()
if writer.status != .completed { fatalError(writer.error?.localizedDescription ?? "Video encode failed") }
print("Encoded \(files.count) frames at \(fps) fps")
