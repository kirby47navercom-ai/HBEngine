#include <jni.h>
#include <string>
#include <stdexcept>
#include "Modules.hpp"

static std::string bytes(JNIEnv* env,jbyteArray value){
    if(!value)throw std::runtime_error("missing native payload");const auto length=env->GetArrayLength(value);
    if(length>8388608)throw std::runtime_error("native payload limit");std::string result(length,'\0');env->GetByteArrayRegion(value,0,length,reinterpret_cast<jbyte*>(result.data()));return result;
}
static jbyteArray array(JNIEnv* env,const std::string& value){auto result=env->NewByteArray(value.size());if(!result)throw std::runtime_error("native allocation failed");env->SetByteArrayRegion(result,0,value.size(),reinterpret_cast<const jbyte*>(value.data()));return result;}
extern "C" JNIEXPORT jbyteArray JNICALL Java_com_hbengine_player_HBActivity_nativeInvoke(JNIEnv* env,jobject activity,jint index,jbyteArray payload){
    try{
        auto cls=env->GetObjectClass(activity);auto method=env->GetMethodID(cls,"query","([B)[B");env->DeleteLocalRef(cls);if(!method)throw std::runtime_error("missing query bridge");
        const auto query=[&](const std::string& packet){auto input=array(env,packet);auto output=static_cast<jbyteArray>(env->CallObjectMethod(activity,method,input));env->DeleteLocalRef(input);if(env->ExceptionCheck()){env->ExceptionClear();throw std::runtime_error("mobile engine query failed");}auto result=bytes(env,output);env->DeleteLocalRef(output);return result;};
        return array(env,HB_mobileInvoke(index,bytes(env,payload),query));
    }catch(const std::exception& e){auto cls=env->FindClass("java/lang/RuntimeException");env->ThrowNew(cls,e.what());env->DeleteLocalRef(cls);return nullptr;}
}
