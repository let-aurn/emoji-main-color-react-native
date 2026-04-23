package com.emojimaincolorreactnative

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.PorterDuff
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.security.MessageDigest
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sqrt

class RNEmojiMainColorModule(
  reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "RNEmojiMainColorModule"

  @ReactMethod
  fun compute(options: ReadableMap, promise: Promise) {
    try {
      val emoji = options.getString("emoji")?.trim().orEmpty()
      if (emoji.isEmpty()) {
        promise.reject("invalid_emoji", "Expected a non-empty emoji string.")
        return
      }

      val renderSize = clampInt(
        if (options.hasKey("renderSize")) options.getInt("renderSize") else DEFAULT_RENDER_SIZE,
        MIN_RENDER_SIZE,
        MAX_RENDER_SIZE,
      )
      val paletteSize = clampInt(
        if (options.hasKey("paletteSize")) options.getInt("paletteSize") else DEFAULT_PALETTE_SIZE,
        0,
        MAX_PALETTE_SIZE,
      )

      val bitmap = renderEmojiBitmap(emoji, renderSize)
      val analysis = analyzeBitmap(bitmap, paletteSize)
      promise.resolve(analysis.toWritableMap(emoji))
    } catch (error: Throwable) {
      promise.reject("compute_failed", "Failed to compute emoji color.", error)
    }
  }

  @ReactMethod
  fun getCachedResult(key: String, promise: Promise) {
    try {
      val file = cacheFile(key)
      if (!file.exists()) {
        promise.resolve(null)
        return
      }

      val payload = JSONObject(file.readText())
      promise.resolve(jsonToWritableMap(payload))
    } catch (error: Throwable) {
      promise.reject("disk_cache_read_failed", "Failed to read emoji disk cache.", error)
    }
  }

  @ReactMethod
  fun setCachedResult(key: String, value: ReadableMap, promise: Promise) {
    try {
      val payload = JSONObject()
      payload.put("emoji", value.getString("emoji"))
      payload.put("mainColor", value.getString("mainColor"))

      if (value.hasKey("palette")) {
        val palette = value.getArray("palette")
        if (palette != null) {
          payload.put("palette", readableArrayToJsonArray(palette))
        }
      }

      val file = cacheFile(key)
      file.parentFile?.mkdirs()
      file.writeText(payload.toString())
      promise.resolve(null)
    } catch (error: Throwable) {
      promise.reject("disk_cache_write_failed", "Failed to write emoji disk cache.", error)
    }
  }

  private fun renderEmojiBitmap(emoji: String, renderSize: Int): Bitmap {
    val bitmap = Bitmap.createBitmap(renderSize, renderSize, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    canvas.drawColor(Color.TRANSPARENT, PorterDuff.Mode.CLEAR)

    val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.SUBPIXEL_TEXT_FLAG).apply {
      textAlign = Paint.Align.CENTER
      textSize = renderSize * 0.82f
    }
    val baseline = renderSize / 2f - ((paint.descent() + paint.ascent()) / 2f) - renderSize * 0.05f
    canvas.drawText(emoji, renderSize / 2f, baseline, paint)

    return bitmap
  }

  private fun analyzeBitmap(bitmap: Bitmap, paletteSize: Int): AnalysisResult {
    val width = bitmap.width
    val height = bitmap.height
    val pixels = IntArray(width * height)
    bitmap.getPixels(pixels, 0, width, 0, 0, width, height)

    val buckets = linkedMapOf<Int, Bucket>()
    val sampleStep = max(1, width / 24)

    var index = 0
    while (index < pixels.size) {
      val pixel = pixels[index]
      val alpha = Color.alpha(pixel)
      if (alpha >= MIN_ALPHA) {
        val red = Color.red(pixel)
        val green = Color.green(pixel)
        val blue = Color.blue(pixel)
        val weight = pixelWeight(red, green, blue, alpha)

        if (weight > MIN_WEIGHT) {
          val key = quantize(red, green, blue)
          val bucket = buckets.getOrPut(key) { Bucket() }
          bucket.add(red, green, blue, weight)
        }
      }

      val x = index % width
      index += if (x + sampleStep >= width) width - x else sampleStep
    }

    if (buckets.isEmpty()) {
      throw IllegalStateException("Unable to extract a visible color from the emoji.")
    }

    val weightedColors = buckets.values
      .map { it.toWeightedColor() }
      .sortedByDescending { it.score }

    val clusters = mutableListOf<Cluster>()
    for (color in weightedColors) {
      val existingCluster = clusters.firstOrNull { it.distanceTo(color) <= MERGE_DISTANCE }
      if (existingCluster != null) {
        existingCluster.add(color)
      } else {
        clusters.add(Cluster(color))
      }
    }

    val sortedClusters = clusters.sortedByDescending { it.score() }
    val mainColor = sortedClusters.first().hex()
    val palette = if (paletteSize > 0) {
      sortedClusters.take(paletteSize).map { it.hex() }
    } else {
      null
    }

    return AnalysisResult(mainColor, palette)
  }

  private fun pixelWeight(red: Int, green: Int, blue: Int, alpha: Int): Double {
    val maxChannel = max(red, max(green, blue)).toDouble()
    val minChannel = min(red, min(green, blue)).toDouble()
    val brightness = (maxChannel + minChannel) / 510.0
    val saturation = if (maxChannel == 0.0) 0.0 else (maxChannel - minChannel) / maxChannel

    var weight = (alpha / 255.0) * (0.65 + saturation * 0.7)

    if (brightness > 0.95) {
      weight *= 0.25
    } else if (brightness > 0.88) {
      weight *= 0.55
    }

    if (brightness < 0.05) {
      weight *= 0.2
    } else if (brightness < 0.12) {
      weight *= 0.45
    }

    return weight
  }

  private fun quantize(red: Int, green: Int, blue: Int): Int {
    return ((red shr 3) shl 10) or ((green shr 3) shl 5) or (blue shr 3)
  }

  private fun jsonToWritableMap(value: JSONObject): WritableMap {
    val map = Arguments.createMap()
    map.putString("emoji", value.optString("emoji"))
    map.putString("mainColor", value.optString("mainColor"))

    if (value.has("palette")) {
      val jsonArray = value.optJSONArray("palette")
      if (jsonArray != null) {
        val palette = Arguments.createArray()
        for (index in 0 until jsonArray.length()) {
          palette.pushString(jsonArray.optString(index))
        }
        map.putArray("palette", palette)
      }
    }

    return map
  }

  private fun readableArrayToJsonArray(readableArray: ReadableArray): JSONArray {
    val jsonArray = JSONArray()

    for (index in 0 until readableArray.size()) {
      jsonArray.put(readableArray.getString(index))
    }

    return jsonArray
  }

  private fun cacheFile(key: String): File {
    val digest = MessageDigest.getInstance("SHA-256")
      .digest(key.toByteArray(Charsets.UTF_8))
      .joinToString("") { byte -> "%02x".format(byte) }

    return File(File(reactApplicationContext.cacheDir, CACHE_DIRECTORY_NAME), "$digest.json")
  }

  private fun clampInt(value: Int, minimum: Int, maximum: Int): Int {
    return min(maximum, max(minimum, value))
  }

  private data class AnalysisResult(
    val mainColor: String,
    val palette: List<String>?,
  ) {
    fun toWritableMap(emoji: String): WritableMap {
      val map = Arguments.createMap()
      map.putString("emoji", emoji)
      map.putString("mainColor", mainColor)

      if (!palette.isNullOrEmpty()) {
        val array: WritableArray = Arguments.createArray()
        palette.forEach(array::pushString)
        map.putArray("palette", array)
      }

      return map
    }
  }

  private data class WeightedColor(
    val red: Double,
    val green: Double,
    val blue: Double,
    val weight: Double,
    val pixelCount: Int,
  ) {
    val score: Double
      get() = weight * (1.0 + min(pixelCount / 18.0, 0.35))
  }

  private class Bucket {
    private var redTotal = 0.0
    private var greenTotal = 0.0
    private var blueTotal = 0.0
    private var weightTotal = 0.0
    private var pixelCount = 0

    fun add(red: Int, green: Int, blue: Int, weight: Double) {
      redTotal += red * weight
      greenTotal += green * weight
      blueTotal += blue * weight
      weightTotal += weight
      pixelCount += 1
    }

    fun toWeightedColor(): WeightedColor {
      return WeightedColor(
        red = redTotal / weightTotal,
        green = greenTotal / weightTotal,
        blue = blueTotal / weightTotal,
        weight = weightTotal,
        pixelCount = pixelCount,
      )
    }
  }

  private class Cluster(initial: WeightedColor) {
    private var redTotal = initial.red * initial.weight
    private var greenTotal = initial.green * initial.weight
    private var blueTotal = initial.blue * initial.weight
    private var weightTotal = initial.weight
    private var pixelTotal = initial.pixelCount

    fun add(color: WeightedColor) {
      redTotal += color.red * color.weight
      greenTotal += color.green * color.weight
      blueTotal += color.blue * color.weight
      weightTotal += color.weight
      pixelTotal += color.pixelCount
    }

    fun distanceTo(color: WeightedColor): Double {
      val redDelta = averageRed() - color.red
      val greenDelta = averageGreen() - color.green
      val blueDelta = averageBlue() - color.blue
      return sqrt((redDelta * redDelta) + (greenDelta * greenDelta) + (blueDelta * blueDelta))
    }

    fun score(): Double {
      return weightTotal * (1.0 + min(pixelTotal / 18.0, 0.35))
    }

    fun hex(): String {
      val red = averageRed().roundToInt().coerceIn(0, 255)
      val green = averageGreen().roundToInt().coerceIn(0, 255)
      val blue = averageBlue().roundToInt().coerceIn(0, 255)
      return String.format("#%02X%02X%02X", red, green, blue)
    }

    private fun averageRed(): Double = redTotal / weightTotal
    private fun averageGreen(): Double = greenTotal / weightTotal
    private fun averageBlue(): Double = blueTotal / weightTotal
  }

  companion object {
    private const val CACHE_DIRECTORY_NAME = "emoji-main-color-react-native"
    private const val DEFAULT_PALETTE_SIZE = 0
    private const val DEFAULT_RENDER_SIZE = 64
    private const val MAX_PALETTE_SIZE = 8
    private const val MIN_ALPHA = 24
    private const val MIN_RENDER_SIZE = 16
    private const val MAX_RENDER_SIZE = 256
    private const val MIN_WEIGHT = 0.01
    private const val MERGE_DISTANCE = 42.0
  }
}
