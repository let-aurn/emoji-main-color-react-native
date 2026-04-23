#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(RNEmojiMainColorModule, NSObject)

RCT_EXTERN_METHOD(compute:(NSDictionary *)options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getCachedResult:(NSString *)key
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(setCachedResult:(NSString *)key
                  value:(NSDictionary *)value
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
