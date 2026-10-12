import Foundation
import Vision
import CoreImage
import AppKit

let args = CommandLine.arguments
let inURL = URL(fileURLWithPath: args[1]); let outURL = URL(fileURLWithPath: args[2])
let ci = CIImage(contentsOf: inURL, options: [.applyOrientationProperty: true])!
let handler = VNImageRequestHandler(ciImage: ci)
let req = VNGenerateForegroundInstanceMaskRequest()
try handler.perform([req])
guard let obs = req.results?.first else { print("no result"); exit(1) }
print("instances:", obs.allInstances.count)
// pick instance(s): write one mask per instance so we can choose
let ctx = CIContext()
for idx in obs.allInstances {
  let buf = try obs.generateScaledMaskForImage(forInstances: IndexSet(integer: idx), from: handler)
  let m = CIImage(cvPixelBuffer: buf)
  let u = outURL.deletingLastPathComponent().appendingPathComponent("mask-\(idx).png")
  try ctx.writePNGRepresentation(of: m, to: u, format: .L8, colorSpace: CGColorSpace(name: CGColorSpace.linearGray)!)
  print("wrote", u.lastPathComponent, m.extent)
}
