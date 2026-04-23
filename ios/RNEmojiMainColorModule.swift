import CryptoKit
import Foundation
import React
import UIKit

@objc(RNEmojiMainColorModule)
public final class RNEmojiMainColorModule: NSObject {

  private let cacheDirectoryName = "emoji-main-color-react-native"
  private let defaultPaletteSize = 0
  private let defaultRenderSize = 64
  private let maxPaletteSize = 8
  private let minAlpha = 24
  private let minRenderSize = 16
  private let maxRenderSize = 256
  private let minWeight = 0.01
  private let mergeDistance = 42.0

  @objc
  public static func requiresMainQueueSetup() -> Bool {
    false
  }

  @objc(compute:resolver:rejecter:)
  public func compute(
    _ options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      do {
        resolve(try self.computePayload(options: options))
      } catch {
        reject("compute_failed", "Failed to compute emoji color.", error)
      }
    }
  }

  @objc(getCachedResult:resolver:rejecter:)
  public func getCachedResult(
    _ key: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.global(qos: .utility).async {
      do {
        let fileURL = try self.cacheFileURL(for: key)
        guard FileManager.default.fileExists(atPath: fileURL.path) else {
          resolve(nil)
          return
        }

        let data = try Data(contentsOf: fileURL)
        let jsonObject = try JSONSerialization.jsonObject(with: data, options: [])
        resolve(jsonObject)
      } catch {
        reject("disk_cache_read_failed", "Failed to read emoji disk cache.", error)
      }
    }
  }

  @objc(setCachedResult:value:resolver:rejecter:)
  public func setCachedResult(
    _ key: String,
    value: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.global(qos: .utility).async {
      do {
        let fileURL = try self.cacheFileURL(for: key)
        try FileManager.default.createDirectory(
          at: fileURL.deletingLastPathComponent(),
          withIntermediateDirectories: true,
          attributes: nil
        )

        let data = try JSONSerialization.data(withJSONObject: value, options: [])
        try data.write(to: fileURL, options: .atomic)
        resolve(nil)
      } catch {
        reject("disk_cache_write_failed", "Failed to write emoji disk cache.", error)
      }
    }
  }

  private func computePayload(options: NSDictionary) throws -> NSDictionary {
    guard let rawEmoji = options["emoji"] as? String else {
      throw NSError(domain: "RNEmojiMainColorModule", code: 1)
    }

    let emoji = rawEmoji.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !emoji.isEmpty else {
      throw NSError(domain: "RNEmojiMainColorModule", code: 2)
    }

    let renderSize = clamp(
      (options["renderSize"] as? NSNumber)?.intValue ?? defaultRenderSize,
      minimum: minRenderSize,
      maximum: maxRenderSize
    )
    let paletteSize = clamp(
      (options["paletteSize"] as? NSNumber)?.intValue ?? defaultPaletteSize,
      minimum: 0,
      maximum: maxPaletteSize
    )

    let image = renderEmojiImage(emoji, renderSize: renderSize)
    let result = try analyze(image: image, paletteSize: paletteSize)
    let payload = NSMutableDictionary()
    payload["emoji"] = emoji
    payload["mainColor"] = result.mainColor
    if let palette = result.palette {
      payload["palette"] = palette
    }

    return payload
  }

  private func renderEmojiImage(_ emoji: String, renderSize: Int) -> UIImage {
    let size = CGSize(width: renderSize, height: renderSize)
    let format = UIGraphicsImageRendererFormat()
    format.opaque = false
    format.scale = 1

    let renderer = UIGraphicsImageRenderer(size: size, format: format)
    let attributedString = NSAttributedString(
      string: emoji,
      attributes: [
        .font: UIFont.systemFont(ofSize: CGFloat(renderSize) * 0.82),
      ]
    )

    return renderer.image { _ in
      UIColor.clear.setFill()
      UIRectFill(CGRect(origin: .zero, size: size))

      let bounds = attributedString.boundingRect(
        with: size,
        options: [.usesLineFragmentOrigin, .usesFontLeading],
        context: nil
      )

      let drawRect = CGRect(
        x: (size.width - bounds.width) / 2,
        y: (size.height - bounds.height) / 2 - CGFloat(renderSize) * 0.05,
        width: bounds.width,
        height: bounds.height
      ).integral

      attributedString.draw(in: drawRect)
    }
  }

  private func analyze(image: UIImage, paletteSize: Int) throws -> AnalysisResult {
    guard let cgImage = image.cgImage else {
      throw NSError(domain: "RNEmojiMainColorModule", code: 3)
    }

    let width = cgImage.width
    let height = cgImage.height
    let bytesPerRow = width * 4
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    let bitmapInfo =
      CGImageAlphaInfo.premultipliedLast.rawValue |
      CGBitmapInfo.byteOrder32Big.rawValue

    var pixels = [UInt8](repeating: 0, count: width * height * 4)
    guard let context = pixels.withUnsafeMutableBytes({ buffer in
      CGContext(
        data: buffer.baseAddress,
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: bytesPerRow,
        space: colorSpace,
        bitmapInfo: bitmapInfo
      )
    }) else {
      throw NSError(domain: "RNEmojiMainColorModule", code: 4)
    }

    context.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))

    let sampleStep = max(1, width / 24)
    var buckets: [Int: Bucket] = [:]

    var index = 0
    while index < pixels.count {
      let red = Int(pixels[index])
      let green = Int(pixels[index + 1])
      let blue = Int(pixels[index + 2])
      let alpha = Int(pixels[index + 3])

      if alpha >= minAlpha {
        let weight = pixelWeight(red: red, green: green, blue: blue, alpha: alpha)
        if weight > minWeight {
          let key = quantize(red: red, green: green, blue: blue)
          let bucket = buckets[key] ?? Bucket()
          bucket.add(red: red, green: green, blue: blue, weight: weight)
          buckets[key] = bucket
        }
      }

      let pixelOffset = index / 4
      let x = pixelOffset % width
      let pixelAdvance = (x + sampleStep >= width) ? (width - x) : sampleStep
      index += pixelAdvance * 4
    }

    let weightedColors = buckets.values
      .map { $0.toWeightedColor() }
      .sorted { $0.score > $1.score }

    guard !weightedColors.isEmpty else {
      throw NSError(domain: "RNEmojiMainColorModule", code: 5)
    }

    var clusters: [Cluster] = []
    for weightedColor in weightedColors {
      if let cluster = clusters.first(where: { $0.distance(to: weightedColor) <= mergeDistance }) {
        cluster.add(weightedColor)
      } else {
        clusters.append(Cluster(weightedColor))
      }
    }

    let sortedClusters = clusters.sorted { $0.score > $1.score }
    let mainColor = sortedClusters[0].hexString()
    let palette = paletteSize > 0
      ? Array(sortedClusters.prefix(paletteSize).map { $0.hexString() })
      : nil

    return AnalysisResult(mainColor: mainColor, palette: palette)
  }

  private func pixelWeight(red: Int, green: Int, blue: Int, alpha: Int) -> Double {
    let maxChannel = Double(max(red, max(green, blue)))
    let minChannel = Double(min(red, min(green, blue)))
    let brightness = (maxChannel + minChannel) / 510.0
    let saturation = maxChannel == 0 ? 0 : (maxChannel - minChannel) / maxChannel

    var weight = (Double(alpha) / 255.0) * (0.65 + saturation * 0.7)

    if brightness > 0.95 {
      weight *= 0.25
    } else if brightness > 0.88 {
      weight *= 0.55
    }

    if brightness < 0.05 {
      weight *= 0.2
    } else if brightness < 0.12 {
      weight *= 0.45
    }

    return weight
  }

  private func quantize(red: Int, green: Int, blue: Int) -> Int {
    ((red >> 3) << 10) | ((green >> 3) << 5) | (blue >> 3)
  }

  private func clamp(_ value: Int, minimum: Int, maximum: Int) -> Int {
    min(maximum, max(minimum, value))
  }

  private func cacheFileURL(for key: String) throws -> URL {
    guard let baseURL = FileManager.default.urls(
      for: .cachesDirectory,
      in: .userDomainMask
    ).first else {
      throw NSError(domain: "RNEmojiMainColorModule", code: 6)
    }

    let digest = SHA256.hash(data: Data(key.utf8))
      .compactMap { String(format: "%02x", $0) }
      .joined()

    return baseURL
      .appendingPathComponent(cacheDirectoryName, isDirectory: true)
      .appendingPathComponent("\(digest).json", isDirectory: false)
  }
}

private final class Bucket {
  private var redTotal = 0.0
  private var greenTotal = 0.0
  private var blueTotal = 0.0
  private var weightTotal = 0.0
  private var pixelCount = 0

  func add(red: Int, green: Int, blue: Int, weight: Double) {
    redTotal += Double(red) * weight
    greenTotal += Double(green) * weight
    blueTotal += Double(blue) * weight
    weightTotal += weight
    pixelCount += 1
  }

  func toWeightedColor() -> WeightedColor {
    WeightedColor(
      red: redTotal / weightTotal,
      green: greenTotal / weightTotal,
      blue: blueTotal / weightTotal,
      weight: weightTotal,
      pixelCount: pixelCount
    )
  }
}

private struct WeightedColor {
  let red: Double
  let green: Double
  let blue: Double
  let weight: Double
  let pixelCount: Int

  var score: Double {
    weight * (1.0 + min(Double(pixelCount) / 18.0, 0.35))
  }
}

private final class Cluster {
  private var redTotal: Double
  private var greenTotal: Double
  private var blueTotal: Double
  private var weightTotal: Double
  private var pixelTotal: Int

  init(_ initialColor: WeightedColor) {
    redTotal = initialColor.red * initialColor.weight
    greenTotal = initialColor.green * initialColor.weight
    blueTotal = initialColor.blue * initialColor.weight
    weightTotal = initialColor.weight
    pixelTotal = initialColor.pixelCount
  }

  var score: Double {
    weightTotal * (1.0 + min(Double(pixelTotal) / 18.0, 0.35))
  }

  func add(_ color: WeightedColor) {
    redTotal += color.red * color.weight
    greenTotal += color.green * color.weight
    blueTotal += color.blue * color.weight
    weightTotal += color.weight
    pixelTotal += color.pixelCount
  }

  func distance(to color: WeightedColor) -> Double {
    let redDelta = averageRed - color.red
    let greenDelta = averageGreen - color.green
    let blueDelta = averageBlue - color.blue
    return sqrt((redDelta * redDelta) + (greenDelta * greenDelta) + (blueDelta * blueDelta))
  }

  func hexString() -> String {
    String(
      format: "#%02X%02X%02X",
      Int(averageRed.rounded()).clamped(to: 0...255),
      Int(averageGreen.rounded()).clamped(to: 0...255),
      Int(averageBlue.rounded()).clamped(to: 0...255)
    )
  }

  private var averageRed: Double {
    redTotal / weightTotal
  }

  private var averageGreen: Double {
    greenTotal / weightTotal
  }

  private var averageBlue: Double {
    blueTotal / weightTotal
  }
}

private struct AnalysisResult {
  let mainColor: String
  let palette: [String]?
}

private extension Int {
  func clamped(to range: ClosedRange<Int>) -> Int {
    Swift.min(range.upperBound, Swift.max(range.lowerBound, self))
  }
}
