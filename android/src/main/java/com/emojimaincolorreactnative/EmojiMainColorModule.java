package com.emojimaincolorreactnative;

import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Typeface;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

public class EmojiMainColorModule extends ReactContextBaseJavaModule {
  private static final String MODULE_NAME = "EmojiMainColorModule";
  private static final String PREF_NAME = "emoji_main_color_cache";

  EmojiMainColorModule(ReactApplicationContext context) {
    super(context);
  }

  @NonNull
  @Override
  public String getName() {
    return MODULE_NAME;
  }

  @ReactMethod
  public void renderEmojiToPixels(String emoji, int renderSize, Promise promise) {
    try {
      int size = Math.max(24, renderSize);
      Bitmap bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
      Canvas canvas = new Canvas(bitmap);
      Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
      paint.setTextSize(size * 0.84f);
      paint.setTypeface(Typeface.DEFAULT);

      float baseline = size * 0.80f;
      canvas.drawText(emoji, 0, baseline, paint);

      int[] pixels = new int[size * size];
      bitmap.getPixels(pixels, 0, size, 0, 0, size, size);

      WritableArray rgba = Arguments.createArray();
      for (int pixel : pixels) {
        rgba.pushInt((pixel >> 16) & 0xFF);
        rgba.pushInt((pixel >> 8) & 0xFF);
        rgba.pushInt(pixel & 0xFF);
        rgba.pushInt((pixel >> 24) & 0xFF);
      }

      WritableMap result = Arguments.createMap();
      result.putInt("width", size);
      result.putInt("height", size);
      result.putArray("rgba", rgba);
      promise.resolve(result);
    } catch (Exception e) {
      promise.reject("emoji_render_error", e);
    }
  }

  @ReactMethod
  public void getDiskCache(String key, Promise promise) {
    try {
      SharedPreferences prefs = getReactApplicationContext().getSharedPreferences(PREF_NAME, 0);
      String value = prefs.getString(key, null);
      promise.resolve(value);
    } catch (Exception e) {
      promise.reject("disk_cache_get_error", e);
    }
  }

  @ReactMethod
  public void setDiskCache(String key, String value, Promise promise) {
    try {
      SharedPreferences prefs = getReactApplicationContext().getSharedPreferences(PREF_NAME, 0);
      prefs.edit().putString(key, value).apply();
      promise.resolve(null);
    } catch (Exception e) {
      promise.reject("disk_cache_set_error", e);
    }
  }
}
