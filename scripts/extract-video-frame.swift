import AVFoundation
import AppKit
import Foundation

guard CommandLine.arguments.count == 3 else {
  fputs("usage: extract-video-frame <video> <output.png>\n", stderr)
  exit(2)
}

let input = URL(fileURLWithPath: CommandLine.arguments[1])
let output = URL(fileURLWithPath: CommandLine.arguments[2])
let asset = AVURLAsset(url: input)
let duration = try await asset.load(.duration)
let seconds = max(0, duration.seconds - 0.08)
let generator = AVAssetImageGenerator(asset: asset)
generator.appliesPreferredTrackTransform = true
generator.requestedTimeToleranceBefore = .zero
generator.requestedTimeToleranceAfter = CMTime(seconds: 0.08, preferredTimescale: 600)
let image = try generator.copyCGImage(at: CMTime(seconds: seconds, preferredTimescale: 600), actualTime: nil)
let bitmap = NSBitmapImageRep(cgImage: image)
guard let data = bitmap.representation(using: .png, properties: [:]) else {
  throw NSError(domain: "frame", code: 1)
}
try data.write(to: output)
print("wrote \(output.path) at \(seconds)s")
