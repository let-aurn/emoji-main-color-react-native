#import "EmojiMainColorModule.h"
#import <UIKit/UIKit.h>

@implementation EmojiMainColorModule

RCT_EXPORT_MODULE();

RCT_REMAP_METHOD(renderEmojiToPixels,
                 renderEmojiToPixels:(NSString *)emoji
                 renderSize:(nonnull NSNumber *)renderSize
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  @try {
    CGFloat size = [renderSize floatValue];
    UIFont *font = [UIFont systemFontOfSize:size * 0.84];
    UIGraphicsBeginImageContextWithOptions(CGSizeMake(size, size), NO, 1.0);
    [emoji drawInRect:CGRectMake(0, 0, size, size) withAttributes:@{NSFontAttributeName: font}];
    UIImage *image = UIGraphicsGetImageFromCurrentImageContext();
    UIGraphicsEndImageContext();

    CGImageRef cgImage = image.CGImage;
    NSUInteger width = CGImageGetWidth(cgImage);
    NSUInteger height = CGImageGetHeight(cgImage);
    NSUInteger bytesPerPixel = 4;
    NSUInteger bytesPerRow = bytesPerPixel * width;
    NSUInteger bitsPerComponent = 8;

    unsigned char *rawData = (unsigned char *)calloc(height * width * bytesPerPixel, sizeof(unsigned char));
    CGColorSpaceRef colorSpace = CGColorSpaceCreateDeviceRGB();
    CGContextRef context = CGBitmapContextCreate(rawData, width, height, bitsPerComponent, bytesPerRow, colorSpace,
                                                 kCGImageAlphaPremultipliedLast | kCGBitmapByteOrder32Big);
    CGContextDrawImage(context, CGRectMake(0, 0, width, height), cgImage);

    NSMutableArray *rgba = [NSMutableArray arrayWithCapacity:width * height * 4];
    for (NSUInteger i = 0; i < width * height * 4; i++) {
      [rgba addObject:@(rawData[i])];
    }

    CGContextRelease(context);
    CGColorSpaceRelease(colorSpace);
    free(rawData);

    resolve(@{
      @"width": @(width),
      @"height": @(height),
      @"rgba": rgba
    });
  } @catch (NSException *exception) {
    reject(@"emoji_render_error", exception.reason, nil);
  }
}

RCT_REMAP_METHOD(getDiskCache,
                 getDiskCache:(NSString *)key
                 getResolver:(RCTPromiseResolveBlock)resolve
                 getRejecter:(RCTPromiseRejectBlock)reject)
{
  @try {
    NSString *value = [[NSUserDefaults standardUserDefaults] stringForKey:key];
    resolve(value ?: [NSNull null]);
  } @catch (NSException *exception) {
    reject(@"disk_cache_get_error", exception.reason, nil);
  }
}

RCT_REMAP_METHOD(setDiskCache,
                 setDiskCache:(NSString *)key
                 value:(NSString *)value
                 setResolver:(RCTPromiseResolveBlock)resolve
                 setRejecter:(RCTPromiseRejectBlock)reject)
{
  @try {
    [[NSUserDefaults standardUserDefaults] setObject:value forKey:key];
    [[NSUserDefaults standardUserDefaults] synchronize];
    resolve(nil);
  } @catch (NSException *exception) {
    reject(@"disk_cache_set_error", exception.reason, nil);
  }
}

@end
